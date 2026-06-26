import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Camera, Mic, Video, Check, Lightbulb, Package, Music } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';
import CameraModal from '../components/CameraModal';
import AudioRecorder from '../components/AudioRecorder';

const VIDEO_MAX_SECONDS = 30;
const AUDIO_MAX_SECONDS = 60;
const MAX_IMAGES = 10;

export default function CheckIn() {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const totalSize = (
    images.reduce((s, img) => s + img.length, 0) +
    (audio?.length || 0) +
    (video?.length || 0)
  );

  // Gallery picker (multi-select existing photos)
  const handleImageSelect = (e) => {
    if (video) { alert('请先移除视频，图片和视频只能选一种'); e.target.value = ''; return; }
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return alert(`最多 ${MAX_IMAGES} 张图片`);

    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) alert(`只能再加 ${remaining} 张，多余的会被忽略`);

    toProcess.forEach(file => {
      if (file.size > 20 * 1024 * 1024) { alert(`${file.name} 超过 20MB，跳过`); return; }
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
          setImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.78)]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const openCamera = () => {
    if (video) return alert('请先移除视频');
    if (audio) return alert('请先移除录音，录音和视频不能同时存在');
    if (images.length >= MAX_IMAGES) return alert(`最多 ${MAX_IMAGES} 张图片`);
    setCameraOpen(true);
  };

  const openAudio = () => {
    if (video) return alert('请先移除视频，录音和视频只能选一种');
    if (audio) return alert('已有录音，先移除才能重录');
    setAudioOpen(true);
  };

  const handleCameraPhoto = (base64) => {
    setImages(prev => prev.length < MAX_IMAGES ? [...prev, base64] : prev);
  };

  const handleCameraVideo = (base64) => {
    if (images.length > 0) { alert('已有图片，请先移除再保存视频'); return; }
    setVideo(base64);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && !audio && !video) {
      alert('请输入打卡内容或添加媒体');
      return;
    }

    setLoading(true);
    try {
      const res = await api.checkIn(user.token, content || '(媒体打卡)', {
        images,
        audio_url: audio || '',
        video_url: video || ''
      });
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

          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square">
                  <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {audio && (
            <div className="relative bg-gray-50 rounded-lg p-3">
              <button
                type="button"
                onClick={() => setAudio(null)}
                className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs hover:bg-red-600 z-10"
              >✕</button>
              <audio src={audio} controls className="w-full" />
              <p className="text-xs text-gray-500 text-center mt-1 inline-flex items-center justify-center gap-1 w-full"><Music size={12} /> {Math.round(audio.length / 1024)}KB</p>
            </div>
          )}

          {video && (
            <div className="relative bg-gray-50 rounded-lg p-2">
              <button
                type="button"
                onClick={() => setVideo(null)}
                className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full text-sm hover:bg-red-600 z-10"
              >✕</button>
              <video src={video} controls playsInline className="rounded max-h-64 mx-auto" />
              <p className="text-xs text-gray-500 text-center mt-1 inline-flex items-center justify-center gap-1 w-full"><Video size={12} /> {Math.round(video.length / 1024)}KB</p>
            </div>
          )}

          {/* Media buttons: 相机(tap=photo, hold=video) · 相册 · 录音 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={openCamera}
              disabled={!!video || !!audio || images.length >= MAX_IMAGES}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition ${
                video || audio || images.length >= MAX_IMAGES
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}
            >
              <Camera size={22} />
              <span className="text-[11px] mt-1">相机</span>
            </button>

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
              onClick={openAudio}
              disabled={!!video || !!audio}
              className={`flex flex-col items-center justify-center py-3 rounded-lg transition ${
                video || audio
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
            >
              <Mic size={22} />
              <span className="text-[11px] mt-1 inline-flex items-center gap-1">{audio ? <><Check size={12}/> 已录</> : `录音(${AUDIO_MAX_SECONDS}s)`}</span>
            </button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p className="inline-flex items-center gap-1.5"><Lightbulb size={12} /> 相机：点击拍照，长按录像 · 最多 {MAX_IMAGES} 张图片 · 视频/录音与图片互斥</p>
            {totalSize > 0 && (
              <p>当前合计：{Math.round(totalSize / 1024)}KB（{[images.length > 0 ? `${images.length}图` : null, audio ? '录音' : null, video ? '视频' : null].filter(Boolean).join(' + ')}）</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? '提交中...' : (<><Check size={18} /> 提交打卡</>)}
          </button>

          <p className="text-xs text-gray-500 text-center inline-flex items-center justify-center gap-1.5 w-full"><Lightbulb size={12} /> 每人每天只能打卡一次</p>
        </form>
      </div>

      {cameraOpen && (
        <CameraModal
          onPhoto={handleCameraPhoto}
          onVideo={handleCameraVideo}
          onClose={() => setCameraOpen(false)}
          maxVideoSeconds={VIDEO_MAX_SECONDS}
        />
      )}
      {audioOpen && (
        <AudioRecorder
          onConfirm={setAudio}
          onClose={() => setAudioOpen(false)}
          maxSeconds={AUDIO_MAX_SECONDS}
        />
      )}
    </div>
  );
}
