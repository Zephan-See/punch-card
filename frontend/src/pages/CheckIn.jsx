import { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Camera, Mic, Video, Check, Lightbulb, Package, Music } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';

const VIDEO_MAX_SECONDS = 10;
const AUDIO_MAX_SECONDS = 60;
const MAX_IMAGES = 3;
// 每个媒体独立存一格（Google Sheets 单元格上限 ~50K 字符）
const CELL_MAX_CHARS = 48000;
const CELL_WARN_CHARS = 40000;

const VIDEO_CONFIGS = [
  { width: 320, height: 320, videoBPS: 250000, audioBPS: 32000 },
  { width: 240, height: 240, videoBPS: 150000, audioBPS: 24000 },
  { width: 160, height: 160, videoBPS: 80000, audioBPS: 16000 }
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

  // 上传图片（最多 3 张，与视频互斥）
  const handleImageSelect = (e) => {
    if (video) return alert('请先移除视频，图片和视频只能选一种');
    if (images.length >= MAX_IMAGES) return alert(`最多 ${MAX_IMAGES} 张图片`);

    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert('图片不能超过 10MB');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 根据已有图片数量动态调整大小（3 张时压更小）
        const maxDim = images.length === 0 ? 800 : (images.length === 1 ? 600 : 480);
        const quality = images.length === 0 ? 0.75 : 0.65;

        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', quality);

        setImages(prev => [...prev, base64]);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

    // 检查每个独立单元格大小
    const checks = [
      { name: '第1张图', data: images[0] },
      { name: '第2张图', data: images[1] },
      { name: '第3张图', data: images[2] },
      { name: '录音', data: audio },
      { name: '视频', data: video }
    ];
    for (const c of checks) {
      if (c.data && c.data.length > CELL_MAX_CHARS) {
        return alert(`❌ ${c.name} ${Math.round(c.data.length/1024)}KB 超过单元格上限（${Math.round(CELL_MAX_CHARS/1024)}KB）`);
      }
    }

    // 每个媒体存到独立字段
    const mediaFields = {
      image_1: images[0] || '',
      image_2: images[1] || '',
      image_3: images[2] || '',
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

          {/* 图片预览（最多 3 张） */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
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
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition ${
                video || images.length >= MAX_IMAGES
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}>
                <Camera size={24} />
                <span className="text-xs mt-1">图片 {images.length}/{MAX_IMAGES}</span>
                <input
                  type="file"
                  accept="image/*"
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
                <Video size={24} />
                <span className="text-xs mt-1 inline-flex items-center gap-1">{video ? <><Check size={12} /> 已录</> : '视频(10s)'}</span>
              </button>
            </div>
          )}

          {/* 提示规则 + 各项大小 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p className="inline-flex items-center gap-1.5"><Lightbulb size={12} /> 图片（1-3 张）和视频二选一，录音可与图片同时存在</p>
            <p className="inline-flex items-center gap-1.5"><Package size={12} /> 每项媒体独立存储，单项上限 {Math.round(CELL_MAX_CHARS/1024)}KB</p>
            {totalSize > 0 && (
              <p>当前媒体合计：{Math.round(totalSize / 1024)}KB（{[images.length > 0 ? `${images.length}图` : null, audio ? '录音' : null, video ? '视频' : null].filter(Boolean).join(' + ')}）</p>
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
