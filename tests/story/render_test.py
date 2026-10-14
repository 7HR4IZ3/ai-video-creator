import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("story_render", Path(__file__).resolve().parents[2] / "utils" / "story_render.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class CaptionTests(unittest.TestCase):
    def test_caps_preserve_words_and_split_at_pauses(self):
        words = [{"word": " I'm", "start": 0.0, "end": 0.3}, {"word": " here.", "start": 0.3, "end": 0.6},
                 {"word": " Wait", "start": 1.4, "end": 1.6}, {"word": " for", "start": 1.6, "end": 1.8}, {"word": " me.", "start": 1.8, "end": 2.1}]
        renderer.validate_alignment(words, "I'm here. Wait for me.", 2.2)
        captions = renderer.caption_phrases(words)
        self.assertEqual([c["text"] for c in captions], ["I'm here.", "Wait for me."])
        self.assertEqual(captions[1]["start"], 1.4)

    def test_alignment_cannot_replace_approved_words(self):
        with self.assertRaisesRegex(ValueError, "changed the approved"):
            renderer.validate_alignment([{"word": "Wrong", "start": 0, "end": 1}], "Right", 1)
        with self.assertRaisesRegex(ValueError, "unordered"):
            renderer.validate_alignment([{"word": "Hi", "start": 1, "end": 0.5}], "Hi", 2)

    def test_ass_has_safe_text_and_duration_bounded_events(self):
        ass = renderer.make_ass([{"text": "hello{bad}\\N", "start": 0.1, "end": 1.9}], "Title", 2)
        self.assertIn("PlayResX: 1080", ass)
        self.assertNotIn("hello{bad}", ass)
        self.assertNotIn("\\N", ass)
        self.assertIn("0:00:02.00,Caption", ass)
        self.assertEqual(renderer.ass_time(3599.995), "1:00:00.00")


if __name__ == "__main__":
    unittest.main()
