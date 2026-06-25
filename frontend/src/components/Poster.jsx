import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { pickDaily } from '../quotes';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

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
      style={{ width: 540, height: 960 }}
      className="relative bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-white/10 rounded-full" />

      <div className="absolute inset-5 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-6 flex items-center gap-4">
          {checkin.avatar_url ? (
            <img src={checkin.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-100" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold ring-2 ring-indigo-100">
              {initial(checkin.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-gray-900 truncate">{checkin.name || '打卡达人'}</p>
            {checkin.signature && <p className="text-sm text-gray-500 truncate">{checkin.signature}</p>}
          </div>
        </div>

        {/* Date bar */}
        <div className="mx-7 mt-4 flex items-end gap-3 pb-3 border-b border-gray-100">
          <p className="text-5xl font-bold text-gray-900 leading-none tracking-tight">{d.big}</p>
          <div className="pb-1">
            <p className="text-xs text-indigo-500 tracking-widest font-medium">DAILY CHECK</p>
            <p className="text-sm text-gray-500">{d.year} · {d.weekday}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-7 pt-4 relative flex flex-col min-h-0">
          {images.length > 0 ? (
            // Media-rich layout: image grid on top, text below
            <>
              <div className={`grid gap-1.5 mb-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className={`w-full rounded-xl object-cover ${images.length === 1 ? 'max-h-72' : 'aspect-square'}`}
                  />
                ))}
              </div>
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap break-words flex-1 overflow-hidden">
                {checkin.content}
              </p>
            </>
          ) : (
            // Text-only: big decorative quote marks
            <>
              <div
                className="absolute top-0 left-4 text-[160px] leading-none text-indigo-100 font-serif select-none pointer-events-none"
                style={{ fontFamily: 'Georgia, "Songti SC", serif' }}
              >「</div>
              <p className="relative text-xl text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words pt-8 px-2">
                {checkin.content}
              </p>
              <div
                className="absolute bottom-2 right-4 text-[160px] leading-none text-indigo-100 font-serif select-none pointer-events-none"
                style={{ fontFamily: 'Georgia, "Songti SC", serif' }}
              >」</div>
            </>
          )}

          {/* Media badges */}
          {(hasAudio || hasVideo) && (
            <div className="flex gap-2 mt-2 relative">
              {hasAudio && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-100">
                  🎙️ 语音打卡
                </span>
              )}
              {hasVideo && (
                <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-600 text-xs font-medium px-2.5 py-1 rounded-full border border-pink-100">
                  🎬 视频打卡
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom: mascot + quote + QR */}
        <div className="px-5 pb-5">
          <div className="flex items-stretch gap-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-3 border border-indigo-100/60">
            <img src={sticker} alt="" style={{ width: 72, height: 72 }} className="object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-[10px] text-indigo-500 tracking-widest font-medium mb-0.5">今日金句</p>
              <p className="text-sm text-gray-800 leading-snug">{text}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">— {source}</p>
            </div>
            <div className="flex flex-col items-center justify-center bg-white rounded-xl p-1.5 border border-gray-200">
              <QRCodeSVG value={inviteUrl} size={64} level="M" includeMargin={false} />
              <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">扫码加入</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-8 bg-gray-300" />
            <p className="text-xs text-gray-500 tracking-wide">100 人 · 100 天 · 与你同行</p>
            <div className="h-px w-8 bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default Poster;
