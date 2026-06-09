// Админка: меню, столы, генерация QR, смены. Этап 6 дорожной карты.
// Сейчас — заглушка с проверкой связи с API.
'use client';
import { useEffect, useState } from 'react';

type TableRow = { id: string; label: string; kind: string };

export default function AdminPage() {
  const [health, setHealth] = useState<'…' | 'ok' | 'fail'>('…');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await fetch('/health').then((r) => r.json());
        setHealth(h.ok ? 'ok' : 'fail');
        const t = await fetch('/api/tables').then((r) => r.json());
        setTables(t.tables ?? []);
      } catch (e: any) {
        setHealth('fail');
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  return (
    <main className="wrap">
      <p className="eyebrow">THE OBJECT · Админка</p>
      <h1>Контроль</h1>

      <div className="card">
        API: <b className={health === 'ok' ? 'ok' : health === 'fail' ? 'bad' : ''}>{health}</b>
        {error && <div className="bad">Ошибка: {error}</div>}
      </div>

      <div className="card">
        <b>Столы ({tables.length})</b>
        <ul>
          {tables.map((t) => (
            <li key={t.id}>
              {t.label} <span style={{ color: 'var(--dim)' }}>— {t.kind === 'VIP' ? 'VIP-комната' : 'зал'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        Здесь появятся: редактор меню, генерация QR-кодов, смены, аудит. Этап 6.
      </div>
    </main>
  );
}
