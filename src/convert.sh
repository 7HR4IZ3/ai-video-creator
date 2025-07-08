#!/bin/bash

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: FFmpeg is not installed. Please install it first."
    exit 1
fi

# Check if input file is provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <input_file> <output_file>"
    echo "Example: $0 input.avi output.mp4"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' does not exist."
    exit 1
fi

# Convert video to MP4 with H.264 video codec and AAC audio codec
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1:color=black" \
    -y "$OUTPUT_FILE"

# Check if conversion was successful
if [ $? -eq 0 ]; then
    echo "Conversion successful: '$OUTPUT_FILE' created."
else
    echo "Error: Conversion failed."
    exit 1
fi