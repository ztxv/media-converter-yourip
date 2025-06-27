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

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str

def sanitize_filename(filename):
    # Remove invalid characters, excessive whitespace, and limit length
    filename = re.sub(r'[\\/*?:"<>|]', '', filename)
    filename = re.sub(r'\s+', ' ', filename).strip()  # Collapse whitespace
    filename = filename[:100]  # Limit to 100 chars
    return filename

@app.post("/api/download")
async def download_mp3(request: DownloadRequest):
    temp_file = None
    try:
        url = request.url
        print(f"Processing URL: {url}")
        # Accept any YouTube link, do not validate or normalize
        # Create a temporary file with .mp3 extension
        temp_fd, temp_path = tempfile.mkstemp(suffix='.mp3')
        os.close(temp_fd)
        temp_file = temp_path
        # Get video title
        print("Getting video title with yt-dlp...")
        get_title_cmd = ["yt-dlp", "--get-title", url]
        title_result = subprocess.run(
            get_title_cmd,
            capture_output=True,
            text=True
        )
        title = "youtube_audio"
        if title_result.returncode == 0 and title_result.stdout.strip():
            title = title_result.stdout.strip()
        else:
            print(f"yt-dlp title extraction failed. Return code: {title_result.returncode}")
            print(f"yt-dlp stdout: {title_result.stdout}")
            print(f"yt-dlp stderr: {title_result.stderr}")
            # Still proceed; yt-dlp can often download even if title fails
        
        # Sanitize the title for filename
        safe_title = sanitize_filename(title)
        output_filename = f"{safe_title}.mp3"
        output_path = os.path.join(os.path.dirname(temp_path), output_filename)
        
        # Download the audio
        print("Downloading audio...")
        download_cmd = [
            "yt-dlp",
            "-f",
            "bestaudio[ext=m4a]/bestaudio/best",
            "--extract-audio",
            "--audio-format",
            "mp3",
            "-o",
            output_path,
            url
        ]
        download_result = subprocess.run(
            download_cmd,
            capture_output=True,
            text=True
        )
        
        if download_result.returncode != 0:
            error_msg = download_result.stderr or download_result.stdout
            print(f"Error downloading audio: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Failed to download audio: {error_msg}")
        
        if not os.path.exists(output_path):
            # Try with the temp path if output_path doesn't exist
            if os.path.exists(temp_path):
                output_path = temp_path
            else:
                raise HTTPException(status_code=500, detail="Output file was not created")
        
        print(f"Successfully downloaded to: {output_path}")
        
        # Return the file with custom header for video title
        headers = {"X-Video-Title": title}
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type='audio/mpeg',
            headers=headers
        )
            
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or str(e)
        print(f"Subprocess error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Error processing video: {error_msg}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        # Clean up the temp file if it exists
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)