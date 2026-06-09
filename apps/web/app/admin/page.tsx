// Админка. Пока — таблица столов с прямыми ссылками /t/[id] для теста +
// кнопка разовой засевки демо-данными. Этап 6 — полноценная админка.
'use client';
import { useEffect, useState } from 'react';

type TableRow = { id: string; label: string; kind: string };

export default function AdminPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    fetch('/api/tables')
      .then((r) => r.json())
      .then((j) => setTables(j.tables ?? []))
      .catch((e) => setError(String(e?.message ?? e)));
  };

  useEffect(load, []);

  const seed = async () => {
    const token = window.prompt('Введите ADMIN_ACCESS_TOKEN (из Vercel env)');
    if (!token) return;
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const j = await res.json();
      if (!res.ok) {
        setSeedMsg(`Ошибка: ${j.error ?? res.status}`);
      } else {
        setSeedMsg(`Готово: столов ${j.tables}, основ ${j.bases}.`);
        load();
      }
    } catch (e: any) {
      setSeedMsg(`Сеть: ${String(e?.message ?? e)}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <main className="wrap">
      <p className="eyebrow">THE OBJECT · Админка</p>
      <h1>Столы</h1>

      {error && <div className="card bad">Ошибка: {error}</div>}

      <div className="card">
        <button className="btn btn--line" onClick={seed} disabled={seeding}>
          {seeding ? 'Заполняем…' : 'Засеять демо-данные'}
        </button>
        {seedMsg && (
          <p style={{ marginTop: 12, fontFamily: 'var(--m)', fontSize: '.84rem', color: 'var(--dim)' }}>
            {seedMsg}
          </p>
        )}
        <p style={{ color: 'var(--faint)', fontSize: '.8rem', marginTop: 8 }}>
          Кнопка дёргает <code>POST /api/admin/seed</code> с заголовком
          <code> x-admin-token</code>. Создаёт 15 столов и 3 основы конструктора.
          Идемпотентна — старое меню/столы удаляются.
        </p>
      </div>

      <div className="card">
        <p style={{ color: 'var(--dim)', marginBottom: 14 }}>
          Откройте ссылку — это гостевой конструктор за столом.
          В Этапе 3 ссылки станут подписанными (нельзя угадать чужой стол).
        </p>
        <ul>
          {tables.map((t) => (
            <li key={t.id} style={{ marginBottom: 6 }}>
              <a href={`/t/${t.id}`} style={{ color: 'var(--blood)' }}>
                {t.label}
              </a>{' '}
              <span style={{ color: 'var(--dim)' }}>
                — {t.kind === 'VIP' ? 'VIP-комната' : 'зал'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ color: 'var(--dim)' }}>
        Здесь появятся редактор меню, генерация QR-кодов, смены, аудит. Этап 6.
      </div>
    </main>
  );
}
