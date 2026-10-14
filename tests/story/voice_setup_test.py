"""Missing language data must fail before Kokoro can launch an implicit installer."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

worker_path = Path(__file__).resolve().parents[2] / "utils" / "story_voice.py"
spec = importlib.util.spec_from_file_location("story_voice", worker_path)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class KokoroSetupTests(unittest.TestCase):
    def test_missing_english_model_fails_with_setup_instructions(self):
        with patch.object(worker.importlib.util, "find_spec", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "requirements/story/kokoro.txt"):
                worker.require_kokoro_language_model()

    def test_preinstalled_english_model_requires_no_installer(self):
        with patch.object(worker.importlib.util, "find_spec", return_value=object()), \
                patch.object(worker.subprocess, "run", side_effect=AssertionError("Unexpected installer")):
            worker.require_kokoro_language_model()


if __name__ == "__main__":
    unittest.main()
