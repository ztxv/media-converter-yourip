# YT2MP3

Convert YouTube videos to MP3 audio files with a modern, fast, and user-friendly web app.

---

## 🚀 Overview

**YT2MP3** is a full-stack web application that allows users to easily convert YouTube videos to MP3 files. Built with a modern tech stack (Next.js, React, FastAPI, Python), it features a sleek UI, drag-and-drop support, and fast, reliable audio extraction using `yt-dlp`.

---

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/) (React, TypeScript, Tailwind CSS, Radix UI)
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python), [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/)

---

## 📦 Architecture

```
[User Browser]
     │
     ▼
[Frontend: Next.js/React]
     │  (POST /api/download)
     ▼
[Backend: FastAPI + yt-dlp]
     │
     ▼
[YouTube] → [MP3 File Returned]
```

- **Frontend**: Handles user input, fetches video metadata, and interacts with the backend API.
- **Backend**: Receives YouTube URLs, uses `yt-dlp` to extract and convert audio, and streams the MP3 file back to the frontend.

---

## ✨ Main Features

- Paste or drag-and-drop YouTube links
- Fetches video title and thumbnail
- Converts YouTube videos to MP3 audio
- Download progress and error handling
- Download history
- Theming (red/green), responsive design
- Settings drawer for user preferences

---

## 📑 API Documentation

### `POST /api/download`

**Description:**
Converts a YouTube video to MP3 and returns the audio file.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
- `200 OK`: Returns the MP3 file as a binary stream. Sets `X-Video-Title` header to the video title.
- `400 Bad Request`: Invalid URL or download error.
- `500 Internal Server Error`: Unexpected server error.

**Example cURL:**
```bash
curl -X POST http://localhost:8000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  --output video.mp3
```

---

## 🗂️ Project Structure

```
yt2mp3/
  ├── yt2mp3-frontend/   # Next.js frontend (React, TypeScript, Tailwind CSS)
  └── yt2mp3-backend/    # FastAPI backend (Python, yt-dlp)
```

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.8+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and available in PATH

### Frontend
```bash
cd yt2mp3-frontend
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

### Backend
```bash
cd yt2mp3-backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📚 Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp#readme)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)

---

## 📝 License
MIT 