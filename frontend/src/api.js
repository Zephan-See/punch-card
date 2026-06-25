// Supabase implementation of the same `api` interface as api.js (Apps Script).
// To switch: rename api.js -> api.apps-script.js and rename this file to api.js
// (or alias via vite config). Same exported `api` object shape.
//
// All checkin queries return objects with name/avatar_url/signature merged from
// profiles, so the existing UI (CheckinCard, Wall, Feed) works unchanged.

import { supabase } from './supabase';

const PROFILE_FIELDS = 'id, name, avatar_url, signature, wall_public';

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

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

// Map a raw checkin row + profile fields to the legacy shape
function mapCheckin(row) {
  const p = row.profiles || {};
  // Prefer new images[] column; fall back to legacy image_1/2/3
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
    comment_count: row.comments?.[0]?.count || 0,
    is_liked: (row.likes && row.likes.length > 0) || false,
    name: p.name || '',
    avatar_url: p.avatar_url || '',
    signature: p.signature || '',
    images: imagesArr,
    // Legacy fields kept so existing UI code (CheckinCard, Poster) still works
    image_1: imagesArr[0] || '',
    image_2: imagesArr[1] || '',
    image_3: imagesArr[2] || '',
    audio_url: row.audio_url || '',
    video_url: row.video_url || ''
  };
}

async function fetchCheckinsBase(filterFn) {
  const me = await currentUserId();
  let q = supabase
    .from('checkins')
    .select(`
      *,
      profiles!checkins_user_id_fkey ( ${PROFILE_FIELDS} ),
      likes!left ( user_id ),
      comments ( count )
    `)
    .order('created_at', { ascending: false });
  q = filterFn(q);
  const { data, error } = await q;
  if (error) throw error;
  // RLS already filters by wall_public; we filter `likes` to current user
  return (data || []).map(row => {
    row.likes = (row.likes || []).filter(l => l.user_id === me);
    return mapCheckin(row);
  });
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

  // ===== profile =====
  getProfile: async () => {
    const uid = await currentUserId();
    if (!uid) return { error: '未登录' };
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (error) return { error: error.message };
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
    const today = new Date().toISOString().slice(0, 10);

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
    if (error) return { error: error.code === '23505' ? '今天已打卡' : error.message };
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
    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, profiles!comments_user_id_fkey(name, avatar_url)')
      .eq('checkin_id', checkinId)
      .order('created_at');
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at,
      name: c.profiles?.name || '', avatar_url: c.profiles?.avatar_url || ''
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
    // get email + is_admin via separate query (leaderboard_v doesn't have them)
    const { data: extra } = await supabase.from('profiles').select('id, is_admin, created_at');
    const map = Object.fromEntries((extra || []).map(p => [p.id, p]));
    return (data || []).map(u => ({
      ...u,
      is_admin: map[u.id]?.is_admin || false,
      created_at: map[u.id]?.created_at,
      email: ''  // emails live in auth.users; not exposed by RLS — skip for now
    }));
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
    return { ok: true, note: '用户内容已清除。彻底删除账户需要 Edge Function（使用 service role key）' };
  },

  adminDeleteCheckin: async (_token, checkinId) => {
    const { error } = await supabase.from('checkins').delete().eq('id', checkinId);
    if (error) return { error: error.message };
    return { ok: true };
  },

  adminUpdateSettings: async (_token, updates) => {
    const rows = Object.entries(updates)
      .filter(([k]) => k !== 'action' && k !== 'token')
      .map(([key, value]) => ({ key, value: String(value), updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('settings').upsert(rows);
    if (error) return { error: error.message };
    return { ok: true };
  }
};
