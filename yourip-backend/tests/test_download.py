import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi import HTTPException
from main import DownloadRequest, Job, command_for, job_file, jobs, normalize_url, run_job, validate_request

VIDEO = 'https://youtu.be/jNQXAC9IVRw'


class ConverterTests(unittest.TestCase):
    def test_supported_links_and_host_validation(self):
        self.assertEqual(normalize_url(VIDEO), 'https://www.youtube.com/watch?v=jNQXAC9IVRw')
        for url in ['https://youtube.com.evil.test/watch?v=jNQXAC9IVRw', 'https://youtube.com/playlist?list=x', 'https://youtube.com/watch?v=bad']:
            with self.subTest(url=url), self.assertRaises(HTTPException):
                normalize_url(url)

    def test_supported_format_and_quality(self):
        for value in [DownloadRequest(url=VIDEO, format='mov'), DownloadRequest(url=VIDEO, audio_quality='0'), DownloadRequest(url=VIDEO, video_quality='8k')]:
            with self.assertRaises(HTTPException) as result:
                validate_request(value)
            self.assertEqual(result.exception.status_code, 400)

    def test_audio_and_video_commands_use_selected_quality(self):
        with tempfile.TemporaryDirectory() as folder:
            audio = command_for(Job(VIDEO, 'mp3', 'standard', 'balanced', Path(folder)))
            video = command_for(Job(VIDEO, 'mp4', 'high', 'compact', Path(folder)))
        self.assertEqual(audio[audio.index('--audio-quality') + 1], '128K')
        self.assertIn('height<=480', video[video.index('-f') + 1])
        self.assertIn('--merge-output-format', video)
        self.assertNotIn('--extract-audio', video)

    def test_progress_and_ready_file(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            job = Job(VIDEO, 'mp4', 'high', 'balanced', directory)
            class FakeProcess:
                stdout = iter(['YOURIP_PROGRESS: 18.5%\n', 'YOURIP_PROGRESS: 100.0%\n', 'YOURIP_PROCESSING\n'])
                def poll(self): return 0
                def wait(self):
                    (directory / 'media.mp4').write_bytes(b'fake video')
                    (directory / 'media.info.json').write_text(json.dumps({'title': 'My / video'}))
                    return 0
            with patch('main.subprocess.Popen', return_value=FakeProcess()):
                run_job(job)
            self.assertEqual(job.status, 'ready')
            self.assertEqual(job.progress, 100)
            jobs['test'] = job
            response = job_file('test')
            self.assertIn('mp4', response.headers['content-disposition'])
            self.assertEqual(response.media_type, 'video/mp4')
            response.background.func(*response.background.args, **response.background.kwargs)
            self.assertNotIn('test', jobs)

    def test_missing_output_reports_error_and_cleans_files(self):
        directory = Path(tempfile.mkdtemp())
        job = Job(VIDEO, 'mp3', 'high', 'balanced', directory)
        class FakeProcess:
            stdout = iter(['ERROR: unavailable\n'])
            def poll(self): return 1
            def wait(self): return 1
        with patch('main.subprocess.Popen', return_value=FakeProcess()):
            run_job(job)
        self.assertEqual(job.status, 'error')
        self.assertFalse(directory.exists())


if __name__ == '__main__':
    unittest.main()
