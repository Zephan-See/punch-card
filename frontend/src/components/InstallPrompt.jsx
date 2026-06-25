import { useEffect, useState } from 'react';
import { Download, Share, X, ExternalLink } from 'lucide-react';

const DISMISS_KEY = 'install_prompt_dismissed_at';
const DISMISS_DAYS = 7;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isInStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isInWhatsApp() {
  return /WhatsApp/i.test(navigator.userAgent);
}
function isInWebView() {
  // Crude in-app browser detection (FB, IG, WhatsApp, Line, WeChat etc.)
  return /(FBAN|FBAV|Instagram|Line|MicroMessenger|WhatsApp|TikTok)/i.test(navigator.userAgent);
}
function wasRecentlyDismissed() {
  const at = +localStorage.getItem(DISMISS_KEY) || 0;
  return Date.now() - at < DISMISS_DAYS * 86400_000;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [variant, setVariant] = useState(null); // 'chrome' | 'ios' | 'inapp' | null
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed());

  useEffect(() => {
    if (isInStandalone() || dismissed) return;

    if (isInWebView()) {
      setVariant('inapp');
      return;
    }
    if (isIOS()) {
      setVariant('ios');
      return;
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVariant('chrome');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVariant(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setVariant(null);
  };

  if (!variant) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto bg-white border border-indigo-100 rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-[slide-up_0.3s_ease-out]">
      <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {variant === 'chrome' && (
          <>
            <p className="font-semibold text-sm text-gray-900">添加到主屏幕</p>
            <p className="text-xs text-gray-500">一键安装，下次直接打开</p>
          </>
        )}
        {variant === 'ios' && (
          <>
            <p className="font-semibold text-sm text-gray-900">添加到主屏幕</p>
            <p className="text-xs text-gray-500 inline-flex items-center gap-1">
              点 <Share size={12} /> → "添加到主屏幕"
            </p>
          </>
        )}
        {variant === 'inapp' && (
          <>
            <p className="font-semibold text-sm text-gray-900">用 Safari/Chrome 打开</p>
            <p className="text-xs text-gray-500">才能装到桌面、收到通知</p>
          </>
        )}
      </div>
      {variant === 'chrome' && (
        <button onClick={handleInstall} className="bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1.5 flex-shrink-0">
          <Download size={14} /> 安装
        </button>
      )}
      {variant === 'inapp' && (
        <a
          href={typeof window !== 'undefined' ? window.location.href : '#'}
          target="_blank"
          rel="noreferrer"
          className="bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1.5 flex-shrink-0"
        >
          <ExternalLink size={14} /> 打开
        </a>
      )}
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0" aria-label="关闭">
        <X size={16} />
      </button>
    </div>
  );
}
