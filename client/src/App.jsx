import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const DAYS = [
  { key: "mon", label: "ПН" },
  { key: "tue", label: "ВТ" },
  { key: "wed", label: "СР" },
  { key: "thu", label: "ЧТ" },
  { key: "fri", label: "ПТ" },
  { key: "sat", label: "СБ" },
  { key: "sun", label: "ВС" },
];
const TIMES = ["18:00", "19:00", "20:00", "21:00"];

const getGreeting = (name) => {
  const hour = new Date().getHours();
  if (hour < 12) return `Доброе утро, ${name}!`;
  if (hour < 18) return `Добрый день, ${name}!`;
  return `Добрый вечер, ${name}!`;
};

const getWeekStart = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const buildDisplayNames = (users) => {
  const grouped = users.reduce((acc, user) => {
    acc[user.firstName] = acc[user.firstName] || [];
    acc[user.firstName].push(user);
    return acc;
  }, {});

  const display = {};
  Object.entries(grouped).forEach(([firstName, group]) => {
    group.forEach((user) => {
      const last = user.lastName;
      let prefixLength = 1;
      while (prefixLength <= last.length) {
        const prefix = last.slice(0, prefixLength);
        const collision = group.some(
          (other) => other.id !== user.id && other.lastName.startsWith(prefix)
        );
        if (!collision) {
          display[user.id] = `${firstName} ${prefix}.`;
          return;
        }
        prefixLength += 1;
      }
      display[user.id] = `${firstName} ${last}.`;
    });
  });

  return display;
};

const downloadICS = (dayIndex, time) => {
  const weekStart = getWeekStart();
  const eventDate = new Date(weekStart);
  eventDate.setDate(weekStart.getDate() + dayIndex);
  const [hours, minutes] = time.split(":").map(Number);
  eventDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(eventDate);
  endDate.setHours(eventDate.getHours() + 2);

  const formatDate = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Volleyboll//RU
BEGIN:VEVENT
UID:${Date.now()}@volleyboll
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(eventDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Волейбол
DESCRIPTION:Запись на волейбол
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "volleyboll.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const RegistrationModal = ({ onSubmit }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const isValid = firstName.trim() && lastName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Регистрация</h2>
        <p className="mt-2 text-sm text-slate-600">
          Введите имя и фамилию, чтобы продолжить.
        </p>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Имя"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Фамилия"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
        <button
          className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white disabled:bg-slate-300"
          disabled={!isValid}
          onClick={() => onSubmit({ firstName, lastName })}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
};

const SplashScreen = ({ name }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white">
    <div className="rounded-3xl bg-white/20 px-8 py-6 text-center shadow-2xl">
      <h1 className="text-2xl font-semibold">{getGreeting(name)}</h1>
      <p className="mt-2 text-sm">Готовы к игре?</p>
    </div>
  </div>
);

const NotificationBanner = ({ onEnable, permission, showIosHint }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold">Уведомления о волейболе</h3>
        <p className="text-sm text-slate-600">
          Получайте напоминания и приглашения прямо в браузере.
        </p>
        {showIosHint && (
          <p className="mt-2 text-xs text-amber-600">
            Чтобы получать уведомления на iPhone, добавьте сайт на экран “Домой”.
          </p>
        )}
      </div>
      <button
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        onClick={onEnable}
        disabled={permission === "granted"}
      >
        {permission === "granted" ? "Разрешено" : "Разрешить"}
      </button>
    </div>
  </div>
);

const StatsModal = ({ onClose, totalVotes }) => {
  const achievements = [];
  if (totalVotes >= 10) achievements.push("🥇 Легенда");
  else if (totalVotes >= 5) achievements.push("🥈 Завсегдатай");
  else if (totalVotes >= 1) achievements.push("🥉 Новичок");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Моя статистика</h2>
        <p className="mt-2 text-sm text-slate-600">Всего голосов: {totalVotes}</p>
        <div className="mt-4 space-y-2">
          {achievements.length > 0 ? (
            achievements.map((item) => (
              <div key={item} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                {item}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Пока без достижений.</p>
          )}
        </div>
        <button
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};

const AdminDashboard = ({ onExit }) => {
  const [password, setPassword] = useState(localStorage.getItem("adminPassword") || "");
  const [input, setInput] = useState(password);
  const [lazyUsers, setLazyUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [status, setStatus] = useState("");

  const headers = useMemo(
    () => ({ "x-admin-password": password }),
    [password]
  );

  const loadData = async () => {
    try {
      const [lazyRes, usersRes, votesRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/lazy-users`, { headers }),
        fetch(`${API_BASE}/api/users`),
        fetch(`${API_BASE}/api/votes`),
      ]);
      if (!lazyRes.ok) throw new Error("Неверный пароль");
      setLazyUsers(await lazyRes.json());
      setUsers(await usersRes.json());
      setVotes(await votesRes.json());
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Ошибка");
    }
  };

  useEffect(() => {
    if (password) {
      loadData();
    }
  }, [password]);

  const handleLogin = () => {
    localStorage.setItem("adminPassword", input);
    setPassword(input);
  };

  const handleRemind = async () => {
    const userIds = lazyUsers.map((user) => user.id);
    const response = await fetch(`${API_BASE}/api/admin/remind-lazy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ userIds }),
    });
    const data = await response.json();
    setStatus(response.ok ? "Уведомления отправлены" : data.error || "Ошибка");
  };

  const handleDeleteUser = async (id) => {
    await fetch(`${API_BASE}/api/admin/users/${id}`, {
      method: "DELETE",
      headers,
    });
    loadData();
  };

  const handleDeleteVote = async (id) => {
    await fetch(`${API_BASE}/api/admin/votes/${id}`, {
      method: "DELETE",
      headers,
    });
    loadData();
  };

  if (!password) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold">Admin</h2>
          <input
            className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Пароль"
            type="password"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            onClick={handleLogin}
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Админ-панель</h1>
            {status && <p className="text-sm text-emerald-600">{status}</p>}
          </div>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            onClick={onExit}
          >
            На главную
          </button>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Лентяи</h2>
              <p className="text-sm text-slate-500">
                Пользователи без голосов на текущей неделе.
              </p>
            </div>
            <button
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleRemind}
              disabled={lazyUsers.length === 0}
            >
              🔔 Напомнить всем
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {lazyUsers.length === 0 ? (
              <li className="text-sm text-slate-500">Все активны 🎉</li>
            ) : (
              lazyUsers.map((user) => (
                <li key={user.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  {user.firstName} {user.lastName}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Пользователи</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                  <button
                    className="text-xs text-rose-500"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Голоса</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {votes.map((vote) => (
                <li
                  key={vote.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span>
                    #{vote.id} — {vote.day} {vote.time}
                  </span>
                  <button
                    className="text-xs text-rose-500"
                    onClick={() => handleDeleteVote(vote.id)}
                  >
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [users, setUsers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [showSplash, setShowSplash] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const isAdminRoute = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (user) {
      setShowSplash(true);
      const timer = setTimeout(() => setShowSplash(false), 1800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [user]);

  const loadData = async () => {
    const [usersRes, votesRes] = await Promise.all([
      fetch(`${API_BASE}/api/users`),
      fetch(`${API_BASE}/api/votes`),
    ]);
    setUsers(await usersRes.json());
    setVotes(await votesRes.json());
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  const displayNames = useMemo(() => buildDisplayNames(users), [users]);

  const handleRegister = async ({ firstName, lastName }) => {
    const response = await fetch(`${API_BASE}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    const data = await response.json();
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    loadData();
  };

  const handleToggleVote = async (day, time) => {
    if (!user) return;
    await fetch(`${API_BASE}/api/votes/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, day, time }),
    });
    loadData();
  };

  const groupedVotes = useMemo(() => {
    const map = new Map();
    votes.forEach((vote) => {
      const key = `${vote.day}-${vote.time}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(vote);
    });
    return map;
  }, [votes]);

  const totalVotes = votes.filter((vote) => vote.userId === user?.id).length;

  const handleEnableNotifications = async () => {
    if (!user || !("serviceWorker" in navigator)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const keyResponse = await fetch(`${API_BASE}/api/push/public-key`);
    const { publicKey } = await keyResponse.json();
    if (!publicKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, subscription }),
    });
  };

  if (isAdminRoute) {
    return <AdminDashboard onExit={() => (window.location.href = "/")} />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {user ? showSplash && <SplashScreen name={user.firstName} /> : null}
      {!user && <RegistrationModal onSubmit={handleRegister} />}
      {showStats && <StatsModal onClose={() => setShowStats(false)} totalVotes={totalVotes} />}
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Запись на волейбол</h1>
            <p className="text-sm text-slate-500">
              Выберите удобное время и соберите минимум 6 человек.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              onClick={() => setShowStats(true)}
              disabled={!user}
            >
              Моя статистика
            </button>
            <a
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              href="/admin"
            >
              Админ
            </a>
          </div>
        </header>

        <NotificationBanner
          onEnable={handleEnableNotifications}
          permission={notificationPermission}
          showIosHint={isIOS()}
        />

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500">Время</th>
                  {DAYS.map((day) => (
                    <th
                      key={day.key}
                      className="text-center text-xs font-semibold text-slate-500"
                    >
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time) => (
                  <tr key={time}>
                    <td className="text-sm font-semibold text-slate-600">{time}</td>
                    {DAYS.map((day, index) => {
                      const key = `${day.key}-${time}`;
                      const cellVotes = groupedVotes.get(key) || [];
                      const isSelected = cellVotes.some((vote) => vote.userId === user?.id);
                      const isReady = cellVotes.length >= 6;
                      return (
                        <td key={day.key} className="align-top">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleToggleVote(day.key, time)}
                            onKeyDown={(event) =>
                              event.key === "Enter" && handleToggleVote(day.key, time)
                            }
                            className={`min-h-[110px] rounded-2xl border px-2 py-2 text-xs transition ${
                              isReady
                                ? "border-emerald-400 bg-emerald-100"
                                : "border-slate-200 bg-slate-50"
                            } ${isSelected ? "ring-2 ring-sky-400" : ""}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">
                                {cellVotes.length} / 6
                              </span>
                              {isReady && (
                                <button
                                  className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    downloadICS(index, time);
                                  }}
                                >
                                  В календарь
                                </button>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              {cellVotes.map((vote) => (
                                <div
                                  key={vote.id}
                                  className="rounded-md bg-white/70 px-2 py-1 text-[11px]"
                                >
                                  {displayNames[vote.userId] || "Гость"}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            На телефоне прокрутите таблицу горизонтально, чтобы увидеть все дни недели.
          </p>
        </section>
      </div>
    </div>
  );
}
