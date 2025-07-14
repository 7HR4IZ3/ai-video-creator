
import os
from scipy.io.wavfile import write as write_wav
import numpy as np
import torch
import soundfile as sf

# --- Bark ---
def generate_bark_tts(text_prompt, output_filename="bark_generation.wav"):
    from bark import SAMPLE_RATE, generate_audio, preload_models
    print("Loading Bark models...")
    preload_models(text_use_small=True, coarse_use_small=True, fine_use_small=True, codec_use_small=True)
    print("Generating Bark audio...")
    audio_array = generate_audio(text_prompt)
    print(f"Saving Bark audio to {output_filename}...")
    write_wav(output_filename, SAMPLE_RATE, audio_array)
    print("Bark audio saved.")

# --- pyttsx3 ---
def generate_pyttsx3_tts(text_prompt, output_filename="pyttsx3_generation.wav"):
    import pyttsx3
    print("Initializing pyttsx3...")
    engine = pyttsx3.init()
    print("Generating pyttsx3 audio...")
    engine.save_to_file(text_prompt, output_filename)
    engine.runAndWait()
    print(f"pyttsx3 audio saved to {output_filename}.")

# --- SpeechT5 (Hugging Face) ---
def generate_speecht5_tts(text_prompt, output_filename="speecht5_generation.wav"):
    from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
    from datasets import load_dataset
    import torch

    print("Initializing SpeechT5 models...")
    processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
    model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts")
    vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")

    print("Generating SpeechT5 audio...")
    inputs = processor(text=text_prompt, return_tensors="pt")

    # load speaker embeddings
    embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
    speaker_embeddings = torch.tensor(embeddings_dataset[7306]["xvector"]).unsqueeze(0)

    speech = model.generate_speech(inputs["input_ids"], speaker_embeddings, vocoder=vocoder)

    print(f"Saving SpeechT5 audio to {output_filename}...")
    sf.write(output_filename, speech.numpy(), samplerate=16000)
    print("SpeechT5 audio saved.")

# --- Dia (Nari Labs) ---
def generate_dia_tts(text_prompt, output_filename="dia_generation.wav"):
    from dia.modeling_dia import Dia
    from dia.utils import set_seed

    print("Initializing Dia model...")
    model =  Dia.from_pretrained("nari-labs/Dia-1.6B")
    set_seed(42)

    print("Generating Dia audio...")
    # Note: This is a simplified example. Dia has more advanced features for dialogue generation.
    # You may need to adjust parameters for optimal results.
    output = model.generate(text_prompt, num_beams=1, max_length=1024, no_repeat_ngram_size=2)
    audio = output["audio"][0].cpu().numpy().astype(np.float32)

    print(f"Saving Dia audio to {output_filename}...")
    sf.write(output_filename, audio, samplerate=24000)
    print("Dia audio saved.")

if __name__ == "__main__":
    text_prompt = "Hello, my name is Suno. And, uh — and I like pizza. [laughs] But I also have other interests such as playing tic tac toe."

    # Create output directory if it doesn't exist
    output_dir = "tts_outputs"
    os.makedirs(output_dir, exist_ok=True)

    # Generate audio from all models
    generate_bark_tts(text_prompt, os.path.join(output_dir, "bark_generation.wav"))
    generate_pyttsx3_tts(text_prompt, os.path.join(output_dir, "pyttsx3_generation.wav"))
    generate_speecht5_tts(text_prompt, os.path.join(output_dir, "speecht5_generation.wav"))
    generate_dia_tts(text_prompt, os.path.join(output_dir, "dia_generation.wav"))

    print("All TTS generation complete.")
