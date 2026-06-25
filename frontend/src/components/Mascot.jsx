import { useMemo } from 'react';
import { pickDaily } from '../quotes';

export default function Mascot() {
  const { text, source, sticker } = useMemo(() => pickDaily(), []);
  return (
    <div className="flex items-center gap-3 mb-4">
      <img
        src={sticker}
        alt=""
        className="w-28 h-28 object-contain flex-shrink-0 drop-shadow-md"
      />
      <div className="relative flex-1 bg-white rounded-2xl px-4 py-3 shadow-md">
        {/* tail pointing left toward the sticker */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-r-[10px] border-r-white" />
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{text.replace(/([，；])/g, '$1\n')}</p>
        <p className="text-xs text-gray-400 mt-1.5">— {source}</p>
      </div>
    </div>
  );
}
