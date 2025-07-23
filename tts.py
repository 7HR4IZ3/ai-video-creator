
import os
from scipy.io.wavfile import write as write_wav
import numpy as np
import torch
import soundfile as sf

# --- Bark ---
def generate_bark_tts(text_prompt, output_filename="bark_generation.wav"):
    from bark import SAMPLE_RATE, generate_audio, preload_models
    print("Loading Bark models...")
    preload_models(text_use_small=True, coarse_use_small=True, fine_use_small=True)
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

# --- CosyVoice ---
def generate_cosyvoice_tts(text_prompt, output_filename="cosyvoice_generation.wav"):
    from cosyvoice.cli.cosyvoice import CosyVoice
    from cosyvoice.utils.file_utils import load_json

    print("Initializing CosyVoice model...")
    model_dir = 'FunAudioLLM/CosyVoice-300M'
    cosyvoice = CosyVoice(model_dir)

    print("Generating CosyVoice audio...")
    output = cosyvoice.inference_sft(text_prompt, 'en', 'female')

    print(f"Saving CosyVoice audio to {output_filename}...")
    sf.write(output_filename, output['tts_speech'], samplerate=22050)
    print("CosyVoice audio saved.")

def generate_orpheus_tts(text_prompt, output_filename="orpheus_generation.wav"):
    from orpheus_tts import OrpheusModel
    import wave
    import time

    model = OrpheusModel(model_name ="canopylabs/orpheus-tts-0.1-finetune-prod", max_model_len=2048)

    start_time = time.monotonic()
    syn_tokens = model.generate_speech(
       prompt=text_prompt,
       voice="tara",
    )

    with wave.open(output_filename, "wb") as wf:
       wf.setnchannels(1)
       wf.setsampwidth(2)
       wf.setframerate(24000)

       total_frames = 0
       chunk_counter = 0
       for audio_chunk in syn_tokens: # output streaming
          chunk_counter += 1
          frame_count = len(audio_chunk) // (wf.getsampwidth() * wf.getnchannels())
          total_frames += frame_count
          wf.writeframes(audio_chunk)
       duration = total_frames / wf.getframerate()

       end_time = time.monotonic()
       print(f"It took {end_time - start_time} seconds to generate {duration:.2f} seconds of audio")

if __name__ == "__main__":
    text_prompt = "Hello, my name is Suno. And, uh — and I like pizza. [laughs] But I also have other interests such as playing tic tac toe."

    # Create output directory if it doesn't exist
    output_dir = "tts_outputs"
    os.makedirs(output_dir, exist_ok=True)

    # Generate audio from all models
    generate_orpheus_tts(text_prompt, os.path.join(output_dir, "orpheus_generation.wav"))
    # generate_cosyvoice_tts(text_prompt, os.path.join(output_dir, "cosyvoice_generation.wav"))
    # generate_bark_tts(text_prompt, os.path.join(output_dir, "bark_generation.wav"))
    # generate_pyttsx3_tts(text_prompt, os.path.join(output_dir, "pyttsx3_generation.wav"))
    # generate_speecht5_tts(text_prompt, os.path.join(output_dir, "speecht5_generation.wav"))
    # generate_dia_tts(text_prompt, os.path.join(output_dir, "dia_generation.wav"))


    print("All TTS generation complete.")
