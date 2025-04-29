# Import necessary libraries
import os
from pytubefix import YouTube
from pytube.exceptions import PytubeError, VideoUnavailable, RegexMatchError
from pytubefix.cli import on_progress


# --- Configuration ---
# !!! IMPORTANT: Replace this with the actual YouTube video URL you want to download !!!
video_url = "https://www.youtube.com/watch?v=952ILTHDgC4&pp=ygUibWluZWNyYWZ0IGdhbWVwbGF5IHZpZGVvIGNvcHlyaWdodA%3D%3D"

# Define the output directory and filename
output_dir = "media/videos"
output_filename = "minecraft.mp4"
# --------------------


# --- Main Script ---
def download_video(url, path, filename):
    """Downloads a YouTube video to the specified path and filename."""
    full_path = os.path.join(path, filename)
    # Extract just the directory part for os.makedirs
    directory_path = os.path.dirname(full_path)

    try:
        # 1. Ensure the output directory exists
        print(f"Ensuring directory exists: {directory_path}")
        # exist_ok=True prevents errors if the directory already exists
        os.makedirs(directory_path, exist_ok=True)

        # 2. Create YouTube object
        print(f"Connecting to YouTube for URL: {url}")
        yt = YouTube(
            url,
            on_progress_callback=on_progress,
            on_complete_callback=on_complete,
            proxies={
                "http": "user-default_leOyf-country-US:Avengers2k19=oxylabs@dc.oxylabs.io:8001"
            },
            # use_oauth=True, allow_oauth_cache=True
        )  # Add callbacks

        print(f"Successfully connected. Video Title: {yt.title}")
        print(f"Video Length: {yt.length // 60} minutes {yt.length % 60} seconds")
        print(f"Views: {yt.views}")

        # 3. Select the best stream (highest resolution progressive MP4)
        print("Selecting the best progressive stream (MP4)...")
        # Progressive streams have both video and audio
        # Filter for mp4, progressive, order by resolution descending, get the first (highest)
        stream = (
            yt.streams.filter(progressive=True, file_extension="mp4")
              .order_by("resolution").desc().first()
        )

        # Fallback if no progressive mp4 found (rare for popular videos)
        if not stream:
            print(
                "No progressive MP4 stream found. Trying highest resolution overall progressive stream."
            )
            stream = (
                yt.streams.filter(progressive=True)
                .order_by("resolution")
                .desc()
                .first()
            )  # Fallback to any progressive

        if not stream:
            print(
                "Error: Could not find any suitable *progressive* stream (video+audio)."
            )
            # Optional: You could try downloading separate video/audio and merging them using ffmpeg here.
            return  # Exit the function if no stream found

        print(
            f"Selected Stream: Resolution={stream.resolution}, Type={stream.mime_type}, File Size={stream.filesize_mb:.2f} MB"
        )

        # 4. Download the video
        print(f"Starting download to: {full_path}...")
        # Pass directory and filename separately to download method
        stream.download(output_path=directory_path, filename=filename)
        # The on_complete callback will handle the success message now

    # Specific Pytube errors
    except VideoUnavailable:
        print(
            f"Error: The video at {url} is unavailable (private, deleted, region-locked, etc.)."
        )
    except RegexMatchError:
        print(
            f"Error: Could not parse the YouTube URL: {url}. Please check if it's valid."
        )
    except PytubeError as pe:
        print(f"A Pytube specific error occurred: {pe}")
    # General network/OS errors
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        print(f"Error Type: {type(e).__name__}")


def on_complete(stream, file_path):
    """Callback function for download completion."""
    print(
        f"\nDownload complete! Video saved as: {file_path}"
    )  # Newline after progress indicator


# --- Execution ---
if __name__ == "__main__":
    if video_url == "YOUR_YOUTUBE_VIDEO_URL_HERE":
        print(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        )
        print(
            "!!! ERROR: Please replace 'YOUR_YOUTUBE_VIDEO_URL_HERE' in the script     !!!"
        )
        print(
            "!!!        with an actual YouTube video URL before running.               !!!"
        )
        print(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        )
    else:
        download_video(video_url, output_dir, output_filename)
