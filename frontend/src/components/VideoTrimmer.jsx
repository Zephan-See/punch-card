import { useEffect, useRef, useState } from 'react';
import { X, Scissors, Play, Check, Loader } from 'lucide-react';

const pickVideoMime = () => {
  const c = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return c.find(m => MediaRecorder.isTypeSupported(m)) || '';
};

const fmt = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

// ponytail: real-time captureStream re-encode. Unsupported on Safari → fall back to a "please pre-trim" message.
// Upgrade path: ffmpeg.wasm (~25MB) when iOS users actually complain.
export function canTrimVideo() {
  const v = document.createElement('video');
  return typeof v.captureStream === 'function' || typeof v.mozCaptureStream === 'function';
}

export default function VideoTrimmer({ file, maxSeconds = 30, onTrimmed, onClose }) {
  const videoRef = useRef(null);
  const [src] = useState(() => URL.createObjectURL(file));
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(maxSeconds);
  const [encoding, setEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const onLoaded = () => {
    const v = videoRef.current;
    let d = v.duration;
    if (!isFinite(d) || d <= 0) {
      // Some webm files report Infinity until you seek to the end
      v.currentTime = 1e9;
      v.ontimeupdate = () => {
        d = v.duration;
        if (isFinite(d) && d > 0) {
          v.ontimeupdate = null;
          v.currentTime = 0;
          setDuration(d);
          setEnd(Math.min(maxSeconds, d));
        }
      };
      return;
    }
    setDuration(d);
    setEnd(Math.min(maxSeconds, d));
  };

  const onStartChange = (val) => {
    const v = Math.max(0, Math.min(val, duration - 0.5));
    setStart(v);
    if (end < v + 0.5) setEnd(Math.min(duration, v + Math.min(maxSeconds, duration - v)));
    else if (end - v > maxSeconds) setEnd(v + maxSeconds);
    if (videoRef.current) videoRef.current.currentTime = v;
  };

  const onEndChange = (val) => {
    const v = Math.min(duration, Math.max(val, start + 0.5));
    setEnd(Math.min(v, start + maxSeconds));
  };

  const preview = () => {
    const v = videoRef.current;
    v.currentTime = start;
    v.muted = false;
    v.play();
    const tick = () => {
      if (v.currentTime >= end) { v.pause(); v.removeEventListener('timeupdate', tick); }
    };
    v.addEventListener('timeupdate', tick);
  };

  const confirm = async () => {
    const v = videoRef.current;
    const captureFn = v.captureStream || v.mozCaptureStream;
    if (typeof captureFn !== 'function') {
      setError('当前浏览器不支持在线裁切');
      return;
    }
    setEncoding(true);
    setProgress(0);
    try {
      // Silent audio routing via Web Audio API — captureStream's audio track plays loud otherwise
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const audioSrc = ac.createMediaElementSource(v);
      const audioDest = ac.createMediaStreamDestination();
      audioSrc.connect(audioDest);
      // Deliberately not connecting to ac.destination → playback is silent

      v.currentTime = start;
      await new Promise(r => v.addEventListener('seeked', r, { once: true }));

      const videoStream = captureFn.call(v);
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);
      const mimeType = pickVideoMime();
      const chunks = [];
      const recorder = new MediaRecorder(
        combined,
        mimeType ? { mimeType, videoBitsPerSecond: 1000000, audioBitsPerSecond: 64000 } : undefined
      );
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(res => { recorder.onstop = res; });

      recorder.start();
      await v.play();

      const tick = () => {
        const cur = v.currentTime;
        setProgress(Math.min(100, ((cur - start) / (end - start)) * 100));
        if (cur >= end || v.ended) {
          v.pause();
          if (recorder.state !== 'inactive') recorder.stop();
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);

      await done;
      ac.close();

      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      onTrimmed(blob);
      onClose();
    } catch (e) {
      setError('裁切失败：' + (e.message || ''));
      setEncoding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="flex justify-between items-center p-3 text-white">
        <button onClick={onClose} disabled={encoding} className="p-2 disabled:opacity-40"><X size={24}/></button>
        <h3 className="font-bold inline-flex items-center gap-2"><Scissors size={18}/> 裁切视频</h3>
        <div className="w-10"/>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <video ref={videoRef} src={src} onLoadedMetadata={onLoaded} playsInline preload="metadata" className="max-w-full max-h-full" />
      </div>

      <div className="bg-black/90 p-4 space-y-3 text-white">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-between text-sm">
          <span>起点 {fmt(start)}</span>
          <span className={(end - start) > maxSeconds + 0.1 ? 'text-red-400' : 'text-green-400'}>
            时长 {(end - start).toFixed(1)}s / {maxSeconds}s
          </span>
          <span>终点 {fmt(end)}</span>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-white/70">起点</label>
            <input type="range" min={0} max={duration || 1} step={0.1} value={start}
              onChange={(e) => onStartChange(parseFloat(e.target.value))}
              disabled={encoding || !duration} className="w-full accent-green-500" />
          </div>
          <div>
            <label className="text-xs text-white/70">终点</label>
            <input type="range" min={0} max={duration || 1} step={0.1} value={end}
              onChange={(e) => onEndChange(parseFloat(e.target.value))}
              disabled={encoding || !duration} className="w-full accent-green-500" />
          </div>
        </div>

        {encoding && (
          <div className="bg-white/10 rounded-full overflow-hidden h-2">
            <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }}/>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={preview} disabled={encoding || !duration} className="flex-1 py-3 bg-white/20 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-40">
            <Play size={18}/> 预览
          </button>
          <button onClick={confirm} disabled={encoding || !duration} className="flex-1 py-3 bg-green-500 rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {encoding ? <><Loader size={18} className="animate-spin"/> 处理中</> : <><Check size={18}/> 确认</>}
          </button>
        </div>

        {encoding && (
          <p className="text-xs text-white/60 text-center">实时处理，约需 {(end - start).toFixed(0)} 秒</p>
        )}
      </div>
    </div>
  );
}
