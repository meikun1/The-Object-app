'use client';
// Живой таймер «До закрытия / До открытия» с учётом расписания заведения
// (Вс-Чт до 02:00, Пт-Сб до 03:00). Обновляется каждые 30 секунд.
// Часовой пояс — Москва.
import { useEffect, useState } from 'react';

// Минуты от полуночи дня ОТКРЫТИЯ. Закрытие может выходить за 24:00 (например,
// 26:00 = ночь на следующий день 02:00, 27:00 = 03:00).
const SCHEDULE: { open: number; close: number }[] = [
  { open: 12 * 60, close: 26 * 60 }, // 0 — Вс
  { open: 12 * 60, close: 26 * 60 }, // 1 — Пн
  { open: 12 * 60, close: 26 * 60 }, // 2 — Вт
  { open: 12 * 60, close: 26 * 60 }, // 3 — Ср
  { open: 12 * 60, close: 26 * 60 }, // 4 — Чт
  { open: 12 * 60, close: 27 * 60 }, // 5 — Пт
  { open: 12 * 60, close: 27 * 60 }, // 6 — Сб
];
const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeStatus(now: Date): { open: boolean; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const parts = Object.fromEntries(fmt.map((p) => [p.type, p.value]));
  const dayIdx = DAY_KEYS.indexOf(parts.weekday);
  // В 24-часовом формате Intl иногда отдаёт "24" вместо "00" — нормализуем.
  const hourRaw = parseInt(parts.hour, 10);
  const h = hourRaw === 24 ? 0 : hourRaw;
  const m = parseInt(parts.minute, 10);
  const nowMin = h * 60 + m;

  // 1) Возможно, мы ещё в сессии ВЧЕРАШНЕГО дня (после полуночи до закрытия).
  if (nowMin < 12 * 60) {
    const yest = (dayIdx + 6) % 7;
    const yestCloseFromTodayMidnight = SCHEDULE[yest].close - 24 * 60;
    if (nowMin < yestCloseFromTodayMidnight) {
      return { open: true, minutes: yestCloseFromTodayMidnight - nowMin };
    }
    // Заведение закрыто, откроется сегодня в 12:00.
    return { open: false, minutes: 12 * 60 - nowMin };
  }

  // 2) Сегодня после 12:00 — внутри сегодняшней сессии.
  if (nowMin < SCHEDULE[dayIdx].close) {
    return { open: true, minutes: SCHEDULE[dayIdx].close - nowMin };
  }

  // 3) После закрытия сегодняшней сессии, но до полуночи (формально невозможно,
  //    т.к. close > 24:00, но оставим страховку — откроется завтра в 12:00).
  return { open: false, minutes: 24 * 60 - nowMin + 12 * 60 };
}

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function ClosingTimer() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Пока клиент не гидратировался — показываем нейтральный плейсхолдер,
  // чтобы не было mismatch между сервером и клиентом.
  if (!now) {
    return (
      <div className="stat">
        <div className="n">—</div>
        <div className="t">До закрытия</div>
      </div>
    );
  }

  const st = computeStatus(now);
  return (
    <div className="stat">
      <div className="n">{formatHM(st.minutes)}</div>
      <div className="t">{st.open ? 'До закрытия' : 'До открытия'}</div>
    </div>
  );
}
