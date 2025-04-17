import click
import moviepy
import datetime
import soundfile

from sys import argv
from pathlib import Path
from random import randint
from kokoro import KPipeline
from faster_whisper import WhisperModel, BatchedInferencePipeline

BASE_DIR = Path(__file__).parent.parent


def float_srt(float_timestamp):
    dt = datetime.datetime.fromtimestamp(float_timestamp)
    dt = dt.replace(hour=dt.hour - 16)
    return dt.strftime("%H:%M:%S,%f")[:-3]


def get_crop_coordinates(video_width, video_height):
    """
    Calculates crop coordinates for converting a 16:9 video to a 9:16 video.
    It crops off the left and right parts while retaining the full vertical resolution.

    Parameters:
        video_width (float or int): The original video width.
        video_height (float or int): The original video height.

    Returns:
        dict: A dictionary containing:
              - x1: The left x-coordinate of the crop.
              - y1: The top y-coordinate (always 0).
              - x2: The right x-coordinate of the crop.
              - y2: The bottom y-coordinate (equal to video_height).
              - crop_width: The width of the cropped area.
              - crop_height: The height of the cropped area.
    """
    # Calculate the required crop width for a 9:16 aspect ratio using the full height.
    crop_width = video_height * (9 / 16)

    # Center the crop horizontally by calculating x1 and x2.
    x1 = (video_width - crop_width) / 2
    x2 = x1 + crop_width

    # Use the full height.
    y1 = 0
    y2 = video_height

    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "w": crop_width, "h": video_height}


@click.group()
def cli():
    click.echo(cli.help)


@cli.command()
@click.argument("text")
@click.option("-s", "--speed", default=1, type=int, help="speech speed")
@click.option("-v", "--voice", default="am_fenrir", help="ai voice to use")
@click.option(
    "-o", "--output", default="output.wav", help="audio output file", type=Path
)
def audio(
    text: str, output: Path = "output.wav", voice: str = "am_fenrir", speed: int = 1
):
    """Convert TEXT to audio and save in OUTPUT

    TEXT is the name of the file to check.

    OUTPUT is the output path to save the audio.
    """

    pipeline = KPipeline(lang_code="a")

    with soundfile.SoundFile(output.as_posix(), "w", 32000, 1) as out:
        for _, _, audio in pipeline(text, voice=voice, speed=speed, split_pattern=r"\n"):
            out.write(audio)


@cli.command()
@click.option("-a", "--audio", help="audio input file", type=Path)
@click.option("-v", "--video", help="video input file", type=Path)
@click.option("-s", "--subtitle", help="subtitle path", type=Path)
@click.option("-o", "--output", help="output file path", type=Path)
@click.option("-f", "--format", default="tiktok", help="video format")
@click.option(
    "--font", default=BASE_DIR / "utils" / "font.ttf", type=Path, help="font path"
)
def editor(
    audio: Path,
    video: Path,
    subtitle: Path,
    output: Path,
    format: str = "tiktok",
    font: Path = BASE_DIR / "utils" / "font.ttf",
):
    """
    Edit VIDEO with AUDIO and SUBTITLE to OUTPUT
    """

    batched_model = BatchedInferencePipeline(
        WhisperModel("tiny", device="cpu", compute_type="int8")
    )

    audio_clip = moviepy.AudioFileClip(audio.as_posix())
    video_clip = moviepy.VideoFileClip(video.as_posix())

    random_start = randint(0, int(video_clip.duration) - int(audio_clip.duration))
    video_clip = (
        video_clip.subclipped(random_start)
        .with_duration(audio_clip.duration)
        .with_audio(audio_clip)
    )

    subtitle_texts = []

    subtitles, _ = batched_model.transcribe(
        audio.as_posix(), batch_size=10, word_timestamps=True
    )

    # with open(subtitle.as_posix(), "a") as _:
    # index = 0

    for sub in subtitles:
        for word in sub.words:
            # sub_file.write(
            #     f"{index}\n{float_srt(word.start)} --> {float_srt(word.end)}\n{word.word}\n\n"
            # )
            # index = index + 1

            txt_clip = moviepy.TextClip(
                font=font.as_posix(),
                size=(
                    int((video_clip.h * (9 / 16)) * 0.8),
                    int(video_clip.h * 0.15),
                ),
                text=word.word,
                font_size=22,
                color="white",
                method="caption",
                stroke_color="black",
            )
            txt_clip = (
                txt_clip.with_position("center")
                .with_start(word.start)
                .with_end(word.end)
                # .with_duration(word.end - word.start)
            )
            subtitle_texts.append(txt_clip)

    video_clip = moviepy.CompositeVideoClip([video_clip, *subtitle_texts])

    if format == "tiktok":
        crop = get_crop_coordinates(video_clip.w, video_clip.h)
        video_clip.cropped(
            x1=crop["x1"],
            x2=crop["x2"],
            y1=crop["y1"],
            y2=crop["y2"],
            width=crop["w"],
            height=crop["h"],
        ).resized((720, 1280)).write_videofile(output.as_posix())
    else:
        video_clip.write_videofile("result.mp4")


@cli.command()
def clear():
    scripts_path = BASE_DIR / "media" / "scripts"
    audio_path = BASE_DIR / "media" / "audios"

    scripts = [x for x in scripts_path.iterdir()]
    audios = [x.name.split(".")[0] for x in audio_path.iterdir()]

    for item in scripts:
        if item.name.split(".")[0] not in audios:
            item.unlink()


if __name__ == "__main__":
    cli()
