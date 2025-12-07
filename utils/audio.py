"""
Dia TTS audio generation module.

This module provides high-quality audio generation using the Dia model from Nari Labs.
It's used as an alternative to Kokoro TTS when more natural, dialogue-style speech is needed.
"""

import soundfile as sf
from pathlib import Path
from typing import Optional

# Lazy load Dia model to avoid startup cost
_model = None


def _get_model():
    """Lazy load the Dia model."""
    global _model
    if _model is None:
        from dia.model import Dia
        _model = Dia.from_pretrained("nari-labs/Dia-1.6B")
    return _model


def generate_audio(
    text: str,
    output_path: str | Path,
    sample_rate: int = 44100,
    normalize: bool = True,
) -> Path:
    """
    Generate audio from text using Dia model.
    
    Args:
        text: The text to convert to speech
        output_path: Path to save the audio file
        sample_rate: Audio sample rate (default 44100)
        normalize: Whether to normalize audio levels (default True)
    
    Returns:
        Path to the generated audio file
    """
    output_path = Path(output_path)
    model = _get_model()
    
    # Generate audio
    audio_data = model.generate(text)
    
    # Apply normalization if requested
    if normalize:
        try:
            from pydub import AudioSegment
            from pydub.effects import normalize as normalize_audio
            import io
            import numpy as np
            
            # Convert to pydub AudioSegment
            audio_bytes = io.BytesIO()
            sf.write(audio_bytes, audio_data, sample_rate, format='WAV')
            audio_bytes.seek(0)
            audio_seg = AudioSegment.from_wav(audio_bytes)
            
            # Normalize
            audio_seg = normalize_audio(audio_seg)
            
            # Export to final output
            audio_seg.export(str(output_path), format=output_path.suffix[1:])
        except ImportError:
            # Fallback to direct save without normalization
            sf.write(str(output_path), audio_data, sample_rate)
    else:
        sf.write(str(output_path), audio_data, sample_rate)
    
    return output_path


def generate_with_emotion(
    text: str,
    output_path: str | Path,
    emotion: str = "neutral",
    speaking_rate: float = 1.0,
) -> Path:
    """
    Generate audio with emotional context.
    
    Note: Dia model uses text markers for emotion. Add markers to text for emotional delivery.
    Example: "[laughs] That was so funny! [sighs]"
    
    Args:
        text: The text to convert to speech (can include emotion markers)
        output_path: Path to save the audio file
        emotion: Emotional context (used for future compatibility)
        speaking_rate: Speed multiplier (used for future compatibility)
    
    Returns:
        Path to the generated audio file
    """
    # Dia uses text markers rather than separate parameters
    # Add markers based on emotion if not already present
    if emotion == "happy" and "[laughs]" not in text.lower():
        text = text.replace(".", "! ")
    elif emotion == "sad" and "[sighs]" not in text.lower():
        text = f"[sighs] {text}"
    
    return generate_audio(text, output_path)


if __name__ == "__main__":
    # Demo usage
    demo_text = """
    Dia is an open weights text to dialogue model.
    You get full control over scripts and voices.
    [laughs] Wow. Amazing!
    Try it now on GitHub or Hugging Face.
    """
    
    output = generate_audio(demo_text, "demo_output.mp3")
    print(f"Audio saved to: {output}")
