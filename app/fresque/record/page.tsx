'use client';

import { useEffect, useRef, useState } from 'react';

export default function RecordPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const initStream = async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    };

    initStream();

    // Cleanup function for the media stream
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startAndAutoStopRecording = () => {
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      await uploadAndProcess(blob);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);

    setTimeout(() => {
      recorder.stop();
      setRecording(false);
    }, 4000);
  };

  const uploadAndProcess = async (blob: Blob) => {
    try {
      setProcessing(true);
      setStatus('📤 Upload en cours...');

      const formData = new FormData();
      formData.append('video', blob, 'video.webm');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.filename) {
        alert('Erreur lors de l\'upload');
        return;
      }

      setStatus('🎬 Conversion & envoi S3...');

      const processRes = await fetch('/api/fal/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadData.filename }),
      });

      setStatus('🧠 Traitement Fal.ai en cours...');

      const processData = await processRes.json();
      if (processData.videoPath) {
        setProcessedVideoUrl(processData.videoPath);
        setStatus(null);
      } else {
        alert('Erreur traitement Fal.ai');
      }
    } catch (err) {
      console.error('❌ Erreur process:', err);
      alert('Erreur générale');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎬 Enregistrement Automatisé</h1>

      <video ref={videoRef} autoPlay muted className="w-full border rounded mb-4" />

      <div className="flex gap-2 mb-4">
        <button
          onClick={startAndAutoStopRecording}
          disabled={recording || processing}
          className={`px-4 py-2 rounded text-white ${
            recording || processing ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600'
          }`}
        >
          {recording ? '🎥 Enregistrement...' : '▶️ Démarrer (4 sec)'}
        </button>
      </div>

      {processing && (
        <div className="flex items-center gap-2 text-blue-600 font-medium mb-4">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>{status}</span>
        </div>
      )}

      {processedVideoUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">✅ Vidéo traitée :</h2>
          <video src={processedVideoUrl} controls className="w-full border rounded" />
        </div>
      )}
    </div>
  );
}
