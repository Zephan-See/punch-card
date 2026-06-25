import { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Camera, Mic, Video, Check, Lightbulb, Package, Music } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';

const VIDEO_MAX_SECONDS = 30;
const AUDIO_MAX_SECONDS = 60;
const MAX_IMAGES = 10;

// Supabase Storage handles size, but keep videos reasonable for upload speed
const VIDEO_CONFIGS = [
  { width: 480, height: 480, videoBPS: 500000, audioBPS: 48000 },
  { width: 360, height: 360, videoBPS: 300000, audioBPS: 32000 },
  { width: 240, height: 240, videoBPS: 150000, audioBPS: 24000 }
];

export default function CheckIn() {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);    // base64 数组，最多 3 张
  const [audio, setAudio] = useState(null);     // base64
  const [video, setVideo] = useState(null);     // base64
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null); // 'audio' | 'video'
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // 计算总大小
  const totalSize = (
    images.reduce((s, img) => s + img.length, 0) +
    (audio?.length || 0) +
    (video?.length || 0)
  );

  // 上传图片（最多 10 张，与视频互斥）
  // 支持多选 + 相机直拍（按钮上 capture="environment"）
  const handleImageSelect = (e) => {
    if (video) { alert('请先移除视频，图片和视频只能选一种'); e.target.value = ''; return; }

    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return alert(`最多 ${MAX_IMAGES} 张图片`);

    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`只能再加 ${remaining} 张，多余的会被忽略`);
    }

    toProcess.forEach(file => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} 超过 20MB，跳过`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(1024 / img.width, 1024 / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.78);
          setImages(prev => [...prev, base64]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // 录音（与视频互斥）
  const startAudioRecording = async () => {
    if (video) return alert('请先移除视频，录音和视频只能选一种');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result;
          const sizeKB = Math.round(base64.length / 1024);
          if (base64.length > CELL_MAX_CHARS) {
            alert(`⚠️ 录音 ${sizeKB}KB 超过上限\n建议录制更短的音频`);
          } else {
            setAudio(base64);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingType('audio');
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= AUDIO_MAX_SECONDS) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch (e) {
      alert('❌ 无法录音：' + e.message);
    }
  };

  // 录视频（与图片/录音互斥）
  const startVideoRecording = async (configIdx = 0) => {
    if (images.length > 0) return alert('请先移除图片，图片和视频只能选一种');
    if (audio) return alert('请先移除录音，录音和视频只能选一种（视频已带声音）');

    const cfg = VIDEO_CONFIGS[configIdx];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: cfg.width, height: cfg.height },
        audio: true
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: cfg.videoBPS,
        audioBitsPerSecond: cfg.audioBPS
      });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result;
          const sizeKB = Math.round(base64.length / 1024);

          if (base64.length > CELL_MAX_CHARS) {
            if (configIdx < VIDEO_CONFIGS.length - 1) {
              alert(`⚠️ 视频 ${sizeKB}KB 超过上限，自动降为更低质量重录`);
              stream.getTracks().forEach(t => t.stop());
              setTimeout(() => startVideoRecording(configIdx + 1), 500);
              return;
            } else {
              alert(`❌ 视频太大（${sizeKB}KB）。建议录得更短（3秒以内）或拍静态画面`);
            }
          } else {
            if (base64.length > CELL_WARN_CHARS) {
              alert(`⚠️ 视频 ${sizeKB}KB 偏大，可能影响加载速度`);
            }
            setVideo(base64);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingType('video');
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= VIDEO_MAX_SECONDS) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch (e) {
      alert('❌ 无法录视频：' + e.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordingType(null);
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && !audio && !video) {
      alert('请输入打卡内容或添加媒体');
      return;
    }

    const mediaFields = {
      images,                  // up to 10 base64 data URLs
      audio_url: audio || '',
      video_url: video || ''
    };

    setLoading(true);
    try {
      const res = await api.checkIn(user.token, content || '(媒体打卡)', mediaFields);
      if (res.error) {
        alert(res.error === '已打卡' ? '👍 今天已经完成打卡了！\n\n明日记得继续打卡哦！' : res.error);
      } else {
        alert('✅ 打卡成功！');
        navigate('/wall');
      }
    } catch (e) {
      alert('❌ 打卡失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center">
          <button onClick={() => navigate(-1)} className="text-gray-500 inline-flex items-center gap-1"><ChevronLeft size={18} /> 返回</button>
          <h1 className="text-xl font-bold flex-1 text-center inline-flex items-center justify-center gap-2"><Pencil size={20} /> 打卡</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-5 space-y-4">
          <textarea
            placeholder="写下你今天的故事..."
            rows="4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* 图片预览（最多 10 张） */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 录音预览 */}
          {audio && (
            <div className="relative bg-gray-50 rounded-lg p-3">
              <button
                type="button"
                onClick={() => setAudio(null)}
                className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 z-10"
              >
                ✕
              </button>
              <audio src={audio} controls className="w-full" />
              <p className="text-xs text-gray-500 text-center mt-1 inline-flex items-center justify-center gap-1 w-full"><Music size={12} /> {Math.round(audio.length / 1024)}KB</p>
            </div>
          )}

          {/* 视频预览 */}
          {video && (
            <div className="relative bg-gray-50 rounded-lg p-2">
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full text-sm hover:bg-red-600 z-10"
              >
                ✕
              </button>
              <video src={video} controls className="rounded max-h-64 mx-auto" />
              <p className="text-xs text-gray-500 text-center mt-1 inline-flex items-center justify-center gap-1 w-full"><Video size={12} /> {Math.round(video.length / 1024)}KB</p>
            </div>
          )}

          {/* 录制中提示 */}
          {recording && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-red-600 font-bold">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                {recordingType === 'audio' ? <><Mic size={16} /> 录音</> : <><Video size={16} /> 录视频</>}中 {recordingTime}s / {recordingType === 'audio' ? AUDIO_MAX_SECONDS : VIDEO_MAX_SECONDS}s
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="mt-2 bg-red-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-red-600"
              >
                停止录制
              </button>
            </div>
          )}

          {/* 媒体选择按钮 */}
          {!recording && (
            <div className="grid grid-cols-4 gap-2">
              <label className={`flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition ${
                video || images.length >= MAX_IMAGES
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}>
                <Camera size={22} />
                <span className="text-[11px] mt-1">拍照</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={!!video || images.length >= MAX_IMAGES}
                />
              </label>

              <label className={`flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition ${
                video || images.length >= MAX_IMAGES
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
              }`}>
                <Package size={22} />
                <span className="text-[11px] mt-1">相册 {images.length}/{MAX_IMAGES}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={!!video || images.length >= MAX_IMAGES}
                />
              </label>

              <button
                type="button"
                onClick={startAudioRecording}
                disabled={!!video || !!audio}
                className={`flex flex-col items-center justify-center py-3 rounded-lg transition ${
                  video || audio
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-50 hover:bg-green-100 text-green-700'
                }`}
              >
                <Mic size={24} />
                <span className="text-xs mt-1 inline-flex items-center gap-1">{audio ? <><Check size={12} /> 已录</> : '录音(1分钟)'}</span>
              </button>

              <button
                type="button"
                onClick={() => startVideoRecording(0)}
                disabled={images.length > 0 || !!audio || !!video}
                className={`flex flex-col items-center justify-center py-3 rounded-lg transition ${
                  images.length > 0 || audio || video
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-50 hover:bg-red-100 text-red-700'
                }`}
              >
                <Video size={22} />
                <span className="text-[11px] mt-1 inline-flex items-center gap-1">{video ? <><Check size={12} /> 已录</> : `视频(${VIDEO_MAX_SECONDS}s)`}</span>
              </button>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p className="inline-flex items-center gap-1.5"><Lightbulb size={12} /> 图片最多 {MAX_IMAGES} 张，视频和图片二选一，录音可与图片同时</p>
            {totalSize > 0 && (
              <p>当前合计：{Math.round(totalSize / 1024)}KB（{[images.length > 0 ? `${images.length}图` : null, audio ? '录音' : null, video ? '视频' : null].filter(Boolean).join(' + ')}）</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || recording}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? '提交中...' : (<><Check size={18} /> 提交打卡</>)}
          </button>

          <p className="text-xs text-gray-500 text-center inline-flex items-center justify-center gap-1.5 w-full"><Lightbulb size={12} /> 每人每天只能打卡一次</p>
        </form>
      </div>
    </div>
  );
}
