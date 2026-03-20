# Confetti Video Maker

A small Vite app to design **canvas-confetti** effects and record **1920×1080 @ 60fps** clips.

## Run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal.

## Record + download

- Click **Play effect** to preview.
- Click **Start recording** to capture a clip.
- Click **Download WebM**.

## Optional: convert WebM → MP4 (local)

If you have FFmpeg installed:

```bash
ffmpeg -i input.webm -c:v libx264 -pix_fmt yuv420p -r 60 output.mp4
```

