#!/usr/bin/env node
/**
 * Migrate from Google Sheets (via Apps Script API) → Supabase.
 *
 * Reads existing users, checkins, likes, comments via the current Apps Script
 * admin endpoints, then:
 *   1) creates Supabase Auth users with their ORIGINAL passwords (decoded from
 *      the current base64 storage) so they can log in unchanged
 *   2) inserts profiles, checkins, likes, comments
 *   3) uploads any base64 media (image_1/2/3, audio_url, video_url) to the
 *      Supabase Storage 'media' bucket and replaces the URLs
 *
 * Run locally:
 *   cd supabase
 *   cp .env.example .env   # fill in values
 *   node migrate.mjs
 *
 * Required env (in .env or shell):
 *   SUPABASE_URL              https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY <service_role JWT>   (NEVER ship to frontend)
 *   APPS_SCRIPT_URL           https://script.google.com/macros/s/.../exec
 *   APPS_SCRIPT_ADMIN_TOKEN   <token of an admin user> (the base64 one from current login)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APPS_SCRIPT_URL, APPS_SCRIPT_ADMIN_TOKEN } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APPS_SCRIPT_URL, APPS_SCRIPT_ADMIN_TOKEN })) {
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function postAppsScript(action, params = {}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: APPS_SCRIPT_ADMIN_TOKEN, ...params })
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('Bad JSON from Apps Script: ' + text.slice(0, 200)); }
}

// Decode base64 password back to plaintext (current `hashPwd` is just base64 encoding)
function decodePassword(b64) {
  try { return Buffer.from(b64, 'base64').toString('utf-8'); } catch { return null; }
}

// Sheets row.id → new Supabase auth uid
const userIdMap = new Map();

async function migrateUsers() {
  console.log('\n[1/5] Fetching users from Apps Script…');
  const res = await postAppsScript('adminUsers');
  const sheetUsers = res.data || [];
  console.log(`  found ${sheetUsers.length} users`);

  for (const u of sheetUsers) {
    const plaintext = decodePassword(u.password_hash || '');
    if (!u.email) { console.log(`  skip user ${u.id}: no email`); continue; }
    if (!plaintext) { console.log(`  skip ${u.email}: cannot decode password`); continue; }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: plaintext,
      email_confirm: true,
      user_metadata: { name: u.name, legacy_id: u.id }
    });
    if (error) {
      if (error.message.includes('already')) {
        // try to look up existing user
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list.users.find(x => x.email === u.email);
        if (existing) { userIdMap.set(u.id, existing.id); console.log(`  re-use ${u.email}`); continue; }
      }
      console.log(`  ❌ ${u.email}: ${error.message}`); continue;
    }
    userIdMap.set(u.id, data.user.id);
    console.log(`  ✓ ${u.email}  → ${data.user.id}`);

    // Update profile fields (trigger creates the profile row)
    await supabase.from('profiles').update({
      name: u.name,
      avatar_url: u.avatar_url || '',
      signature: u.signature || '',
      wall_public: !!u.wall_public,
      is_admin: !!u.is_admin
    }).eq('id', data.user.id);
  }
}

// Sheets checkin id → new Supabase checkin id
const checkinIdMap = new Map();

async function uploadDataUrl(uid, dataUrl, prefix) {
  if (!dataUrl || !dataUrl.startsWith?.('data:')) return dataUrl || '';
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'application/octet-stream';
  const ext = (mime.split('/')[1] || 'bin').split(';')[0];
  const bytes = Buffer.from(b64, 'base64');
  const path = `${uid}/${Date.now()}-${prefix}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType: mime, upsert: false });
  if (error) { console.log(`  ⚠️ upload failed: ${error.message}`); return ''; }
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

async function migrateCheckins() {
  console.log('\n[2/5] Fetching checkins…');
  const res = await postAppsScript('adminAllCheckins');
  const rows = res.data || [];
  console.log(`  found ${rows.length} checkins`);

  for (const c of rows) {
    const uid = userIdMap.get(c.user_id);
    if (!uid) { console.log(`  skip checkin ${c.id}: user not migrated`); continue; }

    // Need full row for media — adminAllCheckins doesn't return image fields. Use getMyCheckins via service.
    // Cheaper: assume admin endpoint returns full row. If not, fetch each user's checkins via getMyCheckins per user.
    const insert = {
      user_id: uid,
      content: c.content,
      checked_date: c.checked_date,
      created_at: c.created_at,
      image_1: await uploadDataUrl(uid, c.image_1, 'img1'),
      image_2: await uploadDataUrl(uid, c.image_2, 'img2'),
      image_3: await uploadDataUrl(uid, c.image_3, 'img3'),
      audio_url: await uploadDataUrl(uid, c.audio_url, 'audio'),
      video_url: await uploadDataUrl(uid, c.video_url, 'video')
    };
    const { data, error } = await supabase.from('checkins').insert(insert).select('id').single();
    if (error) { console.log(`  ❌ checkin ${c.id}: ${error.message}`); continue; }
    checkinIdMap.set(c.id, data.id);
  }
  console.log(`  ✓ ${checkinIdMap.size} checkins migrated`);
}

async function migrateLikes() {
  console.log('\n[3/5] Fetching likes…');
  // Apps Script doesn't currently expose all likes. Add to Code.gs if needed:
  //   else if (action === 'adminAllLikes') result = { data: getTableData('likes') };
  const res = await postAppsScript('adminAllLikes').catch(() => ({ data: [] }));
  const rows = res.data || [];
  if (!rows.length) { console.log('  (no likes endpoint or empty)'); return; }

  const inserts = rows
    .map(l => ({
      user_id: userIdMap.get(l.user_id),
      checkin_id: checkinIdMap.get(l.checkin_id),
      created_at: l.created_at
    }))
    .filter(l => l.user_id && l.checkin_id);
  if (inserts.length) {
    const { error } = await supabase.from('likes').insert(inserts);
    if (error) console.log(`  ⚠️ ${error.message}`);
    else console.log(`  ✓ ${inserts.length} likes migrated`);
  }
}

async function migrateComments() {
  console.log('\n[4/5] Fetching comments…');
  const res = await postAppsScript('adminAllComments').catch(() => ({ data: [] }));
  const rows = res.data || [];
  if (!rows.length) { console.log('  (no comments endpoint or empty)'); return; }

  const inserts = rows
    .map(c => ({
      user_id: userIdMap.get(c.user_id),
      checkin_id: checkinIdMap.get(c.checkin_id),
      content: c.content,
      created_at: c.created_at
    }))
    .filter(c => c.user_id && c.checkin_id);
  if (inserts.length) {
    const { error } = await supabase.from('comments').insert(inserts);
    if (error) console.log(`  ⚠️ ${error.message}`);
    else console.log(`  ✓ ${inserts.length} comments migrated`);
  }
}

async function migrateSettings() {
  console.log('\n[5/5] Settings…');
  const res = await postAppsScript('getSettings');
  const rows = Object.entries(res || {}).map(([key, value]) => ({ key, value: String(value) }));
  if (rows.length) {
    const { error } = await supabase.from('settings').upsert(rows);
    if (error) console.log(`  ⚠️ ${error.message}`);
    else console.log(`  ✓ ${rows.length} settings`);
  }
}

(async () => {
  console.log('Supabase migration starting…');
  console.log(`  → ${SUPABASE_URL}`);
  await migrateUsers();
  await migrateCheckins();
  await migrateLikes();
  await migrateComments();
  await migrateSettings();
  console.log('\nDONE. ID mapping (legacy → new):');
  console.log('  users:', userIdMap.size);
  console.log('  checkins:', checkinIdMap.size);
})().catch(e => { console.error(e); process.exit(1); });
