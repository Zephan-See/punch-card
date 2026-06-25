import { forwardRef } from 'react';
import { pickDaily } from '../quotes';

const formatDate = (iso) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
};

const Poster = forwardRef(function Poster({ checkin }, ref) {
  const { text, source, sticker } = pickDaily(new Date(checkin.created_at));
  return (
    <div
      ref={ref}
      style={{ width: 540, height: 960 }}
      className="relative bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white overflow-hidden"
    >
      <div className="absolute inset-6 bg-white/95 rounded-3xl shadow-2xl flex flex-col">
        <div className="px-8 pt-10">
          <p className="text-sm text-indigo-500 font-medium tracking-widest">DAILY CHECK · 今日打卡</p>
          <p className="text-4xl font-bold text-gray-900 mt-3">{formatDate(checkin.created_at)}</p>
          <div className="mt-6 text-base text-gray-500">@ {checkin.name}</div>
        </div>

        <div className="flex-1 px-8 pt-6">
          <p className="text-2xl text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words">
            {checkin.content}
          </p>
        </div>

        <div className="px-6 pb-6 mt-4">
          <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-pink-50 rounded-2xl p-4">
            <img src={sticker} alt="" style={{ width: 88, height: 88 }} className="object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-base text-gray-800 leading-snug">{text}</p>
              <p className="text-xs text-gray-400 mt-1.5">— {source}</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4 tracking-wide">100 人 100 天打卡 · 与你同行</p>
        </div>
      </div>
    </div>
  );
});

export default Poster;
