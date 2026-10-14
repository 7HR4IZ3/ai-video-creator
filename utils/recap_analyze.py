"""Extract an episode transcript and shot boundaries before multimodal analysis."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
from story_render import ALIGN_REVISION, probe


def parse_srt(text):
    segments=[]
    def seconds(value):
        h,m,s=value.replace(',', '.').split(':')
        return int(h)*3600+int(m)*60+float(s)
    for block in re.split(r'\n\s*\n', text.replace('\r','').strip()):
        lines=block.splitlines()
        index=next((i for i,line in enumerate(lines) if '-->' in line),None)
        if index is None:
            continue
        match=re.search(r'(\d{2}:\d{2}:\d{2}[,.]\d+)\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d+)',lines[index])
        if not match:
            raise ValueError('Invalid subtitle timing')
        segments.append({'start':seconds(match[1]),'end':seconds(match[2]),'text':re.sub(r'<[^>]+>','',' '.join(lines[index+1:])).strip()})
    if not segments:
        raise ValueError('No SRT cues found; supply an SRT file matching this video')
    return segments


def extract(video, directory, subtitles=None):
    directory=Path(directory)
    directory.mkdir(parents=True,exist_ok=True)
    ffmpeg=os.getenv('FFMPEG_BIN','ffmpeg')
    info=probe(video)
    duration=float(info['format']['duration'])
    origin='supplied-subtitles'
    if subtitles:
        segments=parse_srt(Path(subtitles).read_text())
    else:
        stream=next((s for s in info['streams'] if s['codec_type']=='subtitle' and s.get('codec_name') in ['subrip','ass','ssa','webvtt','mov_text']),None)
        if stream:
            origin='embedded-subtitles'
            result=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-i',str(video),'-map',f"0:{stream['index']}",'-f','srt','-'],check=True,capture_output=True,text=True)
            segments=parse_srt(result.stdout)
        else:
            if not any(s['codec_type']=='audio' for s in info['streams']):
                segments=[]
                origin='no-audio'
            else:
                origin='automatic-transcription'
                import torch
                import stable_whisper
                from huggingface_hub import snapshot_download
                torch.set_num_threads(min(4,os.cpu_count() or 2))
                checkpoint=snapshot_download('Systran/faster-whisper-base.en',revision=ALIGN_REVISION)
                model=stable_whisper.load_faster_whisper(checkpoint,device='cpu',compute_type='int8',cpu_threads=min(4,os.cpu_count() or 2))
                import wave
                import numpy as np
                audio_path=directory/'analysis.wav'
                subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(video),'-vn','-ac','1','-ar','16000',str(audio_path)],check=True)
                with wave.open(str(audio_path),'rb') as audio_file:
                    samples=np.frombuffer(audio_file.readframes(audio_file.getnframes()),dtype='<i2').astype('float32')/32768
                result=model.transcribe(samples,language='en',word_timestamps=False)
                segments=[{'start':s.start,'end':s.end,'text':s.text.strip()} for s in result.segments]
    for s in segments:
        if not 0<=s['start']<s['end']<=duration+.3:
            raise ValueError('Subtitle/transcript range outside source; check episode edition and offset')
    # FFmpeg detects visual cuts, not semantic scenes. Downscaling keeps CPU processing bounded.
    result=subprocess.run([ffmpeg,'-hide_banner','-loglevel','info','-i',str(video),'-an','-vf',"scale=320:-2,select='gt(scene,0.3)',showinfo",'-fps_mode','vfr','-f','null','-'],check=True,capture_output=True,text=True)
    cuts=sorted(set([0.0]+[float(x) for x in re.findall(r'pts_time:([\d.]+)',result.stderr)]+[duration]))
    shots=[{'id':f'shot{i}','start':a,'end':b} for i,(a,b) in enumerate(zip(cuts,cuts[1:])) if b>a]
    transcript={'origin':origin,'language':'en','segments':segments,'warning':'Subtitle/audio synchronization and transcription accuracy require review.'}
    (directory/'transcript.json').write_text(json.dumps(transcript,indent=2))
    (directory/'shots.json').write_text(json.dumps(shots,indent=2))
    print(f'[Recap] {len(segments)} transcript cues, {len(shots)} candidate shots',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--video',required=True,type=Path)
    parser.add_argument('--directory',required=True,type=Path)
    parser.add_argument('--subtitles',type=Path)
    args=parser.parse_args()
    extract(args.video,args.directory,args.subtitles)
