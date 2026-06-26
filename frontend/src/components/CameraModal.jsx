import { useEffect, useRef, useState } from 'react';
import { X, RotateCw, Pause, Play, Check, Camera } from 'lucide-react';

// ponytail: 300ms tap-vs-hold threshold matches iOS QuickTake feel
const LONG_PRESS_MS = 300;

const pickVideoMime = () => {
  const c = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return c.find(m => MediaRecorder.isTypeSupported(m)) || '';
};

export default function CameraModal({ onPhoto, onVideo, onClose, maxVideoSeconds = 30 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const pressTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  const [facing, setFacing] = useState('environment');
  const [mode, setMode] = useState('live'); // live | recording | paused | photoPreview | videoPreview
  const [elapsed, setElapsed] = useState(0);
  const [photoData, setPhotoData] = useState(null);   // base64 (small)
  const [videoBlob, setVideoBlob] = useState(null);   // Blob, previewed via objectURL
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);

  // Open / re-open stream when facingMode changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        setError(e.message || '无法打开相机');
      }
    })();
    return () => { cancelled = true; };
  }, [facing]);

  // Hard cleanup on unmount
  useEffect(() => () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const ratio = Math.min(1024 / v.videoWidth, 1024 / v.videoHeight, 1);
    const w = Math.round(v.videoWidth * ratio);
    const h = Math.round(v.videoHeight * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(v, 0, 0, w, h);
    setPhotoData(canvas.toDataURL('image/jpeg', 0.82));
    setMode('photoPreview');
  };

  const startTimer = () => {
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(t => {
        if (t + 1 >= maxVideoSeconds) { finishVideo(); return t + 1; }
        return t + 1;
      });
    }, 1000);
  };

  const startVideoRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickVideoMime();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 800000, audioBitsPerSecond: 64000 } : undefined);
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setMode('videoPreview');
    };
    recorderRef.current = recorder;
    recorder.start();
    setMode('recording');
    setElapsed(0);
    startTimer();
  };

  const pauseVideo = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.pause();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setMode('paused');
  };

  const resumeVideo = () => {
    if (recorderRef.current?.state === 'paused') recorderRef.current.resume();
    setMode('recording');
    startTimer();
  };

  const finishVideo = () => {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  // Shutter press handling: tap = photo, hold past threshold = start video
  const onPressStart = () => {
    if (mode !== 'live') return;
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      startVideoRecording();
    }, LONG_PRESS_MS);
  };

  const onPressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      if (mode === 'live') takePhoto();
    }
    // If recording already started, release does nothing — use the buttons below.
  };

  const retake = () => {
    setPhotoData(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoBlob(null);
    setVideoUrl(null);
    setElapsed(0);
    setMode('live');
  };

  const close = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    onClose();
  };

  const confirm = () => {
    if (mode === 'photoPreview') {
      onPhoto(photoData);
    } else if (mode === 'videoPreview') {
      onVideo(videoBlob);  // parent owns the blob now; don't revoke here
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      <div className="flex justify-between items-center p-3 text-white">
        <button onClick={close} className="p-2"><X size={24} /></button>
        {mode === 'live' && (
          <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')} className="p-2"><RotateCw size={22} /></button>
        )}
        {(mode === 'recording' || mode === 'paused') && (
          <div className="font-mono text-red-400">{elapsed}s / {maxVideoSeconds}s</div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-6">
            <p>{error}</p>
            <button onClick={close} className="mt-4 px-4 py-2 bg-white/20 rounded">关闭</button>
          </div>
        ) : mode === 'photoPreview' ? (
          <img src={photoData} alt="预览" className="max-w-full max-h-full object-contain" />
        ) : mode === 'videoPreview' ? (
          <video src={videoUrl} controls autoPlay loop playsInline className="max-w-full max-h-full" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
        {mode === 'recording' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> 录制中
          </div>
        )}
        {mode === 'paused' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">已暂停</div>
        )}
      </div>

      <div className="p-6 pb-8 flex items-center justify-center gap-8 bg-black/85 min-h-[140px]">
        {mode === 'live' && !error && (
          <button
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerCancel={onPressEnd}
            className="w-20 h-20 rounded-full bg-white ring-4 ring-white/30 active:scale-95 transition"
            style={{ touchAction: 'none' }}
            aria-label="点击拍照，长按录像"
          />
        )}
        {(mode === 'recording' || mode === 'paused') && (
          <>
            <button
              onClick={mode === 'recording' ? pauseVideo : resumeVideo}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center"
              aria-label={mode === 'recording' ? '暂停' : '继续'}
            >
              {mode === 'recording' ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={finishVideo}
              className="w-20 h-20 rounded-full bg-red-500 ring-4 ring-red-500/30 flex items-center justify-center text-white"
              aria-label="完成"
            >
              <Check size={28} />
            </button>
          </>
        )}
        {(mode === 'photoPreview' || mode === 'videoPreview') && (
          <>
            <button onClick={retake} className="px-5 py-3 rounded-lg bg-white/20 text-white">重拍</button>
            <button onClick={confirm} className="px-5 py-3 rounded-lg bg-green-500 text-white inline-flex items-center gap-1.5">
              <Check size={18}/> 使用
            </button>
          </>
        )}
      </div>

      {mode === 'live' && !error && (
        <div className="text-center text-white/70 text-xs pb-3 inline-flex items-center justify-center gap-1.5">
          <Camera size={12}/> 点击拍照 · 长按录像
        </div>
      )}
    </div>
  );
}
