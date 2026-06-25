import { forwardRef } from 'react';
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

  return (
    <div
      ref={ref}
      style={{ width: 540, height: 960 }}
      className="relative bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 overflow-hidden"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-white/10 rounded-full" />

      <div className="absolute inset-5 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header: avatar + name + signature */}
        <div className="px-7 pt-7 flex items-center gap-4">
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
        <div className="mx-7 mt-5 flex items-end gap-3 pb-4 border-b border-gray-100">
          <p className="text-5xl font-bold text-gray-900 leading-none tracking-tight">{d.big}</p>
          <div className="pb-1">
            <p className="text-xs text-indigo-500 tracking-widest font-medium">DAILY CHECK</p>
            <p className="text-sm text-gray-500">{d.year} · {d.weekday}</p>
          </div>
        </div>

        {/* Content — big quote mark watermark + the checkin text */}
        <div className="flex-1 px-7 pt-5 relative">
          <div
            className="absolute top-0 left-4 text-[180px] leading-none text-indigo-100 font-serif select-none pointer-events-none"
            style={{ fontFamily: 'Georgia, "Songti SC", serif' }}
          >
            「
          </div>
          <p className="relative text-xl text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words pt-8 px-2">
            {checkin.content}
          </p>
          <div
            className="absolute bottom-0 right-4 text-[180px] leading-none text-indigo-100 font-serif select-none pointer-events-none"
            style={{ fontFamily: 'Georgia, "Songti SC", serif' }}
          >
            」
          </div>
        </div>

        {/* Bottom: mascot + daily quote */}
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 border border-indigo-100/60">
            <img src={sticker} alt="" style={{ width: 88, height: 88 }} className="object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-indigo-500 tracking-widest font-medium mb-1">今日金句</p>
              <p className="text-base text-gray-800 leading-snug">{text}</p>
              <p className="text-xs text-gray-400 mt-1">— {source}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
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
