import { useEffect, useState, useContext, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { api } from '../api';

const PERM_PROMPTED_KEY = 'notif_perm_prompted';
const SETTINGS_KEY = 'notif_settings';
const SEEN_COUNTS_KEY = 'notif_seen_counts';     // { [checkinId]: { likes, comments } }
const SEEN_STREAKS_KEY = 'notif_seen_streaks';   // [7, 30, 100]

const POLL_MS = 5 * 60_000;     // 5 minutes — keeps Apps Script under quota
const MILESTONES = [7, 14, 30, 50, 100];

export const defaultSettings = { enabled: true, dailyTime: '21:00', remindDaily: true, remindLikes: true, remindStreak: true };

export function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return defaultSettings; }
}
export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' });
  } catch (e) { console.warn(e); }
}

function msUntil(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function computeStreak(checkins) {
  if (!checkins?.length) return 0;
  const dates = new Set(checkins.map(c => c.checked_date));
  const today = new Date().toISOString().slice(0, 10);
  let streak = dates.has(today) ? 1 : 0;
  if (!streak) {
    // allow yesterday too
    const y = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    if (!dates.has(y)) return 0;
    streak = 1;
  }
  const cur = new Date(streak === 1 && !dates.has(today) ? Date.now() - 86400_000 : Date.now());
  for (let i = 1; i < 365; i++) {
    cur.setDate(cur.getDate() - 1);
    const k = cur.toISOString().slice(0, 10);
    if (dates.has(k)) streak++; else break;
  }
  return streak;
}

export default function NotificationManager() {
  const { user } = useContext(AuthContext);
  const [showBanner, setShowBanner] = useState(false);
  const dailyTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Permission banner
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default' && !localStorage.getItem(PERM_PROMPTED_KEY)) {
      const t = setTimeout(() => setShowBanner(true), 4000); // show after 4s of usage
      return () => clearTimeout(t);
    }
  }, []);

  const requestPerm = async () => {
    localStorage.setItem(PERM_PROMPTED_KEY, '1');
    setShowBanner(false);
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
  };
  const dismissBanner = () => {
    localStorage.setItem(PERM_PROMPTED_KEY, '1');
    setShowBanner(false);
  };

  // Daily reminder
  useEffect(() => {
    const settings = loadSettings();
    if (!settings.enabled || !settings.remindDaily) return;
    if (Notification.permission !== 'granted') return;

    const tick = () => {
      notify('该打卡了 ✓', '坚持是最浪漫的事。点开继续 100 天挑战。', 'daily');
      dailyTimerRef.current = setTimeout(tick, msUntil(settings.dailyTime));
    };
    dailyTimerRef.current = setTimeout(tick, msUntil(settings.dailyTime));
    return () => clearTimeout(dailyTimerRef.current);
  }, [user]);

  // Poll for likes/comments + streak
  useEffect(() => {
    if (!user?.token) return;
    const settings = loadSettings();
    if (!settings.enabled) return;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return; // only when tab focused
      if (Notification.permission !== 'granted') return;

      try {
        const checkins = await api.getMyCheckins(user.token);

        // Likes / comments diff
        if (settings.remindLikes) {
          const seen = JSON.parse(localStorage.getItem(SEEN_COUNTS_KEY) || '{}');
          const fresh = {};
          let newLikes = 0, newComments = 0;
          for (const c of checkins) {
            const prev = seen[c.id] || { likes: c.like_count || 0, comments: c.comment_count || 0 };
            if ((c.like_count || 0) > prev.likes) newLikes += (c.like_count - prev.likes);
            if ((c.comment_count || 0) > prev.comments) newComments += (c.comment_count - prev.comments);
            fresh[c.id] = { likes: c.like_count || 0, comments: c.comment_count || 0 };
          }
          localStorage.setItem(SEEN_COUNTS_KEY, JSON.stringify(fresh));
          if (newLikes && Object.keys(seen).length) notify('收到新点赞 ♥', `有 ${newLikes} 个人为你点赞`, 'likes');
          if (newComments && Object.keys(seen).length) notify('收到新评论 💬', `有 ${newComments} 条新评论`, 'comments');
        }

        // Streak milestones
        if (settings.remindStreak) {
          const streak = computeStreak(checkins);
          const seen = JSON.parse(localStorage.getItem(SEEN_STREAKS_KEY) || '[]');
          const hit = MILESTONES.find(m => streak >= m && !seen.includes(m));
          if (hit) {
            notify(`连续打卡 ${hit} 天 🎉`, '了不起！截图发朋友圈炫耀一下？', 'streak');
            localStorage.setItem(SEEN_STREAKS_KEY, JSON.stringify([...seen, hit]));
          }
        }
      } catch (e) { /* silent */ }
    };

    poll(); // immediate
    pollTimerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollTimerRef.current);
  }, [user]);

  if (!showBanner) return null;
  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto bg-white border border-indigo-100 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
        <Bell size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">开启通知</p>
        <p className="text-xs text-gray-500">每日提醒、新点赞、连击成就</p>
      </div>
      <button onClick={requestPerm} className="bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-xl flex-shrink-0">开启</button>
      <button onClick={dismissBanner} className="text-gray-400 p-1" aria-label="关闭"><X size={16} /></button>
    </div>
  );
}
