import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { pickDaily } from '../quotes';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const HASHTAG = '#100人100天打卡';

const formatDate = (iso) => {
  const d = new Date(iso);
  return {
    big: `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
    year: d.getFullYear(),
    weekday: '星期' + WEEKDAYS[d.getDay()]
  };
};

const initial = (name) => (name || '?').trim().charAt(0);

const Poster = forwardRef(function Poster({ checkin }, ref) {
  const { text, source, sticker } = pickDaily(new Date(checkin.created_at));
  const d = formatDate(checkin.created_at);

  const images = [checkin.image_1, checkin.image_2, checkin.image_3].filter(Boolean);
  const hasAudio = !!checkin.audio_url;
  const hasVideo = !!checkin.video_url;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/login?ref=${checkin.user_id || ''}`
    : 'https://example.com';

  return (
    <div
      ref={ref}
      style={{ width: 540, height: 675 }}
      className="relative bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 overflow-hidden"
    >
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full" />
      <div className="absolute -bottom-20 -left-12 w-56 h-56 bg-white/10 rounded-full" />

      <div className="absolute inset-4 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 flex items-center gap-3">
          {checkin.avatar_url ? (
            <img src={checkin.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold ring-2 ring-indigo-100">
              {initial(checkin.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{checkin.name || '打卡达人'}</p>
            {checkin.signature && <p className="text-xs text-gray-500 truncate">{checkin.signature}</p>}
          </div>
        </div>

        {/* Date + hashtag */}
        <div className="mx-6 mt-3 pb-3 border-b border-gray-100">
          <div className="flex items-end gap-3">
            <p className="text-5xl font-bold text-gray-900 leading-none tracking-tight">{d.big}</p>
            <div className="pb-1">
              <p className="text-[10px] text-indigo-500 tracking-widest font-medium">DAILY CHECK</p>
              <p className="text-xs text-gray-500">{d.year} · {d.weekday}</p>
            </div>
          </div>
          <p className="mt-2 text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {HASHTAG}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pt-3 relative flex flex-col min-h-0 overflow-hidden">
          {images.length > 0 ? (
            <>
              <div className={`grid gap-1.5 mb-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className={`w-full rounded-xl object-cover ${images.length === 1 ? 'max-h-44' : 'aspect-square'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words flex-1 overflow-hidden">
                {checkin.content}
              </p>
            </>
          ) : (
            <p className="text-base text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words flex-1">
              {checkin.content}
            </p>
          )}

          {(hasAudio || hasVideo) && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {hasAudio && (
                <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-sm font-semibold px-3 py-1.5 rounded-full border border-purple-200 whitespace-nowrap">
                  🎙️ 语音打卡
                </span>
              )}
              {hasVideo && (
                <span className="inline-flex items-center gap-1.5 bg-pink-50 text-pink-700 text-sm font-semibold px-3 py-1.5 rounded-full border border-pink-200 whitespace-nowrap">
                  🎬 视频打卡
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom: BIG mascot + quote + QR */}
        <div className="px-4 pb-4">
          <div className="flex items-stretch gap-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-3 border border-indigo-100/60">
            <img src={sticker} alt="" style={{ width: 160, height: 160 }} className="object-contain flex-shrink-0 -my-2" />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-xs text-indigo-500 tracking-widest font-medium mb-1">今日金句</p>
              <p className="text-base text-gray-900 leading-snug font-medium">{text}</p>
              <p className="text-xs text-gray-400 mt-1">— {source}</p>
            </div>
            <div className="flex flex-col items-center justify-center bg-white rounded-xl p-1.5 border border-gray-200 self-center">
              <QRCodeSVG value={inviteUrl} size={72} level="M" includeMargin={false} />
              <p className="text-[10px] text-gray-600 mt-0.5 leading-tight font-medium">扫码加入</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Poster;
