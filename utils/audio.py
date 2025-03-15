from sys import argv
from kokoro import KPipeline
import soundfile as sf


# arg parser

voices = [
    "af_alloy",
    "af_aoede",
    "af_bella",
    "af_heart",
    "af_jessica",
    "af_kore",
    "af_nicole",
    "af_nova",
    "af_river",
    "af_sarah",
    "af_sky",
    "am_adam",
    "am_echo",
    "am_eric",
    "am_fenrir",
    "am_liam",
    "am_michael",
    "am_onyx",
    "am_puck",
    "am_santa",
]

# [
#     "bf_alice",
#     "bf_emma",
#     "bf_isabella",
#     "bf_lily",
#     "bm_daniel",
#     "bm_fable",
#     "bm_george",
#     "bm_lewis",
# ]


pipeline = KPipeline(lang_code="a")


for voice in voices:
    generator = pipeline("""The wind howled, mirroring the fear in Ben's heart as he clutched the lighthouse lantern. He’d always been afraid of storms, but this one felt different; urgent, like a whispered threat.  He knew what he had to do. 


He ran for his coat, then plunged out into the darkness, his footsteps echoing against the storm’s roar. 
""", voice=voice, speed=1, split_pattern=r"\n+")

    with sf.SoundFile(f"outs/{voice}.wav", "w+", 24000, 1) as output:
        for i, (gs, ps, audio) in enumerate(generator):
            output.seek(0, sf.SEEK_END)
            output.write(audio)
