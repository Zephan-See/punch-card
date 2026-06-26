// Supabase implementation of the same `api` interface as api.js (Apps Script).
// To switch: rename api.js -> api.apps-script.js and rename this file to api.js
// (or alias via vite config). Same exported `api` object shape.
//
// All checkin queries return objects with name/avatar_url/signature merged from
// profiles, so the existing UI (CheckinCard, Wall, Feed) works unchanged.

import { supabase } from './supabase';

// Convert base64 data URL → File for Storage upload
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function uploadMedia(userId, file, prefix) {
  const ext = (file.type.split('/')[1] || 'bin').split(';')[0];
  const path = `${userId}/${Date.now()}-${prefix}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

async function uploadIfDataUrl(userId, value, prefix) {
  if (!value || !value.startsWith?.('data:')) return value || '';
  const blob = dataUrlToBlob(value);
  return uploadMedia(userId, blob, prefix);
}

// Use the locally cached session — no network round-trip, no JWT-verify
// failures on flaky mobile networks. getSession() reads from localStorage.
async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}

// Map a feed_v row to the legacy shape used by UI components.
function mapCheckin(row) {
  const imagesArr = Array.isArray(row.images) && row.images.length
    ? row.images
    : [row.image_1, row.image_2, row.image_3].filter(Boolean);
  return {
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    checked_date: row.checked_date,
    like_count: row.like_count || 0,
    comment_count: row.comment_count || 0,
    is_liked: !!row.is_liked,
    name: row.name || '',
    avatar_url: row.avatar_url || '',
    signature: row.signature || '',
    images: imagesArr,
    image_1: imagesArr[0] || '',
    image_2: imagesArr[1] || '',
    image_3: imagesArr[2] || '',
    audio_url: row.audio_url || '',
    video_url: row.video_url || '',
    hidden_at: row.hidden_at || null
  };
}

// Read checkins from the pre-joined feed_v view. One row per checkin,
// is_liked + comment_count already computed by Postgres for the caller.
async function fetchCheckinsBase(filterFn) {
  let q = supabase.from('feed_v').select('*').order('created_at', { ascending: false });
  q = filterFn(q);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapCheckin);
}

export const api = {
  // ===== auth =====
  register: async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name } }
    });
    if (error) return { error: error.message };
    return { id: data.user?.id, token: data.session?.access_token || 'pending-email-confirm' };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { id: data.user.id, token: data.session.access_token };
  },

  sendPasswordReset: async (email) => {
    const redirectTo = `${window.location.origin}/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { error: error.message };
    return { ok: true };
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { ok: true };
  },

  // ===== profile =====
  getProfile: async () => {
    const uid = await currentUserId();
    if (!uid) return { error: '未登录' };
    // maybeSingle: returns null cleanly if no row, no row-count error
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) { console.error('getProfile error:', error); return { error: error.message }; }
    if (!data) {
      // Profile row missing — recover by creating one from auth metadata.
      const { data: sess } = await supabase.auth.getSession();
      const u = sess.session?.user;
      const fallback = {
        id: uid,
        name: u?.user_metadata?.name || u?.email?.split('@')[0] || '用户',
        avatar_url: '',
        signature: '',
        wall_public: true,
        is_admin: false
      };
      await supabase.from('profiles').insert(fallback).select().maybeSingle();
      return fallback;
    }
    return data;
  },

  updateProfile: async (_token, updates) => {
    const uid = await currentUserId();
    if (!uid) return { error: '未登录' };
    const patch = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.signature !== undefined) patch.signature = updates.signature;
    if (updates.wall_public !== undefined) patch.wall_public = updates.wall_public;
    if (updates.avatar_url !== undefined) {
      patch.avatar_url = await uploadIfDataUrl(uid, updates.avatar_url, 'avatar');
    }
    const { error } = await supabase.from('profiles').update(patch).eq('id', uid);
    if (error) return { error: error.message };
    return { ok: true };
  },

  // ===== checkin =====
  checkIn: async (_token, content, media = {}) => {
    const uid = await currentUserId();
    if (!uid) return { error: '未登录' };
    // Pin to Malaysia timezone so a 1 AM (UTC+8) checkin doesn't land on yesterday's UTC date
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    // Accept either an `images` array or legacy image_1/2/3 props
    const inputImages = Array.isArray(media.images)
      ? media.images
      : [media.image_1, media.image_2, media.image_3].filter(Boolean);

    // Upload all in parallel
    const uploadedImages = await Promise.all(
      inputImages.map((img, i) => uploadIfDataUrl(uid, img, 'img' + (i + 1)))
    );
    const imagesArr = uploadedImages.filter(Boolean);

    const row = {
      user_id: uid,
      content,
      checked_date: today,
      images: imagesArr,
      // legacy mirror for any consumer that still reads image_1/2/3
      image_1: imagesArr[0] || '',
      image_2: imagesArr[1] || '',
      image_3: imagesArr[2] || '',
      audio_url: await uploadIfDataUrl(uid, media.audio_url, 'audio'),
      video_url: await uploadIfDataUrl(uid, media.video_url, 'video')
    };
    const { data, error } = await supabase.from('checkins').insert(row).select().single();
    if (error) {
      if (error.code === '23505') return { error: '今天已打卡' };
      if (/row-level security/i.test(error.message)) return { error: '你的账号已被冻结，无法发布打卡。请联系管理员' };
      return { error: error.message };
    }
    return { id: data.id };
  },

  getMyCheckins: async () => {
    const uid = await currentUserId();
    if (!uid) return [];
    return fetchCheckinsBase(q => q.eq('user_id', uid));
  },

  getWall: async (userId) => {
    return fetchCheckinsBase(q => q.eq('user_id', userId));
  },

  getFeed: async () => {
    // RLS limits to checkins from wall_public profiles (or self)
    return (await fetchCheckinsBase(q => q.limit(50)));
  },

  // ===== social =====
  like: async (_token, checkinId) => {
    const uid = await currentUserId();
    const { error } = await supabase.from('likes').insert({ user_id: uid, checkin_id: checkinId });
    if (error) return { error: error.code === '23505' ? '已点赞' : error.message };
    return { ok: true };
  },

  unlike: async (_token, checkinId) => {
    const uid = await currentUserId();
    const { error } = await supabase.from('likes').delete().match({ user_id: uid, checkin_id: checkinId });
    if (error) return { error: error.message };
    return { ok: true };
  },

  addComment: async (_token, checkinId, content) => {
    const uid = await currentUserId();
    const { data, error } = await supabase.from('comments')
      .insert({ user_id: uid, checkin_id: checkinId, content }).select().single();
    if (error) return { error: error.message };
    return { id: data.id };
  },

  getComments: async (checkinId) => {
    // comments.user_id references auth.users, not profiles, so PostgREST
    // can't auto-join. Do two queries and merge in JS.
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at')
      .eq('checkin_id', checkinId)
      .order('created_at');
    if (error) { console.error('getComments error:', error); return []; }
    if (!comments?.length) return [];

    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds);
    const map = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    return comments.map(c => ({
      id: c.id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      name: map[c.user_id]?.name || '',
      avatar_url: map[c.user_id]?.avatar_url || ''
    }));
  },

  deleteComment: async (_token, commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) return { error: error.message };
    return { ok: true };
  },

  // ===== goals =====
  getGoals: async ({ activeOnly = false } = {}) => {
    const uid = await currentUserId();
    if (!uid) return [];
    let q = supabase.from('goals').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (activeOnly) q = q.eq('active', true);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  },

  createGoal: async ({ title, description = '', target_days = 100 }) => {
    const uid = await currentUserId();
    if (!uid) return { error: '未登录' };
    if (!title?.trim()) return { error: '标题不能为空' };
    const { data, error } = await supabase
      .from('goals')
      .insert({ user_id: uid, title: title.trim(), description: description.trim(), target_days, active: true })
      .select().single();
    if (error) return { error: error.message };
    return data;
  },

  updateGoal: async (id, patch) => {
    const { error } = await supabase.from('goals').update(patch).eq('id', id);
    if (error) return { error: error.message };
    return { ok: true };
  },

  deleteGoal: async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) return { error: error.message };
    return { ok: true };
  },

  // Current user's total unique checkin days (used as goal progress).
  getMyTotalDays: async () => {
    const uid = await currentUserId();
    if (!uid) return 0;
    const { data } = await supabase.from('leaderboard_v').select('total_days').eq('id', uid).single();
    return data?.total_days || 0;
  },

  // ===== leaderboard / settings =====
  getLeaderboard: async () => {
    const { data, error } = await supabase
      .from('leaderboard_v')
      .select('*')
      .order('total_days', { ascending: false });
    if (error) return [];
    return data || [];
  },

  getSettings: async () => {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) return {};
    return Object.fromEntries((data || []).map(r => [r.key, r.value]));
  },

  // ===== admin =====
  checkAdmin: async () => {
    const uid = await currentUserId();
    if (!uid) return { isAdmin: false };
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', uid).single();
    return { isAdmin: data?.is_admin === true };
  },

  adminStats: async () => {
    const { data, error } = await supabase.rpc('admin_stats');
    if (error) return { error: error.message };
    return data;
  },

  adminUsers: async () => {
    const { data, error } = await supabase.from('leaderboard_v').select('*');
    if (error) return [];
    // get email + is_admin + frozen via separate query (leaderboard_v doesn't have them)
    const { data: extra } = await supabase.from('profiles').select('id, is_admin, frozen, created_at');
    const map = Object.fromEntries((extra || []).map(p => [p.id, p]));
    return (data || []).map(u => ({
      ...u,
      is_admin: map[u.id]?.is_admin || false,
      frozen: map[u.id]?.frozen || false,
      created_at: map[u.id]?.created_at,
      email: ''  // emails live in auth.users; not exposed by RLS — skip for now
    }));
  },

  adminToggleFreeze: async (_token, userId, frozen) => {
    const { error } = await supabase.from('profiles').update({ frozen }).eq('id', userId);
    if (error) return { error: error.message };
    logAudit(frozen ? 'freeze_user' : 'unfreeze_user', 'user', userId);
    return { ok: true };
  },

  adminAllCheckins: async () => {
    return fetchCheckinsBase(q => q.limit(500));
  },

  adminDeleteUser: async (_token, userId) => {
    // Deleting from auth.users cascades. But anon key can't do that.
    // For now: just clear their content; full account deletion needs Edge Function with service role.
    await supabase.from('checkins').delete().eq('user_id', userId);
    await supabase.from('comments').delete().eq('user_id', userId);
    await supabase.from('likes').delete().eq('user_id', userId);
    logAudit('delete_user', 'user', userId);
    return { ok: true, note: '用户内容已清除。彻底删除账户需要 Edge Function（使用 service role key）' };
  },

  adminDeleteCheckin: async (_token, checkinId) => {
    const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
    if (error) return { error: error.message };
    logAudit('delete_checkin', 'checkin', checkinId);
    return { ok: true };
  },

  reportCheckin: async (_token, checkinId, reason) => {
    const uid = await currentUserId();
    if (!uid) return { error: '未登录' };
    const { error } = await supabase.from('reports').insert({
      checkin_id: checkinId,
      reporter_id: uid,
      reason: (reason || '').slice(0, 500)
    });
    if (error) return { error: error.message };
    return { ok: true };
  },

  adminGetReports: async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('id, checkin_id, reporter_id, reason, status, created_at, checkins(id, user_id, content, hidden_at)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    const ids = [...new Set((data || []).map(r => r.reporter_id).filter(Boolean))];
    let nameMap = {};
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, name').in('id', ids);
      nameMap = Object.fromEntries((ps || []).map(p => [p.id, p.name]));
    }
    return (data || []).map(r => ({ ...r, reporter_name: nameMap[r.reporter_id] || '未知' }));
  },

  adminResolveReport: async (_token, reportId) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', reportId);
    if (error) return { error: error.message };
    logAudit('resolve_report', 'report', reportId);
    return { ok: true };
  },

  adminToggleHideCheckin: async (_token, checkinId, hide) => {
    const { error } = await supabase
      .from('checkins')
      .update({ hidden_at: hide ? new Date().toISOString() : null })
      .eq('id', checkinId);
    if (error) return { error: error.message };
    logAudit(hide ? 'hide_checkin' : 'unhide_checkin', 'checkin', checkinId);
    return { ok: true };
  },

  adminUpdateSettings: async (_token, updates) => {
    const rows = Object.entries(updates)
      .filter(([k]) => k !== 'action' && k !== 'token')
      .map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('settings').upsert(rows);
    if (error) return { error: error.message };
    logAudit('update_settings', 'settings', '-', updates);
    return { ok: true };
  },

  adminGetAuditLog: async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { console.error(error); return []; }
    const ids = [...new Set((data || []).map(r => r.actor_id).filter(Boolean))];
    let nameMap = {};
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, name').in('id', ids);
      nameMap = Object.fromEntries((ps || []).map(p => [p.id, p.name]));
    }
    return (data || []).map(r => ({ ...r, actor_name: nameMap[r.actor_id] || '未知' }));
  }
};

// Fire-and-forget audit log writer. Failures don't block the action that
// triggered them — admin work has already succeeded by the time we log it.
async function logAudit(action, targetType, targetId, metadata = {}) {
  try {
    const uid = await currentUserId();
    if (!uid) return;
    await supabase.from('audit_log').insert({
      actor_id: uid,
      action,
      target_type: targetType,
      target_id: String(targetId),
      metadata
    });
  } catch (e) {
    console.warn('audit log failed', e);
  }
}
