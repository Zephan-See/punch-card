import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'punch-card.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('数据库连接失败:', err);
  else console.log('✅ SQLite 数据库已连接');
});

db.configure('busyTimeout', 5000);

// 包装异步操作
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function initDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) reject(err);
      });

      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'user')) DEFAULT 'user',
          avatar_url TEXT,
          wall_public INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          target_days INTEGER DEFAULT 100,
          start_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS checkins (
          id INTEGER PRIMARY KEY,
          user_id INTEGER NOT NULL,
          goal_id INTEGER,
          content TEXT,
          media_url TEXT,
          media_type TEXT CHECK(media_type IN ('text', 'image', 'video', 'audio')),
          checked_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL,
          UNIQUE(user_id, checked_date)
        );

        CREATE TABLE IF NOT EXISTS likes (
          id INTEGER PRIMARY KEY,
          user_id INTEGER NOT NULL,
          checkin_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
          UNIQUE(user_id, checkin_id)
        );

        CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
        CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checked_date);
        CREATE INDEX IF NOT EXISTS idx_likes_checkin ON likes(checkin_id);
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export default db;
