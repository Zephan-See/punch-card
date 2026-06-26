import { useEffect, useRef, useState } from 'react';
import { X, Mic, Pause, Play, Check } from 'lucide-react';

const pickAudioMime = () => {
  const c = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
  return c.find(m => MediaRecorder.isTypeSupported(m)) || '';
};

export default function AudioRecorder({ onConfirm, onClose, maxSeconds = 60 }) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [mode, setMode] = useState('idle'); // idle | recording | paused | preview
  const [elapsed, setElapsed] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsed(t => {
        if (t + 1 >= maxSeconds) { finish(); return t + 1; }
        return t + 1;
      });
    }, 1000);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickAudioMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 24000 } : undefined);
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => { setData(reader.result); setMode('preview'); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setMode('recording');
      setElapsed(0);
      startTimer();
    } catch (e) {
      setError(e.message || '无法访问麦克风');
    }
  };

  const pause = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setMode('paused');
  };

  const resume = () => {
    if (recorderRef.current?.state === 'paused') recorderRef.current.resume();
    setMode('recording');
    startTimer();
  };

  const finish = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const retake = () => {
    setData(null);
    setElapsed(0);
    setMode('idle');
  };

  const close = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-bold inline-flex items-center gap-2"><Mic size={18}/> 录音</h3>
          <button onClick={close} className="text-gray-500"><X size={20}/></button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {mode === 'idle' && !error && (
          <button
            onClick={start}
            className="w-full py-3 bg-green-500 text-white rounded-lg inline-flex items-center justify-center gap-2"
          >
            <Mic size={20}/> 开始录音
          </button>
        )}

        {(mode === 'recording' || mode === 'paused') && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-red-500 font-bold text-2xl">
                {mode === 'recording' && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"/>}
                {elapsed}s / {maxSeconds}s
              </div>
              <p className="text-xs text-gray-500 mt-1">{mode === 'paused' ? '已暂停' : '录音中...'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={mode === 'recording' ? pause : resume}
                className="flex-1 py-3 bg-gray-100 rounded-lg inline-flex items-center justify-center gap-2"
              >
                {mode === 'recording' ? <><Pause size={18}/> 暂停</> : <><Play size={18}/> 继续</>}
              </button>
              <button
                onClick={finish}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg inline-flex items-center justify-center gap-2"
              >
                <Check size={18}/> 完成
              </button>
            </div>
          </div>
        )}

        {mode === 'preview' && (
          <div className="space-y-3">
            <audio src={data} controls className="w-full" />
            <div className="flex gap-3">
              <button onClick={retake} className="flex-1 py-3 bg-gray-100 rounded-lg">重录</button>
              <button onClick={() => { onConfirm(data); onClose(); }} className="flex-1 py-3 bg-green-500 text-white rounded-lg inline-flex items-center justify-center gap-2">
                <Check size={18}/> 使用
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
