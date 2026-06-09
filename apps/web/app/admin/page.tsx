'use client';
// Админка. Вход — единоразовый ввод ADMIN_ACCESS_TOKEN, дальше хранится
// в localStorage этого браузера. Действия (засевка и т.п.) шлются с
// заголовком x-admin-token. Этап 6 — полноценная админка.
import { useEffect, useState } from 'react';

type TableRow = { id: string; label: string; kind: string };

const STORAGE_KEY = 'object_admin_token';

export default function AdminPage() {
  // null = ещё не проверили localStorage; '' = разлогинен; string = вошёл.
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) ?? '' : '';
    setToken(t);
  }, []);

  if (token === null) {
    return <main className="adm" />;
  }
  if (!token) {
    return <Login onLogged={(t) => { localStorage.setItem(STORAGE_KEY, t); setToken(t); }} />;
  }
  return (
    <Dashboard
      token={token}
      onLogout={() => { localStorage.removeItem(STORAGE_KEY); setToken(''); }}
    />
  );
}

/* ============================== ЛОГИН ============================== */
function Login({ onLogged }: { onLogged: (token: string) => void }) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = val.trim();
    if (!t) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'x-admin-token': t },
      });
      if (res.ok) {
        onLogged(t);
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error === 'forbidden' ? 'Неверный токен' : (j.error ?? `Ошибка ${res.status}`));
      }
    } catch (e: any) {
      setErr(`Сеть: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="adm adm--login">
      <div className="login">
        <p className="eyebrow">THE OBJECT · Админка</p>
        <h1 className="login__title">Вход</h1>
        <p className="login__hint">
          Введите <code>ADMIN_ACCESS_TOKEN</code> один раз — браузер запомнит.
        </p>
        <form onSubmit={submit} className="login__form">
          <label className="login__fld">
            <span>Токен</span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="••••••••••••••••"
            />
          </label>
          {err && <p className="login__err">{err}</p>}
          <button type="submit" className="adm__btn" disabled={busy || !val.trim()}>
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </div>
    </main>
  );
}

/* ============================== ПАНЕЛЬ ============================== */
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seedMsg, setSeedMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    fetch('/api/tables')
      .then((r) => r.json())
      .then((j) => setTables(j.tables ?? []))
      .catch((e) => setError(String(e?.message ?? e)));
  };

  useEffect(load, []);

  const seed = async () => {
    if (!window.confirm('Перезаписать меню и столы демо-данными?')) return;
    setSeeding(true); setSeedMsg(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const j = await res.json();
      if (!res.ok) {
        setSeedMsg({ ok: false, text: `Ошибка: ${j.error ?? res.status}` });
        if (res.status === 403) onLogout();
      } else {
        setSeedMsg({ ok: true, text: `Готово: столов ${j.tables}, основ ${j.bases}.` });
        load();
      }
    } catch (e: any) {
      setSeedMsg({ ok: false, text: `Сеть: ${String(e?.message ?? e)}` });
    } finally {
      setSeeding(false);
    }
  };

  const hall = tables.filter((t) => t.kind !== 'VIP');
  const vip = tables.filter((t) => t.kind === 'VIP');

  return (
    <main className="adm">
      <header className="adm__head">
        <div>
          <p className="eyebrow">THE OBJECT · Админка</p>
          <h1 className="adm__title">Столы</h1>
        </div>
        <button className="adm__logout" onClick={onLogout} title="Выйти">Выход</button>
      </header>

      {error && <div className="adm__card adm__card--err">Ошибка: {error}</div>}

      <section className="adm__card">
        <h2 className="adm__h2">Засевка демо-данных</h2>
        <p className="adm__note">
          Создаёт 15 столов и 3 основы конструктора. Идемпотентна — повторный
          вызов перезаписывает меню.
        </p>
        <button className="adm__btn" onClick={seed} disabled={seeding}>
          {seeding ? 'Заполняем…' : 'Засеять демо-данные'}
        </button>
        {seedMsg && (
          <p className={`adm__msg ${seedMsg.ok ? 'adm__msg--ok' : 'adm__msg--err'}`}>
            {seedMsg.text}
          </p>
        )}
      </section>

      <section className="adm__card">
        <h2 className="adm__h2">{tables.length === 0 ? 'Пока пусто' : `Столы — ${tables.length}`}</h2>
        {tables.length === 0 ? (
          <p className="adm__note">Сначала нажмите «Засеять демо-данные».</p>
        ) : (
          <>
            <p className="adm__note">
              Тыкните на стол — это гостевой конструктор за этим столом.
              В Этапе 3 ссылки станут подписанными (нельзя угадать чужой стол).
            </p>
            {hall.length > 0 && (
              <>
                <h3 className="adm__group">Зал</h3>
                <div className="adm__tables">
                  {hall.map((t) => (
                    <a key={t.id} href={`/t/${t.id}`} className="adm__tile">
                      {t.label}
                    </a>
                  ))}
                </div>
              </>
            )}
            {vip.length > 0 && (
              <>
                <h3 className="adm__group">VIP</h3>
                <div className="adm__tables">
                  {vip.map((t) => (
                    <a key={t.id} href={`/t/${t.id}`} className="adm__tile adm__tile--vip">
                      {t.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      <section className="adm__card adm__card--muted">
        Здесь появятся редактор меню, генерация QR-кодов, смены, аудит. Этап 6.
      </section>
    </main>
  );
}
