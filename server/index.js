import express from "express";
import cors from "cors";
import webpush from "web-push";
import { db, initDb, getWeekStart } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@volleyboll.local",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys are missing. Web push will not work until configured.");
}

initDb();

app.use(cors());
app.use(express.json());

const adminGuard = (req, res, next) => {
  const password = req.header("x-admin-password");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/push/public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post("/api/users", (req, res) => {
  const { firstName, lastName } = req.body || {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: "FirstName and LastName are required" });
  }
  const createdAt = new Date().toISOString();
  db.run(
    "INSERT INTO users (first_name, last_name, created_at) VALUES (?, ?, ?)",
    [firstName.trim(), lastName.trim(), createdAt],
    function onInsert(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({ id: this.lastID, firstName, lastName });
    }
  );
});

app.get("/api/users", (_req, res) => {
  db.all("SELECT id, first_name as firstName, last_name as lastName FROM users", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

app.delete("/api/admin/users/:id", adminGuard, (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run("DELETE FROM votes WHERE user_id = ?", [id]);
    db.run("DELETE FROM push_subscriptions WHERE user_id = ?", [id]);
    db.run("DELETE FROM users WHERE id = ?", [id], function onDelete(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({ deleted: this.changes > 0 });
    });
  });
});

app.post("/api/votes/toggle", (req, res) => {
  const { userId, day, time } = req.body || {};
  if (!userId || !day || !time) {
    return res.status(400).json({ error: "userId, day, time are required" });
  }
  const weekStart = getWeekStart();
  const createdAt = new Date().toISOString();
  db.get(
    "SELECT id FROM votes WHERE user_id = ? AND day = ? AND time = ? AND week_start = ?",
    [userId, day, time, weekStart],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (row) {
        db.run("DELETE FROM votes WHERE id = ?", [row.id], function onDelete(deleteErr) {
          if (deleteErr) {
            return res.status(500).json({ error: deleteErr.message });
          }
          return res.json({ voted: false });
        });
      } else {
        db.run(
          "INSERT INTO votes (user_id, day, time, week_start, created_at) VALUES (?, ?, ?, ?, ?)",
          [userId, day, time, weekStart, createdAt],
          function onInsert(insertErr) {
            if (insertErr) {
              return res.status(500).json({ error: insertErr.message });
            }
            return res.json({ voted: true });
          }
        );
      }
    }
  );
});

app.get("/api/votes", (_req, res) => {
  const weekStart = getWeekStart();
  db.all(
    "SELECT votes.id, votes.user_id as userId, votes.day, votes.time, votes.week_start as weekStart FROM votes WHERE week_start = ?",
    [weekStart],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

app.delete("/api/admin/votes/:id", adminGuard, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM votes WHERE id = ?", [id], function onDelete(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ deleted: this.changes > 0 });
  });
});

app.post("/api/push/subscribe", (req, res) => {
  const { userId, subscription } = req.body || {};
  if (!userId || !subscription) {
    return res.status(400).json({ error: "userId and subscription required" });
  }
  const createdAt = new Date().toISOString();
  const serialized = JSON.stringify(subscription);
  db.run(
    `INSERT INTO push_subscriptions (user_id, subscription, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET subscription = excluded.subscription`,
    [userId, serialized, createdAt],
    function onInsert(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({ stored: true });
    }
  );
});

app.get("/api/admin/lazy-users", adminGuard, (_req, res) => {
  const weekStart = getWeekStart();
  const query = `
    SELECT users.id, users.first_name as firstName, users.last_name as lastName
    FROM users
    LEFT JOIN votes ON votes.user_id = users.id AND votes.week_start = ?
    WHERE votes.id IS NULL
  `;
  db.all(query, [weekStart], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

app.post("/api/admin/remind-lazy", adminGuard, (req, res) => {
  const { userIds } = req.body || {};
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "userIds required" });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "VAPID keys are not configured" });
  }
  const placeholders = userIds.map(() => "?").join(",");
  const query = `
    SELECT users.id, users.first_name as firstName, push_subscriptions.subscription as subscription
    FROM push_subscriptions
    JOIN users ON users.id = push_subscriptions.user_id
    WHERE users.id IN (${placeholders})
  `;
  db.all(query, userIds, async (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const results = [];
    for (const row of rows) {
      const payload = JSON.stringify({
        title: "Волейбол",
        body: `Привет, ${row.firstName}! Ты забыл записаться на волейбол на этой неделе!`,
      });
      try {
        await webpush.sendNotification(JSON.parse(row.subscription), payload);
        results.push({ id: row.id, sent: true });
      } catch (sendErr) {
        results.push({ id: row.id, sent: false, error: sendErr.message });
      }
    }
    return res.json({ results });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
