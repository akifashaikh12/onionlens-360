FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create storage dirs
RUN mkdir -p /data/storage/originals /data/storage/videos \
    /data/storage/frames /data/storage/evidence \
    /data/storage/reports /data/storage/dataset

ENV DATABASE_URL=sqlite:////data/onionlens.db
ENV UPLOAD_DIR=/data/storage/originals
ENV VIDEO_DIR=/data/storage/videos
ENV FRAMES_DIR=/data/storage/frames
ENV EVIDENCE_DIR=/data/storage/evidence
ENV REPORTS_DIR=/data/storage/reports
ENV DATASET_DIR=/data/storage/dataset

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
