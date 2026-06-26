import { useState, useEffect } from 'react';
import { Pencil, Heart, Target, Image as ImageIcon } from 'lucide-react';

const KEY = 'onboarded_v1';

const SLIDES = [
  {
    title: '每日打卡',
    desc: '一日一卡，文字、图片、语音、视频都行。',
    Icon: Pencil,
    color: 'from-indigo-500 to-purple-500'
  },
  {
    title: '同伴鼓励',
    desc: '看见别人坚持，留下一句鼓励。被点赞和留言会让坚持更轻松。',
    Icon: Heart,
    color: 'from-pink-500 to-rose-500'
  },
  {
    title: '设定目标',
    desc: '比如「写满 100 篇日记」或「学 30 天英语」。看着进度条慢慢长。',
    Icon: Target,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    title: '生成海报',
    desc: '在自己的打卡墙长按「海报」，一键生成精美图片，分享到 WhatsApp。',
    Icon: ImageIcon,
    color: 'from-orange-500 to-amber-500'
  }
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const finish = () => {
    localStorage.setItem(KEY, '1');
    setShow(false);
  };

  const s = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const { Icon } = s;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-br ${s.color} p-10 flex items-center justify-center`}>
          <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <Icon size={48} className="text-white" strokeWidth={2.2} />
          </div>
        </div>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{s.title}</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">{s.desc}</p>

          {/* dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium"
              >
                上一步
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : setStep(step + 1)}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              {isLast ? '开始打卡' : '下一步'}
            </button>
          </div>

          <button
            onClick={finish}
            className="w-full mt-3 text-xs text-gray-400"
          >
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}
