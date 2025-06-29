from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import subprocess
import os
import tempfile
import uvicorn
from pydantic import BaseModel
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str

@app.post("/api/download")
async def download_mp3(request: DownloadRequest):
    temp_dir = tempfile.mkdtemp()
    temp_file = os.path.join(temp_dir, "output.mp3")
    
    try:
        # Download the audio using yt-dlp
        cmd = [
            "yt-dlp",
            "-x",  # Extract audio
            "--audio-format", "mp3",
            "-o", temp_file,
            request.url
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if not os.path.exists(temp_file):
            raise HTTPException(status_code=400, detail="Failed to download audio")
            
        # Get the actual filename from the output
        filename = "audio.mp3"
        if result.stderr:
            for line in result.stderr.split('\n'):
                if 'Destination:' in line:
                    filename = os.path.basename(line.split('Destination:')[-1].strip())
                    if not filename.endswith('.mp3'):
                        filename += '.mp3'
                    break
        
        return FileResponse(
            path=temp_file,
            filename=filename,
            media_type='audio/mpeg'
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up will be handled by the OS
        pass

if __name__ == "__main__":
    uvicorn.run("simple_server:app", host="0.0.0.0", port=8000, reload=True)
