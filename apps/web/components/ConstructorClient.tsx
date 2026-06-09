'use client';

// Гостевой конструктор. Общая корзина стола: каждый гость вводит имя
// один раз, добавляет позиции в общую корзину, видит, что добавили другие,
// общий счёт. «Отправить заказ» отправляет всё одним заказом, корзина
// очищается — можно дозаказать.
//
// localStorage: `object_guest_<tableId>` = { name, guestId }
// Серверное состояние тянем поллингом каждые ~2 с.
import { useEffect, useMemo, useRef, useState } from 'react';

type Modifier = { id: string; name: string; priceDelta: string; defaultSelected?: boolean };
type Group = {
  id: string; name: string;
  required: boolean; minSelect: number; maxSelect: number;
  modifiers: Modifier[];
};
type Base = {
  id: string; name: string;
  description: string | null; price: string;
  category?: string | null;
  groups: Group[];
};

type CartLine = {
  id: string;
  guestId: string;
  guestName: string;
  summary: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
};

type OrderRow = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'REJECTED';
  total: string;
  createdAt: string;
  items: { guestName: string; summary: string; qty: number; lineTotal: string }[];
};

type State = {
  tableLabel: string;
  sessionId: string;
  cart: CartLine[];
  cartTotal: string;
  orders: OrderRow[];
};

type Props = {
  tableId: string;        // плоский id (для localStorage)
  token: string;          // подписанный <tableId>.<sig> для запросов
  tableLabel: string;
  bases: Base[];
};

const fmt = (n: number | string) => Number(n).toLocaleString('ru-RU');
const cartKey = (id: string) => `object_guest_${id}`;

/** Группируем основы по категориям, сохраняя порядок появления. */
function basesByCategory(bases: Base[]): { name: string; items: Base[] }[] {
  const map = new Map<string, Base[]>();
  for (const b of bases) {
    const key = b.category?.trim() || '';
    const arr = map.get(key) ?? [];
    arr.push(b);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
}

export default function ConstructorClient({ tableId, token, tableLabel, bases }: Props) {
  const [me, setMe] = useState<{ name: string; guestId: string | null } | null>(null);
  const [showName, setShowName] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [picking, setPicking] = useState<Base | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // === Загрузка имени из localStorage ===
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartKey(tableId));
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.name) {
          setMe({ name: p.name, guestId: p.guestId ?? null });
          return;
        }
      }
    } catch {}
    setShowName(true);
  }, [tableId]);

  // === Поллинг состояния ===
  const refresh = async () => {
    try {
      const r = await fetch(`/api/t/${token}/state`, { cache: 'no-store' });
      if (r.ok) {
        const j = (await r.json()) as State;
        setState(j);
      }
    } catch {}
  };
  useEffect(() => {
    refresh();
    pollRef.current = window.setInterval(refresh, 2500) as unknown as number;
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // === Действия ===
  const setName = (name: string) => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    setMe((prev) => ({ name: trimmed, guestId: prev?.guestId ?? null }));
    localStorage.setItem(
      cartKey(tableId),
      JSON.stringify({ name: trimmed, guestId: me?.guestId ?? null }),
    );
    setShowName(false);
  };

  const addToCart = async (base: Base, selections: Record<string, string[]>, qty: number) => {
    if (!me) { setShowName(true); return; }
    setErr(null);
    const modifierIds = Object.values(selections).flat();
    try {
      const r = await fetch(`/api/t/${token}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: me.guestId,
          guestName: me.name,
          baseId: base.id,
          modifierIds,
          qty,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `Ошибка ${r.status}`);
      }
      const j = await r.json();
      const newMe = { name: me.name, guestId: j.guestId };
      setMe(newMe);
      localStorage.setItem(cartKey(tableId), JSON.stringify(newMe));
      setPicking(null);
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };

  /** Тап по карточке: с модификаторами — открываем модалку, без — кладём сразу. */
  const onPick = (base: Base) => {
    if (!me) { setShowName(true); return; }
    if (base.groups.length === 0) {
      // 1-tap add: дефолтных модификаторов нет → пустые selections, qty = 1.
      void addToCart(base, {}, 1);
    } else {
      setPicking(base);
    }
  };

  const removeItem = async (cartId: string) => {
    setErr(null);
    try {
      await fetch(`/api/t/${token}/cart/${cartId}`, { method: 'DELETE' });
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };

  const submit = async () => {
    if (!state || state.cart.length === 0) return;
    setSending(true); setErr(null);
    try {
      const r = await fetch(`/api/t/${token}/order`, { method: 'POST' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `Ошибка ${r.status}`);
      }
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally { setSending(false); }
  };

  // === Render ===
  if (showName || !me) {
    return <NamePrompt tableLabel={tableLabel} onSubmit={setName} />;
  }

  const cart = state?.cart ?? [];
  const orders = state?.orders ?? [];
  const others = cart.filter((c) => c.guestId !== me.guestId);
  const mine = cart.filter((c) => c.guestId === me.guestId);

  return (
    <main className="ctr">
      <header className="ctr__head">
        <p className="eyebrow">THE OBJECT · {tableLabel}</p>
        <h1 className="ctr__title">Соберите свой напиток</h1>
        <div className="ctr__you">
          Вы — <b>{me.name}</b>{' '}
          <button className="ctr__chname" onClick={() => setShowName(true)}>сменить</button>
        </div>
      </header>

      {orders.length > 0 && <OrdersHistory orders={orders} />}

      {basesByCategory(bases).map((cat) => (
        <section key={cat.name} className="ctr__catsec">
          {cat.name && <h2 className="ctr__catsec-title">{cat.name}</h2>}
          <div className="ctr__bases">
            {cat.items.map((b) => (
              <article key={b.id} className="bcard" onClick={() => onPick(b)}>
                <h3 className="bcard__name">{b.name}</h3>
                {b.description && <p className="bcard__desc">{b.description}</p>}
                <div className="bcard__price">
                  {fmt(b.price)} ₽
                  {b.groups.length === 0 && <span className="bcard__tap">тап → в корзину</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="ctr__pad" />

      <CartBar
        mine={mine}
        others={others}
        total={state?.cartTotal ?? '0'}
        err={err}
        sending={sending}
        onRemove={removeItem}
        onSubmit={submit}
        canSubmit={cart.length > 0}
      />

      {picking && (
        <Picker
          key={picking.id}
          base={picking}
          onClose={() => setPicking(null)}
          onAdd={(sel, qty) => addToCart(picking, sel, qty)}
        />
      )}
    </main>
  );
}

/* =========================== ввод имени =========================== */
function NamePrompt({
  tableLabel, onSubmit,
}: { tableLabel: string; onSubmit: (name: string) => void }) {
  const [v, setV] = useState('');
  return (
    <main className="adm adm--login">
      <form
        className="login"
        onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}
      >
        <p className="eyebrow">THE OBJECT · {tableLabel}</p>
        <h1 className="login__title">Здравствуйте</h1>
        <p className="login__hint">
          Как к вам обращаться? Имя увидят остальные гости стола и бармен.
        </p>
        <label className="login__fld">
          <span>Имя</span>
          <input
            type="text"
            autoFocus
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="напр. Дима"
            maxLength={40}
          />
        </label>
        <button type="submit" className="adm__btn" disabled={!v.trim()}>
          Продолжить
        </button>
      </form>
    </main>
  );
}

/* =========================== история заказов =========================== */
function OrdersHistory({ orders }: { orders: OrderRow[] }) {
  const statusText: Record<OrderRow['status'], string> = {
    PENDING: 'Ждём бармена',
    ACCEPTED: 'Готовится',
    READY: 'Готов',
    REJECTED: 'Отклонён',
  };
  const statusClass: Record<OrderRow['status'], string> = {
    PENDING: 'oh__chip--pending',
    ACCEPTED: 'oh__chip--accepted',
    READY: 'oh__chip--ready',
    REJECTED: 'oh__chip--rejected',
  };
  return (
    <section className="oh">
      <h2 className="oh__title">Уже отправлено</h2>
      <ul className="oh__list">
        {orders.map((o) => (
          <li key={o.id} className="oh__row">
            <div className="oh__head">
              <span className="oh__id">#{o.id.slice(-6).toUpperCase()}</span>
              <span className={`oh__chip ${statusClass[o.status]}`}>{statusText[o.status]}</span>
              <span className="oh__total">{fmt(o.total)} ₽</span>
            </div>
            <ul className="oh__items">
              {o.items.map((it, i) => (
                <li key={i}>
                  <b>{it.qty}×</b> {it.summary}{' '}
                  <span className="oh__by">— {it.guestName}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* =========================== корзина (sticky bottom) =========================== */
function CartBar({
  mine, others, total, err, sending, onRemove, onSubmit, canSubmit,
}: {
  mine: CartLine[];
  others: CartLine[];
  total: string;
  err: string | null;
  sending: boolean;
  onRemove: (id: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (mine.length === 0 && others.length === 0) {
    return null;
  }

  // Группируем «других» по имени гостя.
  const byOther = new Map<string, CartLine[]>();
  for (const c of others) {
    const arr = byOther.get(c.guestName) ?? [];
    arr.push(c);
    byOther.set(c.guestName, arr);
  }

  return (
    <section className={`ctr__cart${open ? ' ctr__cart--open' : ''}`}>
      <button className="ctr__cart-handle" onClick={() => setOpen((o) => !o)}>
        <span>{open ? 'Свернуть' : `Корзина · ${mine.length + others.length}`}</span>
        <b>{fmt(total)} ₽</b>
      </button>

      {open && (
        <div className="ctr__cart-body">
          {mine.length > 0 && (
            <>
              <h4 className="ctr__cart-group">Моё</h4>
              <ul className="ctr__cart-list">
                {mine.map((it) => (
                  <CartRow key={it.id} item={it} onRemove={onRemove} canRemove />
                ))}
              </ul>
            </>
          )}
          {Array.from(byOther.entries()).map(([name, items]) => (
            <div key={name}>
              <h4 className="ctr__cart-group">{name}</h4>
              <ul className="ctr__cart-list">
                {items.map((it) => (
                  <CartRow key={it.id} item={it} onRemove={onRemove} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="ctr__cart-foot">
        {err && <p className="ctr__err">{err}</p>}
        <button
          className="btn btn--solid ctr__send"
          disabled={!canSubmit || sending}
          onClick={onSubmit}
        >
          {sending ? 'Отправляем…' : `Отправить бармену · ${fmt(total)} ₽`}
        </button>
      </div>
    </section>
  );
}

function CartRow({
  item, onRemove, canRemove,
}: { item: CartLine; onRemove: (id: string) => void; canRemove?: boolean }) {
  return (
    <li className="citem">
      <div className="citem__main">
        <div className="citem__name">{item.qty}× {item.summary}</div>
        <div className="citem__price">{fmt(item.lineTotal)} ₽</div>
      </div>
      {canRemove && (
        <button className="citem__rm" onClick={() => onRemove(item.id)} aria-label="Удалить">✕</button>
      )}
    </li>
  );
}

/* =========================== модалка выбора =========================== */
// Парсим имя группы: «Шаг N · Subname» → { step: 'Шаг N', sub: 'Subname' }.
// Без префикса — отдельный «шаг» с пустой подгруппой.
function parseStep(name: string): { step: string; sub: string | null } {
  const m = name.match(/^(Шаг\s+\d+)\s*[·:|-]\s*(.+)$/i);
  if (m) return { step: m[1], sub: m[2] };
  return { step: name, sub: null };
}

function groupGroupsByStep(groups: Group[]): { step: string; items: Group[] }[] {
  const out: { step: string; items: Group[] }[] = [];
  for (const g of groups) {
    const { step } = parseStep(g.name);
    const bucket = out[out.length - 1];
    if (bucket && bucket.step === step) bucket.items.push(g);
    else out.push({ step, items: [g] });
  }
  return out;
}

const Picker = function Picker({
  base, onClose, onAdd,
}: { base: Base; onClose: () => void; onAdd: (sel: Record<string, string[]>, qty: number) => void }) {
  // Дефолтные модификаторы — первые maxSelect из тех, что defaultSelected.
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(base.groups.map((g) => [
      g.id,
      g.modifiers.filter((m) => m.defaultSelected).slice(0, g.maxSelect).map((m) => m.id),
    ])),
  );
  const [qty, setQty] = useState(1);

  // Блокируем скролл фона, пока модалка открыта.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const toggle = (g: Group, modId: string) => {
    setSelections((s) => {
      const cur = s[g.id] ?? [];
      const has = cur.includes(modId);
      let next: string[];
      if (g.maxSelect <= 1) {
        // Радио-режим: тап на выбранный — не снимаем (это обязательный выбор).
        next = has ? cur : [modId];
      } else {
        // Чекбокс-режим: повторный тап снимает; новый — добавляет, но не выше maxSelect.
        next = has ? cur.filter((x) => x !== modId) : [...cur, modId].slice(0, g.maxSelect);
      }
      return { ...s, [g.id]: next };
    });
  };

  const errors: string[] = [];
  for (const g of base.groups) {
    const sel = selections[g.id] ?? [];
    if (g.required && sel.length < Math.max(1, g.minSelect)) {
      const { sub } = parseStep(g.name);
      errors.push(`Выберите: ${sub ?? g.name}`);
    }
  }

  const unit = useMemo(() => {
    let total = Number(base.price);
    for (const g of base.groups) {
      for (const id of selections[g.id] ?? []) {
        const m = g.modifiers.find((mm) => mm.id === id);
        if (m) total += Number(m.priceDelta);
      }
    }
    return total;
  }, [base, selections]);

  const steps = useMemo(() => groupGroupsByStep(base.groups), [base.groups]);

  return (
    <div className="pmodal" role="dialog" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pmodal__inner">
        <header className="pmodal__head">
          <h2 className="pmodal__name">{base.name}</h2>
          {base.description && <p className="pmodal__desc">{base.description}</p>}
          <button className="pmodal__close" aria-label="Закрыть" onClick={onClose}>✕</button>
        </header>

        <div className="pmodal__body">
          {steps.map((s) => (
            <section className="pstep" key={s.step}>
              <h3 className="pstep__head">{s.step}</h3>
              {s.items.map((g) => {
                const { sub } = parseStep(g.name);
                return (
                  <div key={g.id} className="pgroup">
                    <h4 className="pgroup__name">
                      {sub ?? g.name}
                      <span className="pgroup__hint">
                        {g.required ? ' · обязательно' : ''}
                        {g.maxSelect > 1 ? ` · до ${g.maxSelect}` : ''}
                      </span>
                    </h4>
                    <div className="pgroup__opts">
                      {g.modifiers.map((m) => {
                        const active = (selections[g.id] ?? []).includes(m.id);
                        const delta = Number(m.priceDelta);
                        return (
                          <button
                            type="button"
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
                );
              })}
            </section>
          ))}
        </div>

        <div className="pmodal__foot">
          <div className="pmodal__qty">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
          </div>
          <button
            type="button"
            className="btn btn--solid"
            disabled={errors.length > 0}
            onClick={() => onAdd(selections, qty)}
          >
            {errors[0] ?? `В корзину · ${fmt(unit * qty)} ₽`}
          </button>
        </div>
      </div>
    </div>
  );
};
