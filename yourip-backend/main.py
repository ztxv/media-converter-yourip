"""Local media conversion and observable download jobs for YouRip."""
import json
import logging
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

app = FastAPI(title="YouRip", docs_url=None, redoc_url=None)
logger = logging.getLogger("uvicorn.error")

AUDIO_QUALITIES = {"standard": "128K", "high": "192K", "best": "320K"}
VIDEO_QUALITIES = {"compact": 480, "balanced": 720, "best": 1080}
MAX_JOBS = 3
JOB_TTL = 60 * 60
PROGRESS_RE = re.compile(r"YOURIP_PROGRESS:\s*(\d+(?:\.\d+)?)%")


class DownloadRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    format: str = "mp3"
    audio_quality: str = "high"
    video_quality: str = "balanced"


@dataclass
class Job:
    url: str
    format: str
    audio_quality: str
    video_quality: str
    directory: Path
    created: float = field(default_factory=time.monotonic)
    status: str = "preparing"
    progress: float | None = None
    error: str | None = None
    path: Path | None = None
    title: str = "YouTube media"


jobs: dict[str, Job] = {}
jobs_lock = threading.Lock()


def normalize_url(raw: str) -> str:
    raw = raw.strip().strip("\"'")
    if not raw.startswith(("https://", "http://")):
        raw = "https://" + raw
    parsed = urlparse(raw)
    allowed = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"}
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in allowed or parsed.username or parsed.password:
        raise HTTPException(400, "Please enter a valid YouTube video link.")
    parts = parsed.path.strip("/").split("/")
    if parsed.hostname == "youtu.be":
        video_id = parts[0]
    elif parsed.path == "/watch":
        video_id = parse_qs(parsed.query).get("v", [""])[0]
    elif len(parts) == 2 and parts[0] in {"shorts", "embed", "live", "v"}:
        video_id = parts[1]
    else:
        video_id = ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise HTTPException(400, "Use a link to a single YouTube video, not a channel or playlist.")
    return f"https://www.youtube.com/watch?v={video_id}"


def validate_request(request: DownloadRequest) -> str:
    url = normalize_url(request.url)
    if request.format not in {"mp3", "mp4"}:
        raise HTTPException(400, "Choose MP3 or MP4.")
    if request.audio_quality not in AUDIO_QUALITIES or request.video_quality not in VIDEO_QUALITIES:
        raise HTTPException(400, "Choose a supported quality setting.")
    return url


def command_for(job: Job) -> list[str]:
    command = [
        sys.executable, "-m", "yt_dlp", "--ignore-config", "--js-runtimes", "node",
        "--no-playlist", "--no-colors", "--no-warnings", "--newline", "--write-info-json",
        "--progress-template", "download:YOURIP_PROGRESS:%(progress._percent_str)s",
        "--progress-template", "postprocess:YOURIP_PROCESSING",
        "--progress-delta", "0.25", "--socket-timeout", "30", "--retries", "2",
        "--max-filesize", "250M", "-o", str(job.directory / "media.%(ext)s"),
    ]
    if job.format == "mp3":
        command += ["-f", "bestaudio/best", "--extract-audio", "--audio-format", "mp3",
                    "--audio-quality", AUDIO_QUALITIES[job.audio_quality]]
    else:
        height = VIDEO_QUALITIES[job.video_quality]
        command += ["-f", f"bv*[ext=mp4][height<={height}]+ba[ext=m4a]/b[ext=mp4][height<={height}]",
                    "--merge-output-format", "mp4"]
    return command + ["--", job.url]


def run_job(job: Job) -> None:
    timed_out = threading.Event()
    recent_output: list[str] = []
    process = None
    timer = None
    try:
        process = subprocess.Popen(command_for(job), stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, bufsize=1)
        def expire():
            timed_out.set()
            if process and process.poll() is None:
                process.kill()
        timer = threading.Timer(600, expire)
        timer.start()
        assert process.stdout is not None
        for raw_line in process.stdout:
            line = raw_line.strip()
            recent_output.append(line)
            recent_output = recent_output[-12:]
            match = PROGRESS_RE.search(line)
            if match:
                job.status = "downloading"
                job.progress = min(100.0, float(match.group(1)))
            elif "YOURIP_PROCESSING" in line or line.startswith(("[ExtractAudio]", "[Merger]", "[VideoRemuxer]")):
                job.status = "processing"
                job.progress = None
        return_code = process.wait()
        if timed_out.is_set():
            raise TimeoutError("Conversion took longer than 10 minutes. Try a shorter video.")
        output = job.directory / f"media.{job.format}"
        if return_code != 0 or not output.is_file():
            logger.warning("yt-dlp failed: %s", "\n".join(recent_output)[-2000:])
            raise RuntimeError("Conversion failed. The video may be restricted, unavailable, or missing the selected quality. Check the terminal for details.")
        info = job.directory / "media.info.json"
        if info.is_file():
            job.title = json.loads(info.read_text(encoding="utf-8")).get("title") or job.title
        job.path = output
        job.progress = 100.0
        job.status = "ready"
    except Exception as exc:
        logger.warning("Conversion job failed: %s", exc)
        job.error = str(exc) if isinstance(exc, (RuntimeError, TimeoutError)) else "The converter encountered an error. Check the terminal for details."
        job.status = "error"
        shutil.rmtree(job.directory, ignore_errors=True)
    finally:
        if timer:
            timer.cancel()


def expire_old_jobs() -> None:
    now = time.monotonic()
    with jobs_lock:
        old = [key for key, job in jobs.items() if job.status != "downloading" and job.status != "processing" and job.status != "preparing" and now - job.created >= JOB_TTL]
        for key in old:
            shutil.rmtree(jobs.pop(key).directory, ignore_errors=True)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/jobs", status_code=201)
def create_job(request: DownloadRequest):
    url = validate_request(request)
    expire_old_jobs()
    with jobs_lock:
        active = sum(job.status in {"preparing", "downloading", "processing"} for job in jobs.values())
        if active >= MAX_JOBS:
            raise HTTPException(429, "The converter is busy. Please try again in a moment.")
        job_id = secrets.token_urlsafe(18)
        job = Job(url, request.format, request.audio_quality, request.video_quality,
                  Path(tempfile.mkdtemp(prefix="yourip-")))
        jobs[job_id] = job
    threading.Thread(target=run_job, args=(job,), daemon=True).start()
    cleanup = threading.Timer(JOB_TTL + 1, expire_old_jobs)
    cleanup.daemon = True
    cleanup.start()
    return {"id": job_id}


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Conversion job not found.")
    return {"status": job.status, "progress": job.progress, "error": job.error}


def remove_job(job_id: str, directory: Path) -> None:
    with jobs_lock:
        jobs.pop(job_id, None)
    shutil.rmtree(directory, ignore_errors=True)


@app.get("/api/jobs/{job_id}/file")
def job_file(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Conversion job not found.")
    if job.status != "ready" or not job.path:
        raise HTTPException(409, "The file is not ready yet.")
    filename = re.sub(r'[\x00-\x1f\\/*?:"<>|]', '', job.title).strip()[:120] or "YouTube media"
    return FileResponse(job.path, media_type="audio/mpeg" if job.format == "mp3" else "video/mp4",
                        filename=f"{filename}.{job.format}",
                        background=BackgroundTask(remove_job, job_id, job.directory))
