'use client';
// Админка. Пока — таблица столов + кнопка разовой засевки демо-данными.
// Этап 6 — полноценная админка (меню, QR, смены, аудит).
import { useEffect, useState } from 'react';

type TableRow = { id: string; label: string; kind: string };

export default function AdminPage() {
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
    const token = window.prompt('Введите ADMIN_ACCESS_TOKEN (тот же, что в Vercel env):');
    if (!token) return;
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'x-admin-token': token.trim() },
      });
      const j = await res.json();
      if (!res.ok) {
        setSeedMsg({ ok: false, text: `Ошибка: ${j.error ?? res.status}` });
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
        <p className="eyebrow">THE OBJECT · Админка</p>
        <h1 className="adm__title">Столы</h1>
      </header>

      {error && <div className="adm__card adm__card--err">Ошибка: {error}</div>}

      <section className="adm__card">
        <h2 className="adm__h2">Засевка демо-данных</h2>
        <p className="adm__note">
          Создаёт 15 столов и 3 основы конструктора (Джин-тоник, Лимонад, Кофе).
          Идемпотентна — повторный вызов перезаписывает меню.
        </p>
        <button
          className={`adm__btn${seeding ? ' adm__btn--busy' : ''}`}
          onClick={seed}
          disabled={seeding}
        >
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
