import click
import moviepy
import datetime
import soundfile

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
@click.option(
    "-s", "--speed", default=0.9, type=float, help="Speech speed (0.5-2.0).", show_default=True
)
@click.option(
    "-v", "--voice", default="af_sarah", help="AI voice to use.", show_default=True
)
@click.option(
    "--pitch", default=1.1, type=float, help="Speech pitch (0.5-2.0).", show_default=True
)
@click.option(
    "--emotion", default="neutral", help="Voice emotion (neutral, happy, sad, angry).", show_default=True
)
# @click.option(
#     "--pause-factor", default=1.2, type=float, help="Pause length multiplier.", show_default=True
# )
@click.option(
    "-o",
    "--output",
    required=True,
    help="Audio output file path.",
    type=Path,
    show_default=True,
)
@click.option("--verbose", is_flag=True, default=True, help="Enable verbose output.")
@click.option(
    "--use-dia", is_flag=True, default=False, help="Use Dia model for audio generation."
)
def audio(
    text: str,
    output: Path,
    voice: str,
    speed: float,
    pitch: float,
    emotion: str,
    # pause_factor: float,
    verbose: bool,
    use_dia: bool,
):
    """Convert TEXT to audio and save to OUTPUT. Supports Kokoro TTS and Dia."""
    if verbose:
        click.echo(f"Generating audio for text: '{text}...'")
        if use_dia:
            click.echo("Attempting to use Dia model.")
        else:
            click.echo(
                f"Using Kokoro TTS with voice: {voice}, speed: {speed}, pitch: {pitch}, emotion: {emotion}"
            )
        click.echo(f"Output file: {output}")

    try:
        if use_dia:
            try:
                from dia.model import Dia  # Conditional import

                if verbose:
                    click.echo("Loading Dia model...")
                model = Dia.from_pretrained(
                    "nari-labs/Dia-1.6B"
                )  # Or your preferred model
                if verbose:
                    click.echo("Generating audio with Dia...")
                dia_output = model.generate(text)
                # Using 44100 sample rate as in your example.
                soundfile.write(output.as_posix(), dia_output, 44100)
                if verbose:
                    click.echo(f"Successfully saved Dia audio to {output}")
            except ImportError:
                click.echo(
                    "Error: Dia model selected, but 'dia-model' package is not installed.",
                    err=True,
                )
                click.echo(
                    "Please install it by running: pip install dia-model", err=True
                )
                return  # Exit if Dia is required but not available
            except Exception as e:
                click.echo(f"Error during Dia audio generation: {e}", err=True)
                return
        else:
            # Enhanced Kokoro TTS configuration for better audio quality
            pipeline = KPipeline(
                lang_code="a",
                device="cpu",  # Use CPU for consistency
                # half_precision=False,  # Full precision for better quality
            )

            # Pre-process text for better TTS output
            processed_text = text.replace("...", ". ")  # Convert ellipsis to pauses
            processed_text = processed_text.replace("—", ", ")  # Convert em-dashes to commas
            processed_text = processed_text.replace("–", ", ")  # Convert en-dashes to commas

            with soundfile.SoundFile(
                output.as_posix(), "w", 24000, 1
            ) as out:  # Kokoro default SR
                for _, _, audio_chunk in pipeline(
                    processed_text,
                    voice=voice,
                    speed=speed,
                    # pitch=pitch,
                    # emotion=emotion,
                    # split_pattern=r"[.!?]\s+",  # Split on sentence boundaries for better pacing
                    # pause_factor=pause_factor,  # Add natural pauses
                ):
                    out.write(audio_chunk)
            if verbose:
                click.echo(f"Successfully saved Kokoro TTS audio to {output}")
    except Exception as e:
        # General exception for Kokoro or other issues outside Dia-specific block
        click.echo(f"Error generating audio: {e}", err=True)


@cli.command()
@click.option(
    "-a",
    "--audio",
    required=True,
    help="Audio input file path.",
    type=Path,
    show_default=True,
)
@click.option(
    "-v",
    "--video",
    required=True,
    help="Video input file path.",
    type=Path,
    show_default=True,
)
@click.option(
    "-s",
    "--subtitle",
    required=True,
    help="Subtitle file path (.srt or similar).",
    type=Path,
    show_default=True,
)
@click.option(
    "--screenshot",
    help="Screenshot overlay file path (.png).",
    type=Path,
    show_default=True,
)
@click.option(
    "-o",
    "--output",
    required=True,
    help="Output video file path.",
    type=Path,
    show_default=True,
)
@click.option(
    "-f",
    "--format",
    default="tiktok",
    help="Output video format (e.g., tiktok, youtube).",
    show_default=True,
)
@click.option(
    "--font",
    default=BASE_DIR / "utils" / "font.ttf",
    type=Path,
    help="Font file path for subtitles.",
    show_default=True,
)
# --- Editor-specific Whisper options ---
@click.option(
    "--editor_model_size",
    default="tiny",
    help="Whisper model size for editor.",
    show_default=True,
)
@click.option(
    "--editor_device",
    default="cpu",
    help="Device for editor's Whisper model.",
    show_default=True,
)
@click.option(
    "--editor_compute_type",
    default="int8",
    help="Compute type for editor's Whisper model.",
    show_default=True,
)
@click.option(
    "--editor_batch_size",
    default=10,
    type=int,
    help="Batch size for editor transcription.",
    show_default=True,
)
# --- Subtitle Styling Options ---
@click.option(
    "--font_size",
    default=30,
    type=int,
    help="Font size for subtitles.",
    show_default=True,
)
@click.option(
    "--font_color", default="white", help="Font color for subtitles.", show_default=True
)
@click.option(
    "--stroke_color",
    default="black",
    help="Stroke color for subtitle text.",
    show_default=True,
)
@click.option(
    "--stroke_width",
    default=1,
    type=int,
    help="Stroke width for subtitle text.",
    show_default=True,
)
@click.option(
    "--subtitle_position",
    default="center",
    help="Position of subtitles (e.g., center, bottom).",
    show_default=True,
)
# --- Video Output Options ---
@click.option(
    "--video_codec",
    default="libx264",
    help="Video codec for output file.",
    show_default=True,
)
@click.option(
    "--audio_codec",
    default="aac",
    help="Audio codec for output file.",
    show_default=True,
)
@click.option(
    "--video_bitrate",
    default=None,
    help="Video bitrate for output file (e.g., '5000k').",
)
# --- General Options ---
@click.option("--verbose", is_flag=True, default=True, help="Enable verbose output.")
def editor(
    audio: Path,
    video: Path,
    subtitle: Path,  # Still required by signature, but generated internally. Consider removing if path isn't used.
    screenshot: Path | None,
    output: Path,
    format: str,
    font: Path,
    editor_model_size: str,
    editor_device: str,
    editor_compute_type: str,
    editor_batch_size: int,
    font_size: int,
    font_color: str,
    stroke_color: str,
    stroke_width: int,
    subtitle_position: str,
    video_codec: str,
    audio_codec: str,
    video_bitrate: str | None,
    verbose: bool,
):
    """Edit VIDEO by adding AUDIO, generating and overlaying SUBTITLEs, and saving to OUTPUT."""
    if verbose:
        click.echo("Starting video editing process...")
        click.echo(f"  Audio input: {audio}")
        click.echo(f"  Video input: {video}")
        click.echo(
            f"  Subtitle path (for potential output, content generated): {subtitle}"
        )
        click.echo(f"  Screenshot overlay: {screenshot if screenshot else 'None'}")
        click.echo(f"  Output path: {output}")
        click.echo(f"  Format: {format}")
        click.echo(f"  Font: {font}")
        click.echo("  --- Whisper Settings ---")
        click.echo(
            f"  Model Size: {editor_model_size}, Device: {editor_device}, Compute Type: {editor_compute_type}"
        )
        click.echo(f"  Batch Size: {editor_batch_size}")
        click.echo("  --- Subtitle Style ---")
        click.echo(f"  Font Size: {font_size}, Color: {font_color}")
        click.echo(f"  Stroke Color: {stroke_color}, Stroke Width: {stroke_width}")
        click.echo(f"  Position: {subtitle_position}")
        click.echo("  --- Output Settings ---")
        click.echo(f"  Video Codec: {video_codec}, Audio Codec: {audio_codec}")
        click.echo(
            f"  Video Bitrate: {'Default' if video_bitrate is None else video_bitrate}"
        )

    try:
        # Initialize Whisper model for transcription using new options
        if verbose:
            click.echo("Initializing Whisper model...")
        model = WhisperModel(
            editor_model_size, device=editor_device, compute_type=editor_compute_type
        )
        batched_model = BatchedInferencePipeline(model=model)

        if verbose:
            click.echo("Loading audio and video clips...")
        audio_clip = moviepy.AudioFileClip(audio.as_posix())
        video_clip = moviepy.VideoFileClip(video.as_posix())

        # Ensure video duration matches audio duration, starting from a random point
        if video_clip.duration < audio_clip.duration:
            click.echo("Error: Video duration is less than audio duration.", err=True)
            return
        # trunk-ignore(bandit/B311)
        random_start = randint(0, int(video_clip.duration) - int(audio_clip.duration))
        video_clip = (
            video_clip.subclipped(random_start)
            .with_duration(audio_clip.duration)
            .with_audio(audio_clip)
        )
        if verbose:
            click.echo(
                f"Video clipped to {audio_clip.duration:.2f}s starting at {random_start:.2f}s."
            )

        if verbose:
            click.echo(f"Transcribing audio file: {audio}...")
        subtitles_data, info = batched_model.transcribe(
            audio.as_posix(),
            batch_size=editor_batch_size,  # Use new option
            word_timestamps=True,
        )
        if verbose:
            click.echo(
                f"Transcription complete. Language: {info.language} (Prob: {info.language_probability:.2f}), Duration: {info.duration:.2f}s"
            )
            click.echo("Generating subtitle TextClips...")

        if format == "tiktok":
            if verbose:
                click.echo("Formatting for TikTok (9:16 aspect ratio)...")
            crop = get_crop_coordinates(video_clip.w, video_clip.h)
            video_clip = video_clip.cropped(
                x1=crop["x1"],
                y1=crop["y1"],
                x2=crop["x2"],
                y2=crop["y2"],
            ).resized(height=1280)
            video_clip = video_clip.cropped(x_center=video_clip.w / 2, width=720)

        # Load screenshot overlay if provided
        screenshot_clip = None
        if screenshot and screenshot.exists():
            if verbose:
                click.echo(f"Loading screenshot overlay: {screenshot}")
            screenshot_clip = moviepy.ImageClip(screenshot.as_posix())

            # Calculate screenshot dimensions for center positioning
            # Make screenshot 60% of video width, maintain aspect ratio
            screenshot_width = int(video_clip.w * 0.8)
            screenshot_clip = screenshot_clip.resized(width=screenshot_width)

            # Position screenshot in the center of the video
            screenshot_clip = screenshot_clip.with_position("center").with_duration(5)

            if verbose:
                click.echo(f"Screenshot dimensions: {screenshot_clip.w}x{screenshot_clip.h}")

        subtitle_texts = []
        # Optionally write generated subtitles to the specified subtitle file path
        # Consider adding an option like --save_srt to control this explicitly
        # if save_srt:
        #     with open(subtitle.as_posix(), "w") as sub_file:
        #         index = 0
        #         for sub in subtitles_data:
        #              for word in sub.words:
        #                   srt_line = f"{index+1}\n{float_srt(word.start)} --> {float_srt(word.end)}\n{word.word.strip()}\n\n"
        #                   sub_file.write(srt_line)
        #                   index += 1

        for sub in subtitles_data:
            for word in (sub.words or []):
                # Create TextClip for video overlay using new style options
                txt_clip = moviepy.TextClip(
                    font=font.as_posix(),
                    size=(  # Keep dynamic sizing for now, could be made configurable
                        int((video_clip.h * (9 / 16)) * 0.8),
                        int(video_clip.h * 0.15),
                    ),
                    text=word.word.strip(),
                    font_size=font_size,
                    color=font_color,
                    method="caption",
                    stroke_color=stroke_color,
                    stroke_width=stroke_width,
                )

                # Adjust subtitle position based on screenshot presence
                # if screenshot_clip and subtitle_position == "center":
                #     # Position subtitles below the screenshot
                #     subtitle_y = (video_clip.h / 2) + (screenshot_clip.h / 2) + 20
                #     txt_clip = txt_clip.with_position(("center", subtitle_y))
                # else:
                #     txt_clip = txt_clip.with_position(subtitle_position)

                txt_clip = txt_clip.with_position(subtitle_position)

                txt_clip = (
                    txt_clip.with_start(word.start)
                    .with_end(word.end)
                )
                subtitle_texts.append(txt_clip)

        if verbose:
            click.echo(f"Generated {len(subtitle_texts)} subtitle clips.")

        if verbose:
            click.echo("Compositing video and subtitles...")

        # Create composite with screenshot overlay
        clips = [video_clip]
        if screenshot_clip:
            clips.append(screenshot_clip)
        clips.extend(subtitle_texts)

        final_clip = moviepy.CompositeVideoClip(clips)

        if verbose:
            click.echo(f"Writing final video to {output}...")

        # Use new output options
        write_params = {
            "codec": video_codec,
            "audio_codec": audio_codec,
            "threads": 4,  # Consider making configurable
            "logger": ("bar"),  # Show progress bar unless verbose
        }
        if video_bitrate:
            write_params["bitrate"] = video_bitrate

        # Generate thumbnail from screenshot if available
        if screenshot_clip and screenshot and screenshot.exists():
            thumbnail_path = output.with_suffix('.png')
            if verbose:
                click.echo(f"Generating thumbnail: {thumbnail_path}")

            # Create thumbnail clip (first frame with screenshot overlay)
            thumbnail_frame = final_clip.subclipped(0, 0.1)
            thumbnail_frame.save_frame(thumbnail_path.as_posix(), t=0)

            if verbose:
                click.echo(f"Thumbnail saved: {thumbnail_path}")

        final_clip.write_videofile(output.as_posix(), **write_params)

        if verbose:
            click.echo("Video editing complete.")

    except Exception as e:
        click.echo(f"An error occurred during video editing: {e}", err=True)


@cli.command()
@click.argument("audio_path", type=Path)
@click.option(
    "--model_size",
    default="small",
    help="Whisper model size (e.g., tiny, base, small, medium, large).",
    show_default=True,
)
@click.option(
    "--device",
    default="cpu",
    help="Device for computation (e.g., cpu, cuda).",
    show_default=True,
)
@click.option(
    "--compute_type",
    default="int8",
    help="Compute type (e.g., float16, int8).",
    show_default=True,
)
@click.option(
    "--batch_size",
    default=16,
    type=int,
    help="Batch size for inference.",
    show_default=True,
)
@click.option(
    "--chunk_length",
    default=3,
    type=int,
    help="Chunk length for batched inference (seconds).",
    show_default=True,
)
@click.option(
    "--temperature",
    default=0.0,
    type=float,
    help="Temperature for sampling.",
    show_default=True,
)
@click.option(
    "--language",
    default=None,
    type=str,
    help="Language code (e.g., en, es) for transcription. Default is auto-detect.",
    show_default=True,
)
@click.option("--verbose", is_flag=True, default=False, help="Enable verbose output.")
def transcribe(
    audio_path: Path,
    model_size: str,
    device: str,
    compute_type: str,
    batch_size: int,
    chunk_length: int,
    temperature: float,
    language: str | None,
    verbose: bool,
):
    """Transcribe AUDIO_PATH using Faster Whisper."""
    if verbose:
        click.echo("Starting transcription process...")
        click.echo(f"Audio input: {audio_path}")
        click.echo(
            f"Model size: {model_size}, Device: {device}, Compute Type: {compute_type}"
        )
        click.echo(
            f"Batch size: {batch_size}, Chunk length: {chunk_length}, Temperature: {temperature}"
        )
        click.echo(f"Language: {'Auto-detect' if language is None else language}")

    if not audio_path.exists():
        click.echo(f"Error: Audio file not found at {audio_path}", err=True)
        return

    try:
        if verbose:
            click.echo("Initializing Whisper model...")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        batched_model = BatchedInferencePipeline(model=model)

        if verbose:
            click.echo(f"Transcribing {audio_path}...")
        segments, info = batched_model.transcribe(
            audio_path.as_posix(),
            batch_size=batch_size,
            chunk_length=chunk_length,  # Ensure this matches expected unit (seconds)
            temperature=temperature,
            language=language,  # Pass language if specified
        )

        click.echo(
            f"Detected language '{info.language}' with probability {info.language_probability:.2f}"
        )
        click.echo(f"Transcription (duration: {info.duration:.2f}s):")

        for segment in segments:
            click.echo(
                f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text.strip()}"
            )

        if verbose:
            click.echo("Transcription complete.")

    except Exception as e:
        click.echo(f"An error occurred during transcription: {e}", err=True)


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
