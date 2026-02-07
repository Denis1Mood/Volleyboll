import sqlite3 from "sqlite3";
import path from "path";

const DB_PATH = process.env.SQLITE_PATH || path.resolve("./data.sqlite");

export const db = new sqlite3.Database(DB_PATH);

export const initDb = () => {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        week_start TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, day, time, week_start),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        subscription TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`
    );
  });
};

export const getWeekStart = (date = new Date()) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
};
