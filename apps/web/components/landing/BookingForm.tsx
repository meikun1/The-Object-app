'use client';
// Форма брони на лендинге. Использует существующий /api/booking → Telegram.
import { useState } from 'react';

const today = () => new Date().toISOString().split('T')[0];

export default function BookingForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) { setErr('Для отправки нужно дать согласие на обработку данных.'); return; }
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (data.company) return; // honeypot
    // Берём активную кнопку гостей.
    const guestsBtn = form.querySelector<HTMLButtonElement>('.guests button.sel');
    data.guests = guestsBtn?.textContent?.trim() ?? data.guests ?? '2';

    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone(true);
    } catch {
      setErr('Не удалось отправить. Позвоните: +7 (900) 333-30-26');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      // data-reveal НЕ ставим: новый узел не наблюдается IntersectionObserver'ом
      // и оставался бы opacity:0 — то самое «исчезает окно после отправки».
      <div className="form">
        <div className="ok">
          <div className="ic">✦</div>
          <h3>Заявка принята</h3>
          <p>Мы перезвоним в течение 15 минут, чтобы подтвердить бронь. До встречи в The Object.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="form" id="bookForm" onSubmit={submit} noValidate data-reveal data-delay="2">
      <div className="form-body">
        <div className="row">
          <div className="field">
            <label>Имя</label>
            <input type="text" name="name" placeholder="Как к вам обращаться" required maxLength={60} />
          </div>
          <div className="field">
            <label>Телефон</label>
            <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" required maxLength={30} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Дата</label>
            <input type="date" name="date" required min={today()} />
          </div>
          <div className="field">
            <label>Время</label>
            <input type="time" name="time" defaultValue="20:00" required />
          </div>
        </div>
        <div className="field">
          <label>Гостей</label>
          <div className="guests">
            <button type="button">2</button>
            <button type="button" className="sel">3–4</button>
            <button type="button">5–6</button>
            <button type="button">7+</button>
          </div>
        </div>
        <div className="field">
          <label>Пожелания</label>
          <textarea name="note" placeholder="Зал, повод, любимый вкус…" maxLength={500} />
        </div>
        <input type="text" name="company" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label className="form-consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            Я даю согласие на обработку моих персональных данных в соответствии с
            <a href="/privacy" target="_blank" rel="noopener"> Политикой</a>. Подтверждаю, что мне исполнилось 18 лет.
          </span>
        </label>
        <button className="btn" type="submit" disabled={busy || !consent}>
          <span>{busy ? 'Отправляем…' : 'Отправить заявку'}</span>
        </button>
        {err && <p className="form-err">{err}</p>}
      </div>
    </form>
  );
}
