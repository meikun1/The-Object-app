'use client';
// Печатная страница со всеми QR-кодами столов под A4.
// Открыть Cmd+P / Ctrl+P → выбрать PDF или принтер. На A4 умещается 4 QR
// (10×10 см каждый — комфортно для гостя со столика 50-70 см).
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'object_admin_token';

type TableRow = { id: string; label: string; kind: string };
type QrPayload = { url: string; png: string };

export default function PrintQrPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [qrs, setQrs] = useState<Record<string, QrPayload>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) ?? '' : '';
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/tables', { headers: { 'x-admin-token': token } })
      .then((r) => r.json())
      .then((j) => setTables((j.tables ?? []).filter((x: TableRow & { active?: boolean }) => x.active !== false)))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [token]);

  useEffect(() => {
    if (!token || tables.length === 0) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, QrPayload> = {};
      for (const t of tables) {
        try {
          const r = await fetch(`/api/admin/tables/${t.id}/qr`, { headers: { 'x-admin-token': token } });
          if (r.ok) {
            const j = await r.json();
            out[t.id] = { url: j.url, png: j.png };
          }
        } catch {}
        if (cancelled) return;
      }
      if (!cancelled) setQrs(out);
    })();
    return () => { cancelled = true; };
  }, [token, tables]);

  const print = () => window.print();

  if (token === null) return null;
  if (!token) {
    return (
      <main className="adm adm--login">
        <div className="login">
          <h1 className="login__title">Войдите</h1>
          <p className="login__hint">
            Сначала зайдите в <a href="/admin" style={{ color: 'var(--blood)' }}>/admin</a>, потом вернитесь сюда.
          </p>
        </div>
      </main>
    );
  }

  const ready = tables.length > 0 && Object.keys(qrs).length === tables.length;

  return (
    <main className="printqr">
      <header className="printqr__bar no-print">
        <div>
          <h1>Печать QR-наклеек</h1>
          <p>{ready ? `Готово: ${tables.length} столов` : `Готовим QR… ${Object.keys(qrs).length} из ${tables.length}`}</p>
          {err && <p style={{ color: 'var(--blood)' }}>Ошибка: {err}</p>}
        </div>
        <div className="printqr__act">
          <a href="/admin" className="printqr__back">← Назад в админку</a>
          <button className="printqr__print" onClick={print} disabled={!ready}>
            Печать / Сохранить PDF
          </button>
        </div>
      </header>

      <p className="printqr__hint no-print">
        Откройте «Печать» (⌘+P / Ctrl+P), выберите «Сохранить как PDF» или принтер.
        На A4 умещается 4 наклейки 10×10 см. После печати — разрежьте, ламинируйте,
        наклейте на стол. На каждой наклейке внизу подписан номер стола.
      </p>

      <div className="printqr__sheet">
        {tables.map((t) => {
          const q = qrs[t.id];
          return (
            <article className="qrcard" key={t.id}>
              <div className="qrcard__hairline" />
              <div className="qrcard__brand">
                <img className="qrcard__logoTop" src="/img/object-logo.svg" alt="THE OBJECT" />
              </div>
              <p className="qrcard__hint">Отсканируйте, чтобы собрать заказ</p>
              {q ? (
                <div className="qrcard__qrwrap">
                  <img className="qrcard__qr" src={q.png} alt={`QR — ${t.label}`} />
                  <img className="qrcard__logoMid" src="/img/object-logo.svg" alt="" aria-hidden="true" />
                </div>
              ) : (
                <div className="qrcard__qr qrcard__qr--loading">…</div>
              )}
              <div className="qrcard__label">
                <b>{t.label}</b>
                {t.kind === 'VIP' && <span className="qrcard__vip">VIP</span>}
              </div>
              <p className="qrcard__leg">Меню за столом · оплата у бармена</p>
              <div className="qrcard__hairline qrcard__hairline--b" />
            </article>
          );
        })}
      </div>
    </main>
  );
}
