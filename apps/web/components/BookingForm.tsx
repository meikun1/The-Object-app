'use client';

// Форма брони. Отправляет JSON на /api/booking; токен бота держим
// на сервере (Next.js API route → Telegram). Без Cloudflare-прокси.
import { useState, useRef } from 'react';

const today = () => new Date().toISOString().split('T')[0];

export default function BookingForm() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (data.company) return; // honeypot

    setBusy(true);
    setStatus('Отправляем заявку…');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus(`Принято, ${data.name || 'гость'}. Мы перезвоним для подтверждения.`);
      form.reset();
    } catch {
      setStatus('Не удалось отправить. Позвоните нам: +7 (900) 333-30-26');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} className="book reveal" id="booking" noValidate onSubmit={submit}>
      <h3 className="book__title">Бронь&nbsp;стола</h3>
      <div className="book__row">
        <label className="fld"><span>Имя</span><input type="text" name="name" required placeholder="Как к вам обращаться" /></label>
        <label className="fld"><span>Телефон</span><input type="tel" name="phone" required placeholder="+7 ___ ___-__-__" /></label>
      </div>
      <div className="book__row">
        <label className="fld"><span>Дата</span><input type="date" name="date" required min={today()} /></label>
        <label className="fld"><span>Время</span><input type="time" name="time" required /></label>
        <label className="fld fld--s"><span>Гостей</span><input type="number" name="guests" min={1} max={30} defaultValue={2} /></label>
      </div>
      <label className="fld"><span>Пожелания</span><input type="text" name="note" placeholder="Кальян, повод, столик у окна…" /></label>
      <input type="text" name="company" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" className="btn btn--solid book__go" data-magnetic disabled={busy}>
        {busy ? 'Отправляем…' : 'Отправить заявку'}
      </button>
      <p className="book__status" role="status">{status}</p>
    </form>
  );
}
