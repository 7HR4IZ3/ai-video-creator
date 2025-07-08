# TTS (Text-to-Speech) Improvements Documentation

## Overview

This document outlines the comprehensive improvements made to the text-to-speech system, including AI story processing and Kokoro TTS audio generation parameters for optimal voice synthesis quality.

## AI Story Processing Improvements

### Enhanced Prompt Engineering

The AI story analysis prompt has been completely redesigned to optimize content for text-to-speech output:

#### Key Improvements:

1. **Voice-First Approach**: Prompt now focuses on creating content specifically for audio consumption
2. **Natural Speech Patterns**: Emphasizes conversational language and natural speech flow
3. **TTS-Optimized Formatting**: Removes complex punctuation that doesn't translate well to speech
4. **Emotional Context**: Adds descriptive words that help with voice inflection
5. **Storytelling Elements**: Incorporates natural audio storytelling techniques

#### Prompt Features:

- **Sentence Structure**: Breaks complex sentences into digestible phrases
- **Transitional Phrases**: Adds audio-friendly transitions ("So here's what happened", "But wait")
- **Number Conversion**: Converts all abbreviations and numbers to full words
- **Breathing Points**: Creates natural pauses for better pacing
- **Direct Address**: Uses "I" statements for listener intimacy

#### Technical Parameters:

```typescript
temperature: 0.6,    // Slightly more focused output
maxTokens: 2500,     // Increased for longer, detailed stories
```

### Content Requirements

- Family-friendly and platform-appropriate content
- 2-3 minute narration length optimization
- Smooth audio-only consumption experience
- Maintains original story structure while enhancing flow

## Kokoro TTS Parameter Optimization

### Enhanced Voice Configuration

#### Improved Default Parameters:

```python
voice: "af_sarah"           # Female voice with clear pronunciation
speed: 0.9                  # Slightly slower for better comprehension
pitch: 1.0                  # Natural pitch
emotion: "neutral"          # Consistent emotional tone
pause_factor: 1.2           # Natural breathing pauses
```

#### Audio Quality Settings:

```python
lang_code: "a"              # English language
device: "cpu"               # Consistent processing
half_precision: False       # Full precision for quality
sample_rate: 24000          # Kokoro default SR
channels: 1                 # Mono audio
```

### Text Preprocessing

#### Automatic Text Cleaning:

```python
processed_text = text.replace("...", ". ")     # Convert ellipsis to pauses
processed_text = processed_text.replace("—", ", ")  # Convert em-dashes
processed_text = processed_text.replace("–", ", ")  # Convert en-dashes
```

#### Sentence Boundary Detection:

```python
split_pattern: r"[.!?]\s+"  # Split on sentence boundaries for better pacing
```

### Command Line Interface

#### New Audio Generation Options:

```bash
python utils/main.py audio "your text" \
  --voice af_sarah \
  --speed 0.9 \
  --pitch 1.0 \
  --emotion neutral \
  --pause-factor 1.2 \
  --output output.mp3
```

#### TypeScript Integration:

```typescript
const scriptArgs = [
  "utils/main.py", "audio",
  "--voice", "af_sarah",
  "--speed", "0.9",
  "--pitch", "1.0", 
  "--emotion", "neutral",
  "--pause-factor", "1.2",
  "-o", outputPath,
  text
];
```

## Voice Selection Guide

### Recommended Voices by Content Type:

1. **af_sarah** (Default): Clear female voice, good for storytelling
2. **am_adam**: Male voice alternative for variety
3. **af_nicole**: Warmer female tone for emotional content
4. **am_michael**: Professional male voice for serious topics

### Voice Characteristics:

- **af_sarah**: Clear articulation, natural pacing, storytelling-friendly
- **am_adam**: Deep, authoritative, good for dramatic content
- **af_nicole**: Warm, empathetic, suitable for personal stories
- **am_michael**: Professional, clear, good for informational content

## Speed and Timing Optimization

### Speed Guidelines:

- **0.8**: Slow, deliberate pace for complex topics
- **0.9**: Default recommendation for storytelling
- **1.0**: Normal conversational speed
- **1.1**: Slightly faster for energetic content
- **1.2**: Fast pace for exciting narratives

### Pause Factor Settings:

- **1.0**: Minimal pauses, continuous flow
- **1.2**: Natural breathing pauses (recommended)
- **1.5**: Dramatic pauses for emphasis
- **2.0**: Slow, contemplative pacing

## Audio Quality Best Practices

### File Format Optimization:

```python
format: "mp3"               # Universal compatibility
bitrate: "128k"             # Balance quality/file size
sample_rate: 24000          # Kokoro native rate
channels: 1                 # Mono for voice content
```

### Processing Pipeline:

1. **Text Analysis**: AI processes and optimizes story content
2. **Text Preprocessing**: Clean punctuation and formatting
3. **Voice Synthesis**: Kokoro generates audio with optimized parameters
4. **Post-processing**: Optional normalization and compression

## Performance Considerations

### Memory Management:

- CPU processing for consistency across systems
- Full precision maintains audio quality
- Sentence-level chunking prevents memory overflow
- Streaming output for large texts

### Processing Time:

- Typical processing: 2-3x real-time
- Longer texts: Process in chunks for progress feedback
- Caching: Generated audio stored for reuse

## Error Handling and Fallbacks

### Robust Error Management:

```python
try:
    # Primary Kokoro generation
    pipeline = KPipeline(optimized_config)
    generate_audio()
except Exception as e:
    # Fallback to basic parameters
    fallback_generation()
    log_error(e)
```

### Fallback Strategies:

1. **Parameter Fallback**: Revert to basic settings if advanced features fail
2. **Voice Fallback**: Switch to default voice if specified voice unavailable
3. **Quality Fallback**: Reduce quality settings if processing fails

## Testing and Validation

### Quality Metrics:

- **Clarity**: Word intelligibility and pronunciation accuracy
- **Naturalness**: Human-like speech patterns and flow
- **Consistency**: Uniform voice characteristics throughout
- **Timing**: Appropriate pacing and pause placement

### Test Cases:

```bash
# Test with different content types
node test-screenshot.js  # Uses real Reddit stories
python utils/main.py audio "test text" -o test.mp3

# Test voice variations
python utils/main.py audio "test" --voice af_sarah -o test1.mp3
python utils/main.py audio "test" --voice am_adam -o test2.mp3
```

## Future Enhancements

### Planned Improvements:

1. **Dynamic Voice Selection**: Auto-select voice based on content type
2. **Emotion Detection**: Automatically adjust emotion based on story content
3. **Advanced Preprocessing**: Better text normalization and cleanup
4. **Quality Analytics**: Automated audio quality assessment
5. **Voice Cloning**: Custom voice training for brand consistency

### Integration Opportunities:

- **Real-time Processing**: Stream audio generation during video creation
- **Batch Processing**: Generate multiple stories simultaneously
- **Cloud Processing**: Offload heavy TTS processing to cloud services
- **Mobile Optimization**: Lightweight processing for mobile deployment

## Configuration Files

### Environment Variables:

```bash
# Audio generation settings
AUDIO_GENERATOR=local
KOKORO_VOICE=af_sarah
KOKORO_SPEED=0.9
KOKORO_EMOTION=neutral

# AI processing settings
OPENROUTER_MODEL=gpt-4o-mini
OPENROUTER_API_KEY=your_key_here
```

### Default Configuration:

```json
{
  "tts": {
    "voice": "af_sarah",
    "speed": 0.9,
    "pitch": 1.0,
    "emotion": "neutral",
    "pause_factor": 1.2
  },
  "ai": {
    "temperature": 0.6,
    "max_tokens": 2500,
    "model": "gpt-4o-mini"
  }
}
```

This comprehensive TTS improvement system provides high-quality, natural-sounding audio generation optimized for social media content creation.