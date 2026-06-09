'use client';
// Админка. Этап 3: подписанные QR-коды на каждом столе + сброс стола
// (закрытие сессии и ротация секрета — старые QR умирают).
// Вход — единоразовый ввод ADMIN_ACCESS_TOKEN (сохраняется в localStorage).
import { useEffect, useState } from 'react';

type TableRow = { id: string; label: string; kind: string };

const STORAGE_KEY = 'object_admin_token';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) ?? '' : '';
    setToken(t);
  }, []);

  if (token === null) return <main className="adm" />;
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
      if (res.ok) onLogged(t);
      else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error === 'forbidden' ? 'Неверный токен' : (j.error ?? `Ошибка ${res.status}`));
      }
    } catch (e: any) {
      setErr(`Сеть: ${String(e?.message ?? e)}`);
    } finally { setBusy(false); }
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
type StaffRow = { id: string; name: string; role: string; authorized: boolean; onShift: boolean; lastLoginAt: string | null };

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seedMsg, setSeedMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [qrFor, setQrFor] = useState<TableRow | null>(null);

  const load = () => {
    fetch('/api/tables')
      .then((r) => r.json())
      .then((j) => setTables(j.tables ?? []))
      .catch((e) => setError(String(e?.message ?? e)));
    fetch('/api/admin/staff', { headers: { 'x-admin-token': token } })
      .then((r) => r.json())
      .then((j) => setStaff(j.staff ?? []))
      .catch(() => {});
  };

  useEffect(load, [token]);

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
    } finally { setSeeding(false); }
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
              Тыкните на стол — это гостевой конструктор по подписанной QR-ссылке.
              «QR» — показать код для печати. «Сброс» — закрыть текущую сессию
              стола и сделать все старые QR недействительными.
            </p>
            {hall.length > 0 && (
              <>
                <h3 className="adm__group">Зал</h3>
                <TableGrid items={hall} onQr={(t) => setQrFor(t)} token={token} onChanged={load} />
              </>
            )}
            {vip.length > 0 && (
              <>
                <h3 className="adm__group">VIP</h3>
                <TableGrid items={vip} onQr={(t) => setQrFor(t)} token={token} onChanged={load} vip />
              </>
            )}
          </>
        )}
      </section>

      <TelegramSection token={token} />

      <StaffSection items={staff} />

      <section className="adm__card adm__card--muted">
        Здесь появятся редактор меню, аудит. Этап 6.
      </section>

      {qrFor && <QrModal table={qrFor} token={token} onClose={() => setQrFor(null)} />}
    </main>
  );
}

/* ===== Telegram-секция ===== */
function TelegramSection({ token }: { token: string }) {
  const [info, setInfo] = useState<{ url: string; pending_update_count: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = () => {
    fetch('/api/admin/telegram/setup', { headers: { 'x-admin-token': token } })
      .then((r) => r.json())
      .then((j) => setInfo(j.info ?? null))
      .catch(() => {});
  };
  useEffect(refresh, [token]);

  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/telegram/setup', { method: 'POST', headers: { 'x-admin-token': token } });
      const j = await r.json();
      if (!r.ok) setMsg({ ok: false, text: `Ошибка: ${j.error ?? r.status}` });
      else setMsg({ ok: true, text: `Webhook включён: ${j.url}` });
      refresh();
    } finally { setBusy(false); }
  };
  const disable = async () => {
    if (!window.confirm('Отключить webhook? Бот перестанет получать сообщения.')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/telegram/setup', { method: 'DELETE', headers: { 'x-admin-token': token } });
      const j = await r.json();
      if (!r.ok) setMsg({ ok: false, text: `Ошибка: ${j.error ?? r.status}` });
      else setMsg({ ok: true, text: 'Webhook отключён' });
      refresh();
    } finally { setBusy(false); }
  };

  const active = info?.url && info.url.length > 0;

  return (
    <section className="adm__card">
      <h2 className="adm__h2">Telegram-бот</h2>
      <p className="adm__note">
        Включите webhook один раз — после этого бот начнёт принимать сообщения
        от сотрудников и присылать вам заказы. Сотрудники пишут боту
        <code> /login ПАРОЛЬ</code> и встают на смену <code>/shift_on</code>.
      </p>
      {active ? (
        <p className="adm__msg adm__msg--ok">
          Активен: <code style={{ wordBreak: 'break-all' }}>{info!.url}</code>
          {' · '}очередь: {info!.pending_update_count}
        </p>
      ) : (
        <p className="adm__msg adm__msg--err">Webhook не настроен — бот не получает сообщения.</p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="adm__btn" onClick={enable} disabled={busy}>
          {active ? 'Перенастроить' : 'Включить webhook'}
        </button>
        {active && (
          <button className="trow__btn trow__btn--danger" onClick={disable} disabled={busy}>
            Отключить
          </button>
        )}
      </div>
      {msg && <p className={`adm__msg ${msg.ok ? 'adm__msg--ok' : 'adm__msg--err'}`}>{msg.text}</p>}
    </section>
  );
}

/* ===== список сотрудников ===== */
function StaffSection({ items }: { items: StaffRow[] }) {
  return (
    <section className="adm__card">
      <h2 className="adm__h2">Сотрудники</h2>
      {items.length === 0 ? (
        <p className="adm__note">Пока никто не входил в бота. Команды:
          {' '}<code>/start</code>, <code>/login ПАРОЛЬ</code>, <code>/shift_on</code>.
        </p>
      ) : (
        <div className="adm__rows">
          {items.map((s) => (
            <div key={s.id} className="trow">
              <div>
                <div className="trow__label">{s.name}</div>
                <div style={{ fontFamily: 'var(--m)', fontSize: '.7rem', color: 'var(--faint)', marginTop: 4 }}>
                  {s.role}
                  {s.lastLoginAt && ' · вход ' + new Date(s.lastLoginAt).toLocaleString('ru-RU')}
                </div>
              </div>
              <span className={s.onShift ? 'adm__chip adm__chip--on' : 'adm__chip'}>
                {s.onShift ? 'на смене' : 'выкл'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ===== плитка столов ===== */
function TableGrid({
  items, onQr, token, onChanged, vip,
}: {
  items: TableRow[];
  onQr: (t: TableRow) => void;
  token: string;
  onChanged: () => void;
  vip?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const reset = async (t: TableRow) => {
    if (!window.confirm(`Сбросить ${t.label}? Старые QR-коды этого стола перестанут работать.`)) return;
    setBusy(t.id);
    try {
      const res = await fetch(`/api/admin/tables/${t.id}/reset`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Ошибка: ${j.error ?? res.status}`);
      } else {
        onChanged();
      }
    } catch (e: any) {
      alert(`Сеть: ${String(e?.message ?? e)}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="adm__rows">
      {items.map((t) => (
        <div key={t.id} className={`trow${vip ? ' trow--vip' : ''}`}>
          <span className="trow__label">{t.label}</span>
          <div className="trow__act">
            <button className="trow__btn" onClick={() => onQr(t)}>QR</button>
            <button
              className="trow__btn trow__btn--danger"
              onClick={() => reset(t)}
              disabled={busy === t.id}
            >
              {busy === t.id ? '…' : 'Сброс'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== модалка QR ===== */
function QrModal({ table, token, onClose }: { table: TableRow; token: string; onClose: () => void }) {
  const [png, setPng] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/tables/${table.id}/qr`, { headers: { 'x-admin-token': token } })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `Ошибка ${r.status}`);
        setPng(j.png); setUrl(j.url);
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [table.id, token]);

  return (
    <div className="qrmodal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qrmodal__inner">
        <button className="qrmodal__close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h3 className="qrmodal__title">{table.label}</h3>
        {err && <p className="adm__msg adm__msg--err">{err}</p>}
        {png && <img className="qrmodal__img" src={png} alt={`QR-код для ${table.label}`} />}
        {url && (
          <p className="qrmodal__url">
            <a href={url} target="_blank" rel="noopener">{url}</a>
          </p>
        )}
        {png && (
          <a className="adm__btn" href={png} download={`qr-${table.label}.png`}>
            Скачать PNG
          </a>
        )}
      </div>
    </div>
  );
}
