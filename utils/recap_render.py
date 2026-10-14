"""Render a measured episode timeline with muted source footage and aligned captions."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
from story_render import align_audio, validate_alignment, caption_phrases, ass_time, ass_text, probe, run


def ffmpeg_binary():
    binary = os.getenv('FFMPEG_BIN', 'ffmpeg')
    if 'subtitles' not in run([binary, '-hide_banner', '-filters']) and not os.getenv('FFMPEG_BIN'):
        for candidate in ['/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg', '/usr/local/opt/ffmpeg-full/bin/ffmpeg']:
            if Path(candidate).is_file():
                binary = candidate
                break
    if 'subtitles' not in run([binary, '-hide_banner', '-filters']):
        raise ValueError('FFmpeg with libass/subtitles is required')
    return binary


def validate(timeline):
    if timeline.get('version') != 'episode-recap-v1' or not timeline.get('segments') or not timeline.get('beats'):
        raise ValueError('Invalid recap timeline')
    source_duration = float(probe(timeline['video'])['format']['duration'])
    cursor = 0
    for segment in timeline['segments']:
        start, end, a, b = [segment[k] for k in ['outputStart', 'outputEnd', 'sourceStart', 'sourceEnd']]
        if not all(math.isfinite(x) for x in [start, end, a, b]) or abs(cursor-start) > .04 or end <= start or a < 0 or b > source_duration+.04 or abs(end-start-(b-a)) > .04:
            raise ValueError('Invalid source range, speed, or output gap')
        cursor = end
    if abs(cursor-timeline['duration']) > .04 or abs(sum(b['duration'] for b in timeline['beats'])-cursor) > .1:
        raise ValueError('Audio and video duration mismatch')


def captions_ass(phrases, width, height):
    size = round(height * .047)
    header = f'''[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,{size},&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,3,1,2,60,60,{round(height*.09)},1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    return header + '\n'.join(f"Dialogue: 0,{ass_time(p['start'])},{ass_time(p['end'])},Caption,,0,0,0,,{ass_text(p['text'])}" for p in phrases) + '\n'


def render(timeline, output, width=1920, height=1080):
    validate(timeline)
    ffmpeg = ffmpeg_binary()
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    phrases, alignments, cursor = [], [], 0.0
    with tempfile.TemporaryDirectory(prefix='episode-recap-') as directory:
        temp = Path(directory)
        audio_parts = []
        for index, beat in enumerate(timeline['beats']):
            file = Path(beat['file']).resolve()
            actual = float(probe(file)['format']['duration'])
            if abs(actual-beat['duration']) > .08:
                raise ValueError('Audio changed after timeline fitting')
            digest = hashlib.sha256(file.read_bytes()).hexdigest()
            cache = file.with_suffix('.alignment.json')
            alignment = json.loads(cache.read_text()) if cache.is_file() else None
            if not alignment or alignment.get('audioSha256') != digest or alignment.get('text') != beat['text'] or alignment.get('version') != 'story-render-v1':
                alignment = align_audio(file, beat['text'], digest)
                cache.write_text(json.dumps(alignment, indent=2))
            validate_alignment(alignment['words'], beat['text'], actual)
            for phrase in caption_phrases(alignment['words'], max_chars=48, max_words=8):
                phrases.append({**phrase, 'start': phrase['start']+cursor, 'end': min(actual, phrase['end'])+cursor})
            alignments.append({'beatId': beat['id'], 'outputStart': cursor, **alignment})
            wav = temp / f'a{index}.wav'
            subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(file),'-t',str(actual),'-af',f'apad,atrim=duration={actual}', '-ar','48000','-ac','2',str(wav)],check=True)
            audio_parts.append(wav)
            cursor += beat['duration']
        # File names in concat manifests are generated internally, never supplied by the user.
        (temp/'audio.txt').write_text('\n'.join(f"file '{p.name}'" for p in audio_parts))
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i','audio.txt','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','narration.wav'],cwd=temp,check=True)
        video_parts=[]
        for index, segment in enumerate(timeline['segments']):
            clip=temp/f'v{index}.mp4'
            filters=f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30'
            subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(segment['sourceStart']),'-i',str(Path(timeline['video']).resolve()),'-frames:v',str(max(1,round(segment['outputEnd']*30)-round(segment['outputStart']*30))),'-an','-vf',filters,'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4',str(clip)],check=True)
            video_parts.append(clip)
        (temp/'video.txt').write_text('\n'.join(f"file '{p.name}'" for p in video_parts))
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i','video.txt','-c','copy','picture.mp4'],cwd=temp,check=True)
        (temp/'captions.ass').write_text(captions_ass(phrases,width,height))
        pending=output.with_name(output.stem+'.pending.mp4')
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i','picture.mp4','-i','narration.wav','-map','0:v:0','-map','1:a:0','-vf','subtitles=captions.ass','-t',str(timeline['duration']),'-c:v','libx264','-preset','medium','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(pending)],cwd=temp,check=True)
        info=probe(pending)
        video=next(s for s in info['streams'] if s['codec_type']=='video')
        if abs(float(info['format']['duration'])-timeline['duration'])>.35 or (video['width'],video['height'])!=(width,height) or not any(s['codec_type']=='audio' for s in info['streams']):
            raise ValueError('Final output failed media validation')
        pending.replace(output)
    output.with_suffix('.captions.json').write_text(json.dumps(phrases,indent=2))
    output.with_suffix('.alignment.json').write_text(json.dumps(alignments,indent=2))
    output.with_suffix('.ass').write_text(captions_ass(phrases,width,height))
    print(f'[Recap] Rendered {output}',flush=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--timeline',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--width',type=int,default=1920)
    parser.add_argument('--height',type=int,default=1080)
    args=parser.parse_args()
    if args.width<320 or args.height<180 or args.width%2 or args.height%2:
        raise ValueError('Output dimensions must be positive even values of at least 320x180')
    render(json.loads(args.timeline.read_text()),args.output,args.width,args.height)
