from faster_whisper import WhisperModel, BatchedInferencePipeline

model = WhisperModel("small", device="cpu", compute_type="int8")
batched_model = BatchedInferencePipeline(model=model)
segments, info = batched_model.transcribe("media/audios/demo.mp3", batch_size=16, chunk_length=3, temperature=0)

for segment in segments:
    print("[%.2fs -> %.2fs] %s" % (segment.start, segment.end, segment.text))