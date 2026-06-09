'use client';
// Telegram Mini App: панель бармена.
// Открывается в шторке Telegram; initData приходит из tg.WebApp и
// проверяется на сервере по HMAC от BOT_TOKEN.
import { useCallback, useEffect, useMemo, useState } from 'react';

type Dashboard = {
  ok: true;
  me: { id: string; name: string; role: string; onShift: boolean; lastLoginAt: string | null };
  activeOrders: ActiveOrder[];
  todayHistory: HistoryOrder[];
  tables: {
    total: number;
    openSessions: {
      sessionId: string; table: string; kind: string;
      guestsCount: number; cartCount: number; liveOrders: number;
      openedAt: string;
    }[];
  };
  staff: { id: string; name: string; role: string; onShift: boolean; lastLoginAt: string | null; isMe: boolean }[];
  todayStats: { myAccepted: number; myRevenue: string };
};
type ActiveOrder = {
  id: string; short: string; status: 'PENDING' | 'ACCEPTED';
  total: string; createdAt: string; confirmedAt: string | null; confirmedBy: string | null;
  rkeeperOrderId: string | null;
  table: string; tableKind: string; guests: string[];
  items: { guestName: string; summary: string; qty: number; lineTotal: string }[];
};
type HistoryOrder = {
  id: string; short: string; status: 'READY' | 'REJECTED'; total: string;
  confirmedAt: string | null; confirmedBy: string | null;
  rkeeperOrderId: string | null; table: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void; expand: () => void;
        initData: string; initDataUnsafe: any;
        colorScheme: 'light' | 'dark';
        themeParams?: any;
        HapticFeedback?: { impactOccurred?: (s: string) => void; notificationOccurred?: (s: string) => void };
        showAlert?: (s: string) => void;
        showConfirm?: (s: string, cb: (ok: boolean) => void) => void;
        BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void };
      };
    };
  }
}

const fmt = (n: number | string) => Number(n).toLocaleString('ru-RU');

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec} с назад`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  return `${h} ч ${rm > 0 ? rm + ' мин' : ''}`.trim();
}

export default function StaffPanel() {
  const [initData, setInitData] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Подхватываем Telegram WebApp с задержкой (скрипт async).
  useEffect(() => {
    const tryGet = (attempts = 0) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        setInitData(tg.initData ?? '');
      } else if (attempts < 20) {
        setTimeout(() => tryGet(attempts + 1), 100);
      } else {
        setInitData(''); // не в Telegram
      }
    };
    tryGet();
  }, []);

  const refresh = useCallback(async () => {
    if (initData === null) return;
    try {
      const r = await fetch('/api/staff-app/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const j = await r.json();
      if (j.ok) { setData(j as Dashboard); setErr(null); }
      else setErr(j.message ?? j.reason ?? j.error ?? 'Не авторизован');
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }, [initData]);

  useEffect(() => {
    if (initData === null) return;
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [initData, refresh]);

  // Действие смены
  const toggleShift = async () => {
    if (!data) return;
    setBusy('shift');
    try {
      const r = await fetch('/api/staff-app/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'shift', initData, on: !data.me.onShift }),
      });
      const j = await r.json();
      if (j.ok) {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
        await refresh();
      }
    } finally { setBusy(null); }
  };

  const orderAction = async (orderId: string, action: 'accept' | 'reject' | 'ready') => {
    setBusy(`${orderId}:${action}`);
    try {
      const r = await fetch('/api/staff-app/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'order', initData, orderId, action }),
      });
      const j = await r.json();
      if (j.ok) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(
          action === 'reject' ? 'warning' : 'success',
        );
        await refresh();
      } else {
        window.Telegram?.WebApp?.showAlert?.(`Не получилось: ${j.error ?? 'ошибка'}`);
      }
    } finally { setBusy(null); }
  };

  if (initData === null) {
    return <main className="sp"><div className="sp__loading">Запускаем…</div></main>;
  }
  if (initData === '') {
    return (
      <main className="sp">
        <div className="sp__notg">
          <h1>Эта страница работает только в Telegram</h1>
          <p>Откройте бот @ваш_бот, отправьте /panel и нажмите кнопку панели.</p>
        </div>
      </main>
    );
  }

  if (err && !data) {
    return (
      <main className="sp">
        <div className="sp__notg">
          <h1>Доступ закрыт</h1>
          <p>{err}</p>
          <button className="sp__btn" onClick={refresh}>Обновить</button>
        </div>
      </main>
    );
  }
  if (!data) return <main className="sp"><div className="sp__loading">Загружаем…</div></main>;

  const pending = data.activeOrders.filter((o) => o.status === 'PENDING');
  const accepted = data.activeOrders.filter((o) => o.status === 'ACCEPTED');
  const activeStaff = data.staff.filter((s) => s.onShift);
  const idleStaff = data.staff.filter((s) => !s.onShift);

  return (
    <main className="sp">
      {/* ============ HEADER ============ */}
      <header className="sp__hdr">
        <div className="sp__brand">
          <span className="sp__mark">O</span>
          <span className="sp__name">The&nbsp;<b>Object</b></span>
        </div>
        <h1 className="sp__title">Панель бармена</h1>
        <div className="sp__me">
          <div>
            <span className="sp__eyebrow">Вы</span>
            <div className="sp__meName">{data.me.name}</div>
          </div>
          <button
            className={`sp__shift ${data.me.onShift ? 'sp__shift--on' : 'sp__shift--off'}`}
            onClick={toggleShift}
            disabled={busy === 'shift'}
          >
            {data.me.onShift ? '🟢 На смене' : '⏸ Не на смене'}
          </button>
        </div>
      </header>

      {/* ============ KPI РЯД ============ */}
      <section className="sp__kpis">
        <KPI label="Ждут" value={pending.length} accent={pending.length > 0 ? 'red' : undefined} />
        <KPI label="Готовятся" value={accepted.length} accent={accepted.length > 0 ? 'gold' : undefined} />
        <KPI label="Столы" value={`${data.tables.openSessions.length} / ${data.tables.total}`} />
        <KPI label="На смене" value={activeStaff.length} />
        <KPI label="Моих сегодня" value={data.todayStats.myAccepted} />
        <KPI label="Моя выручка" value={`${fmt(data.todayStats.myRevenue)} ₽`} />
      </section>

      {/* ============ АКТИВНЫЕ ЗАКАЗЫ ============ */}
      {data.activeOrders.length === 0 ? (
        <section className="sp__sec">
          <div className="sp__sec-head"><h2>Активных заказов нет</h2></div>
          <p className="sp__quiet">Тихий момент. Можно выдохнуть.</p>
        </section>
      ) : (
        <section className="sp__sec">
          <div className="sp__sec-head"><h2>Активные заказы</h2><span className="sp__count">{data.activeOrders.length}</span></div>
          <div className="sp__cards">
            {data.activeOrders.map((o) => (
              <OrderCard key={o.id} o={o} busy={busy} onAction={orderAction} />
            ))}
          </div>
        </section>
      )}

      {/* ============ ИСТОРИЯ СЕГОДНЯ ============ */}
      {data.todayHistory.length > 0 && (
        <section className="sp__sec">
          <div className="sp__sec-head"><h2>Сегодня закрыто</h2><span className="sp__count">{data.todayHistory.length}</span></div>
          <div className="sp__hist">
            {data.todayHistory.map((o) => (
              <div className={`sp__histRow ${o.status === 'REJECTED' ? 'sp__histRow--rej' : ''}`} key={o.id}>
                <span>#{o.short}</span>
                <span className="sp__quiet">· {o.table}</span>
                {o.confirmedBy && <span className="sp__quiet">· {o.confirmedBy}</span>}
                <span className="sp__histMoney">{fmt(o.total)} ₽</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ СТОЛЫ ============ */}
      <section className="sp__sec">
        <div className="sp__sec-head"><h2>Столы открыты</h2><span className="sp__count">{data.tables.openSessions.length}</span></div>
        {data.tables.openSessions.length === 0 ? (
          <p className="sp__quiet">Открытых сессий пока нет.</p>
        ) : (
          <div className="sp__tables">
            {data.tables.openSessions.map((s) => (
              <div className={`sp__tbl ${s.kind === 'VIP' ? 'sp__tbl--vip' : ''}`} key={s.sessionId}>
                <div className="sp__tbl-name">{s.table}</div>
                <div className="sp__tbl-meta">
                  👥 {s.guestsCount}
                  {s.cartCount > 0 && <> · 🛒 {s.cartCount}</>}
                  {s.liveOrders > 0 && <> · 🛎 {s.liveOrders}</>}
                </div>
                <div className="sp__tbl-time">{timeAgo(s.openedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ СОСТАВ СМЕНЫ ============ */}
      <section className="sp__sec">
        <div className="sp__sec-head"><h2>Состав смены</h2></div>
        {activeStaff.length > 0 && (
          <>
            <div className="sp__sec-sub">На смене сейчас</div>
            <div className="sp__staff">
              {activeStaff.map((s) => (
                <div className="sp__stf sp__stf--on" key={s.id}>
                  <span className="sp__stfDot" />
                  <span className="sp__stfName">{s.name}{s.isMe ? ' · вы' : ''}</span>
                  <span className="sp__stfRole">{s.role === 'ADMIN' ? 'админ' : 'бармен'}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {idleStaff.length > 0 && (
          <>
            <div className="sp__sec-sub">Свободны</div>
            <div className="sp__staff">
              {idleStaff.map((s) => (
                <div className="sp__stf sp__stf--off" key={s.id}>
                  <span className="sp__stfDot" />
                  <span className="sp__stfName">{s.name}{s.isMe ? ' · вы' : ''}</span>
                  <span className="sp__stfRole">{s.role === 'ADMIN' ? 'админ' : 'бармен'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="sp__foot">
        <p>Обновляется каждые 5 секунд · Бот тоже принимает заказы привычным способом.</p>
      </footer>
    </main>
  );
}

function KPI({ label, value, accent }: { label: string; value: string | number; accent?: 'red' | 'gold' }) {
  return (
    <div className={`sp__kpi ${accent === 'red' ? 'sp__kpi--red' : accent === 'gold' ? 'sp__kpi--gold' : ''}`}>
      <div className="sp__kpi-l">{label}</div>
      <div className="sp__kpi-v">{value}</div>
    </div>
  );
}

function OrderCard({ o, busy, onAction }: { o: ActiveOrder; busy: string | null; onAction: (id: string, a: 'accept' | 'reject' | 'ready') => void }) {
  // Группируем по гостю.
  const byGuest = useMemo(() => {
    const m = new Map<string, typeof o.items>();
    for (const it of o.items) {
      const arr = m.get(it.guestName) ?? [];
      arr.push(it);
      m.set(it.guestName, arr);
    }
    return Array.from(m.entries());
  }, [o.items]);

  const isPending = o.status === 'PENDING';
  const isAccepted = o.status === 'ACCEPTED';

  return (
    <article className={`sp__card sp__card--${o.status.toLowerCase()}`}>
      <header className="sp__card-h">
        <span className={`sp__chip sp__chip--${o.status.toLowerCase()}`}>
          {isPending ? '🛎 Ждём' : '🍳 Готовится'}
        </span>
        <span className="sp__card-id">#{o.short}</span>
        <span className="sp__card-time">{timeAgo(o.createdAt)}</span>
        <span className="sp__card-sum">{fmt(o.total)} ₽</span>
      </header>
      <div className="sp__card-table">
        🪑 <b>{o.table}</b>
        {o.tableKind === 'VIP' && <span className="sp__vip">VIP</span>}
      </div>

      <div className="sp__card-body">
        {byGuest.map(([guest, items]) => (
          <div className="sp__guest" key={guest}>
            <div className="sp__guest-name">{guest}</div>
            <ul>
              {items.map((it, i) => (
                <li key={i}><b>{it.qty}×</b> {it.summary} <span>{fmt(it.lineTotal)} ₽</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {o.rkeeperOrderId && (
        <div className="sp__card-rk">🧾 Чек r_keeper: <code>{o.rkeeperOrderId}</code></div>
      )}

      <div className="sp__card-act">
        {isPending && (
          <>
            <button className="sp__btn sp__btn--accept" disabled={!!busy} onClick={() => onAction(o.id, 'accept')}>
              ✓ Принять
            </button>
            <button className="sp__btn sp__btn--reject" disabled={!!busy} onClick={() => onAction(o.id, 'reject')}>
              ✗ Отклонить
            </button>
          </>
        )}
        {isAccepted && (
          <button className="sp__btn sp__btn--ready" disabled={!!busy} onClick={() => onAction(o.id, 'ready')}>
            🍹 Готов
          </button>
        )}
      </div>
    </article>
  );
}
