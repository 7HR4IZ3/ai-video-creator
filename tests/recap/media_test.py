import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'utils'))
from recap_analyze import parse_srt
from recap_render import captions_ass

class MediaTests(unittest.TestCase):
    def test_srt_keeps_source_time_and_strips_style(self):
        result=parse_srt('1\n00:02:03,400 --> 00:02:05,600\n<i>The door opens.</i>\n')
        self.assertEqual(result,[{'start':123.4,'end':125.6,'text':'The door opens.'}])
    def test_invalid_subtitles_fail(self):
        with self.assertRaises(ValueError): parse_srt('not subtitles')
    def test_ass_escapes_source_dialogue_and_preserves_output_time(self):
        result=captions_ass([{'start':5,'end':6.2,'text':'{\\pos(0,0)}Hello'}],1920,1080)
        self.assertIn('0:00:05.00,0:00:06.20',result)
        self.assertNotIn('{\\pos',result)
        self.assertIn('PlayResX: 1920',result)

if __name__=='__main__': unittest.main()
