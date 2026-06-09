'use client';

// Гостевой конструктор: список основ → модал выбора модификаторов →
// корзина → отправка заказа. Цена считается локально для предпросмотра;
// итоговая цена и валидация — на сервере в /api/orders.
import { useMemo, useState } from 'react';

type Modifier = { id: string; name: string; priceDelta: string };
type Group = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
};
type Base = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  groups: Group[];
};

type CartItem = {
  cid: string; // локальный id строки в корзине
  base: Base;
  selections: Record<string, string[]>; // groupId → [modifierId]
  qty: number;
};

type Props = {
  tableId: string;
  tableLabel: string;
  bases: Base[];
};

const fmt = (n: number) => n.toLocaleString('ru-RU');

function computeUnit(base: Base, selections: Record<string, string[]>): number {
  let total = Number(base.price);
  for (const g of base.groups) {
    for (const id of selections[g.id] ?? []) {
      const m = g.modifiers.find((mm) => mm.id === id);
      if (m) total += Number(m.priceDelta);
    }
  }
  return total;
}

function describe(base: Base, selections: Record<string, string[]>): string {
  const mods: string[] = [];
  for (const g of base.groups) {
    for (const id of selections[g.id] ?? []) {
      const m = g.modifiers.find((mm) => mm.id === id);
      if (m) mods.push(m.name);
    }
  }
  return mods.length ? `${base.name}, ${mods.join(', ')}` : base.name;
}

export default function ConstructorClient({ tableId, tableLabel, bases }: Props) {
  const [name, setName] = useState('');
  const [picking, setPicking] = useState<Base | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(
    () => cart.reduce((s, it) => s + computeUnit(it.base, it.selections) * it.qty, 0),
    [cart],
  );

  const addToCart = (item: CartItem) => {
    setCart((c) => [...c, item]);
    setPicking(null);
  };
  const remove = (cid: string) => setCart((c) => c.filter((i) => i.cid !== cid));
  const changeQty = (cid: string, delta: number) =>
    setCart((c) => c.map((i) => (i.cid === cid ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));

  const submit = async () => {
    if (!name.trim()) { setErr('Введите имя'); return; }
    if (cart.length === 0) { setErr('Корзина пуста'); return; }
    setErr(null); setSending(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          guestName: name.trim(),
          items: cart.map((c) => ({
            baseId: c.base.id,
            qty: c.qty,
            modifierIds: Object.values(c.selections).flat(),
          })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      setDone(`Заказ ${j.orderId.slice(-6).toUpperCase()} отправлен. Бармен подтвердит.`);
      setCart([]);
    } catch (e) {
      setErr('Не удалось отправить. Позовите бармена.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <main className="wrap">
        <p className="eyebrow">THE OBJECT · {tableLabel}</p>
        <h1>Принято</h1>
        <div className="card"><p>{done}</p></div>
        <div className="card">
          <button className="btn btn--line" onClick={() => setDone(null)}>Сделать ещё заказ</button>
        </div>
      </main>
    );
  }

  return (
    <main className="ctr">
      <header className="ctr__head">
        <p className="eyebrow">THE OBJECT · {tableLabel}</p>
        <h1 className="ctr__title">Соберите свой напиток</h1>
        <label className="ctr__name">
          <span>Ваше имя</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            maxLength={40}
          />
        </label>
      </header>

      <section className="ctr__bases">
        {bases.map((b) => (
          <article key={b.id} className="bcard" onClick={() => setPicking(b)}>
            <h3 className="bcard__name">{b.name}</h3>
            {b.description && <p className="bcard__desc">{b.description}</p>}
            <div className="bcard__price">{fmt(Number(b.price))} ₽</div>
          </article>
        ))}
      </section>

      {cart.length > 0 && (
        <section className="ctr__cart">
          <h2 className="ctr__cart-title">Корзина</h2>
          <ul className="ctr__cart-list">
            {cart.map((it) => {
              const unit = computeUnit(it.base, it.selections);
              return (
                <li key={it.cid} className="citem">
                  <div className="citem__main">
                    <div className="citem__name">{describe(it.base, it.selections)}</div>
                    <div className="citem__price">{fmt(unit * it.qty)} ₽</div>
                  </div>
                  <div className="citem__ctl">
                    <button onClick={() => changeQty(it.cid, -1)}>−</button>
                    <span>{it.qty}</span>
                    <button onClick={() => changeQty(it.cid, +1)}>+</button>
                    <button className="citem__rm" onClick={() => remove(it.cid)} aria-label="Удалить">✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="ctr__total">
            <span>Итого</span>
            <b>{fmt(total)} ₽</b>
          </div>
          {err && <p className="ctr__err">{err}</p>}
          <button className="btn btn--solid ctr__send" disabled={sending} onClick={submit}>
            {sending ? 'Отправляем…' : 'Отправить бармену'}
          </button>
        </section>
      )}

      {picking && (
        <Picker
          base={picking}
          onClose={() => setPicking(null)}
          onAdd={addToCart}
        />
      )}
    </main>
  );
}

function Picker({
  base, onClose, onAdd,
}: { base: Base; onClose: () => void; onAdd: (item: CartItem) => void }) {
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(base.groups.map((g) => [g.id, g.required && g.minSelect > 0 ? [] : []])),
  );
  const [qty, setQty] = useState(1);

  const toggle = (g: Group, modId: string) => {
    setSelections((s) => {
      const cur = s[g.id] ?? [];
      const has = cur.includes(modId);
      let next: string[];
      if (has) {
        next = cur.filter((x) => x !== modId);
      } else {
        next = g.maxSelect <= 1 ? [modId] : [...cur, modId].slice(0, g.maxSelect);
      }
      return { ...s, [g.id]: next };
    });
  };

  const errors: string[] = [];
  for (const g of base.groups) {
    const sel = selections[g.id] ?? [];
    if (g.required && sel.length < Math.max(1, g.minSelect)) {
      errors.push(`Выберите ${g.name}`);
    }
  }

  const unit = computeUnit(base, selections);

  return (
    <div className="pmodal" role="dialog" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pmodal__inner">
        <button className="pmodal__close" aria-label="Закрыть" onClick={onClose}>✕</button>
        <h2 className="pmodal__name">{base.name}</h2>
        {base.description && <p className="pmodal__desc">{base.description}</p>}

        {base.groups.map((g) => (
          <div key={g.id} className="pgroup">
            <h3 className="pgroup__name">
              {g.name}
              <span className="pgroup__hint">
                {g.required ? ' · обязательно' : ''}
                {g.maxSelect > 1 ? ` · до ${g.maxSelect}` : ''}
              </span>
            </h3>
            <div className="pgroup__opts">
              {g.modifiers.map((m) => {
                const active = (selections[g.id] ?? []).includes(m.id);
                const delta = Number(m.priceDelta);
                return (
                  <button
                    key={m.id}
                    className={`popt${active ? ' popt--on' : ''}`}
                    onClick={() => toggle(g, m.id)}
                  >
                    <span>{m.name}</span>
                    {delta > 0 && <i>+{fmt(delta)} ₽</i>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pmodal__foot">
          <div className="pmodal__qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
          </div>
          <button
            className="btn btn--solid"
            disabled={errors.length > 0}
            onClick={() =>
              onAdd({
                cid: Math.random().toString(36).slice(2),
                base,
                selections,
                qty,
              })
            }
          >
            {errors[0] ?? `В корзину · ${fmt(unit * qty)} ₽`}
          </button>
        </div>
      </div>
    </div>
  );
}
