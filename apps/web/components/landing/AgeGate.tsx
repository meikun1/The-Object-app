'use client';
// 18+ возрастной gate. Показывается на первом визите, ответ запоминается
// в localStorage. Нужен по 38-ФЗ «О рекламе» (ст. 21, 23) — публичный показ
// алкоголя и табака требует подтверждения совершеннолетия.
import { useEffect, useState } from 'react';

const KEY = 'object_age_confirmed_v1';

export default function AgeGate() {
  const [state, setState] = useState<'pending' | 'show' | 'declined' | 'ok'>('pending');

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'yes') { setState('ok'); return; }
    } catch {}
    setState('show');
    document.body.classList.add('age-locked');
  }, []);

  const confirm = () => {
    try { localStorage.setItem(KEY, 'yes'); } catch {}
    document.body.classList.remove('age-locked');
    setState('ok');
  };
  const decline = () => {
    document.body.classList.remove('age-locked');
    setState('declined');
  };

  if (state === 'ok' || state === 'pending') return null;

  if (state === 'declined') {
    return (
      <div className="age-gate" role="dialog" aria-modal="true">
        <div className="age-gate__inner">
          <p className="eyebrow">THE OBJECT</p>
          <h2>Вход только для совершеннолетних</h2>
          <p className="age-gate__lead">
            Спасибо за интерес. Информация на сайте предназначена для лиц старше 18 лет.
            Возвращайтесь, когда вам исполнится восемнадцать.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="age-gate" role="dialog" aria-modal="true">
      <div className="age-gate__inner">
        <span className="age-gate__mark">18+</span>
        <h2>Вам исполнилось 18 лет?</h2>
        <p className="age-gate__lead">
          На сайте размещена информация о продукции, не рекомендованной к показу лицам
          младше восемнадцати лет (табак, кальяны, алкогольные напитки). Подтвердите,
          что вы достигли совершеннолетия.
        </p>
        <div className="age-gate__act">
          <button type="button" className="btn" onClick={confirm}>
            <span>Мне 18 и больше</span>
          </button>
          <button type="button" className="btn ghost" onClick={decline}>
            <span>Мне нет 18</span>
          </button>
        </div>
        <p className="age-gate__legal">
          Курение и употребление алкоголя вредит вашему здоровью.
        </p>
      </div>
    </div>
  );
}
