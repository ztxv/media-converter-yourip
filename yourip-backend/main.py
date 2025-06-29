from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats."""
    # Handle youtu.be short URLs
    if 'youtu.be/' in url:
        video_id = url.split('youtu.be/')[-1].split('?')[0].split('&')[0]
        return f'https://www.youtube.com/watch?v={video_id}'
    
    # Handle standard watch URLs with additional parameters
    if 'youtube.com/watch' in url:
        # Extract the 'v' parameter which contains the video ID
        if 'v=' in url:
            video_id = url.split('v=')[1].split('&')[0]
            return f'https://www.youtube.com/watch?v={video_id}'
    
    # Handle youtu.be format without https
    if 'youtu.be' in url:
        video_id = url.split('youtu.be/')[-1].split('?')[0].split('&')[0]
        return f'https://www.youtube.com/watch?v={video_id}'
    
    # If no matches found, return the original URL
    return url

@app.post("/api/download")
async def download_mp3(request: dict):
    temp_file = None
    try:
        # Get URL from request
        if not request or 'url' not in request:
            raise HTTPException(status_code=400, detail="URL is required")
            
        raw_url = request['url'].strip()
        if not raw_url:
            raise HTTPException(status_code=400, detail="URL cannot be empty")
            
        print(f"Processing URL: {raw_url}")
        
        # Handle drag-and-drop text that might include extra quotes or spaces
        url = raw_url.strip('\"\'')
        
        # Clean up the URL to handle various formats
        url = extract_video_id(url)
        print(f"Normalized URL: {url}")
        
        # Basic validation
        if not url or ('youtube.com' not in url and 'youtu.be' not in url):
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
            
        # Create a temporary directory for downloads
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, 'temp.mp3')
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
        output_path = os.path.join(temp_dir, output_filename)
        
        # Download the audio with more robust options
        print("Downloading audio...")
        download_cmd = [
            "yt-dlp",
            "-f", "bestaudio[ext=m4a]/bestaudio/best",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",  # Best quality
            "--no-playlist",         # Only download single video, not playlist
            "--ignore-errors",       # Continue on download errors
            "--no-warnings",         # Suppress warnings
            "--force-ipv4",          # Force IPv4
            "--socket-timeout", "30",  # 30 second timeout
            "-o", output_path,
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
        
        # Read the file content and return it directly
        with open(output_path, 'rb') as f:
            file_content = f.read()
            
        # Return the file content directly in the response
        from fastapi.responses import Response
        return Response(
            content=file_content,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"attachment; filename={output_filename}",
                "Content-Length": str(len(file_content)),
                "X-Title": title
            }
        )
            
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or str(e)
        print(f"Subprocess error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Error processing video: {error_msg}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        # Clean up the temp directory if it exists
        if 'temp_dir' in locals() and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except Exception as e:
                print(f"Error cleaning up temp directory: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)