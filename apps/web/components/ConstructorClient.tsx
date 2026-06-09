'use client';

// Гостевой конструктор «/t/[token]» — premium dark lounge UI.
// Общая корзина стола (поллинг 2.5 с) + конструктор шагами + статичные карточки
// меню по категориям + sticky-корзина на десктопе, нижняя панель на мобильном,
// чекаут-модалка с номером заказа.
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
  id: string; guestId: string; guestName: string;
  summary: string; qty: number; unitPrice: string; lineTotal: string;
};
type OrderRow = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'READY' | 'REJECTED';
  total: string; createdAt: string;
  items: { guestName: string; summary: string; qty: number; lineTotal: string }[];
};
type State = {
  tableLabel: string; sessionId: string;
  cart: CartLine[]; cartTotal: string; orders: OrderRow[];
};

type Props = {
  tableId: string;
  token: string;
  tableLabel: string;
  bases: Base[];
};

const fmt = (n: number | string) => Number(n).toLocaleString('ru-RU');
const cartKey = (id: string) => `object_guest_${id}`;
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, '') || 'cat';

/** Удаляет префикс «Шаг N · » если он есть. */
function stripStep(name: string): string {
  return name.replace(/^Шаг\s+\d+\s*[·:|-]\s*/i, '');
}

type Category = { id: string; name: string; bases: Base[] };
function groupByCategory(bases: Base[]): Category[] {
  const seen: string[] = [];
  const map = new Map<string, Base[]>();
  for (const b of bases) {
    const key = b.category?.trim() || 'Прочее';
    if (!map.has(key)) { map.set(key, []); seen.push(key); }
    map.get(key)!.push(b);
  }
  return seen.map((name) => ({ id: 'cat-' + slug(name), name, bases: map.get(name)! }));
}

export default function ConstructorClient({ tableId, token, tableLabel, bases }: Props) {
  const [me, setMe] = useState<{ name: string; guestId: string | null } | null>(null);
  const [showName, setShowName] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<number | null>(null);

  // localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartKey(tableId));
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.name) { setMe({ name: p.name, guestId: p.guestId ?? null }); return; }
      }
    } catch {}
    setShowName(true);
  }, [tableId]);

  // polling
  const refresh = async () => {
    try {
      const r = await fetch(`/api/t/${token}/state`, { cache: 'no-store' });
      if (r.ok) setState((await r.json()) as State);
    } catch {}
  };
  useEffect(() => {
    refresh();
    pollRef.current = window.setInterval(refresh, 2500) as unknown as number;
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // body lock when sheet/checkout open
  useEffect(() => {
    document.body.classList.toggle('order-locked', showSheet || showCheckout || showName);
    return () => document.body.classList.remove('order-locked');
  }, [showSheet, showCheckout, showName]);

  const setName = (name: string) => {
    const t = name.trim().slice(0, 40);
    if (!t) return;
    setMe((prev) => ({ name: t, guestId: prev?.guestId ?? null }));
    localStorage.setItem(cartKey(tableId), JSON.stringify({ name: t, guestId: me?.guestId ?? null }));
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
          guestId: me.guestId, guestName: me.name,
          baseId: base.id, modifierIds, qty,
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
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
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

  const checkout = async () => {
    if (!state || state.cart.length === 0) return;
    setSending(true); setErr(null);
    try {
      const r = await fetch(`/api/t/${token}/order`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `Ошибка ${r.status}`);
      setOrderNo(String(j.orderId ?? '').slice(-6).toUpperCase() || '----');
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally { setSending(false); }
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setOrderNo(null);
  };

  const categories = useMemo(() => groupByCategory(bases), [bases]);

  if (!me) {
    return <NameModal tableLabel={tableLabel} onSubmit={setName} />;
  }

  const cart = state?.cart ?? [];
  const orders = state?.orders ?? [];
  const count = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <main className="order">
      <div className="order-page">
        <div className="wrap">
          <div className="qr-brand">
            <span className="mark">O</span>
            <span className="name">The&nbsp;<b>Object</b></span>
          </div>

          <section className="order-intro">
            <span className="eyebrow">{tableLabel} · меню к столу</span>
            <h1>Соберите свой <em>заказ</em></h1>
            <p>Создайте напиток под себя или выберите из меню — официант принесёт всё к столу.</p>
            <div className="order-you">
              Вы — <b>{me.name}</b>
              <button onClick={() => setShowName(true)}>сменить</button>
            </div>
          </section>

          {orders.length > 0 && <OrdersHistory orders={orders} />}

          <CatNav categories={categories} />

          <div className="order-layout">
            <div className="order-main">
              {categories.map((cat) => {
                const constructors = cat.bases.filter((b) => b.groups.length > 0);
                const statics = cat.bases.filter((b) => b.groups.length === 0);
                return (
                  <section className="osec" id={cat.id} key={cat.id}>
                    <div className="oh">
                      <h2>{cat.name}</h2>
                      <span className="ln" />
                      <span className="cnt">{cat.bases.length} позиций</span>
                    </div>
                    {constructors.map((b) => (
                      <BuilderCard key={b.id} base={b} onAdd={(sel, qty) => addToCart(b, sel, qty)} />
                    ))}
                    {statics.length > 0 && (
                      <div className="ogrid">
                        {statics.map((b) => (
                          <ItemCard key={b.id} base={b} onAdd={() => addToCart(b, {}, 1)} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <aside className="cart desktop">
              <CartPanel cart={cart} myGuestId={me.guestId} total={state?.cartTotal ?? '0'}
                onRemove={removeItem}
                onCheckout={() => setShowCheckout(true)}
                canCheckout={cart.length > 0 && !sending} />
            </aside>
          </div>
        </div>
      </div>

      <div className={`mcart${count > 0 ? ' show' : ''}`}>
        <div className="minfo">
          <div className="mc">{count} {count === 1 ? 'позиция' : 'позиций'} · к столу</div>
          <div className="mv">{fmt(state?.cartTotal ?? '0')} ₽</div>
        </div>
        <button className="btn" onClick={() => setShowSheet(true)} type="button">
          <span>Корзина</span>
        </button>
      </div>

      {showSheet && (
        <div className="sheet show">
          <div className="scrim" onClick={() => setShowSheet(false)} />
          <div className="panel">
            <div className="grab" />
            <CartPanel cart={cart} myGuestId={me.guestId} total={state?.cartTotal ?? '0'}
              onRemove={removeItem}
              onCheckout={() => { setShowSheet(false); setShowCheckout(true); }}
              canCheckout={cart.length > 0 && !sending}
              scrolling />
          </div>
        </div>
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart} total={state?.cartTotal ?? '0'}
          sending={sending} orderNo={orderNo} err={err}
          onSubmit={checkout} onClose={closeCheckout}
        />
      )}

      {showName && me && (
        <NameModal tableLabel={tableLabel} initial={me.name} onSubmit={setName} onClose={() => setShowName(false)} />
      )}
    </main>
  );
}

/* ============================== name modal ============================== */
function NameModal({ tableLabel, initial = '', onSubmit, onClose }: {
  tableLabel: string; initial?: string; onSubmit: (n: string) => void; onClose?: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="order">
      <div className="modal show">
        <div className="scrim" onClick={onClose} />
        <div className="dialog">
          {onClose && <button className="close" onClick={onClose} aria-label="Закрыть">✕</button>}
          <h2>Здравствуйте</h2>
          <p className="msub">{tableLabel} · как к вам обращаться?</p>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
            <div className="field">
              <label>Имя</label>
              <input type="text" autoFocus value={v} onChange={(e) => setV(e.target.value)} maxLength={40} placeholder="например, Дима" />
            </div>
            <button type="submit" className="btn" disabled={!v.trim()}><span>Продолжить</span></button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================== orders history ============================== */
function OrdersHistory({ orders }: { orders: OrderRow[] }) {
  const cls: Record<OrderRow['status'], string> = {
    PENDING: 'oh-chip--pending', ACCEPTED: 'oh-chip--accepted',
    READY: 'oh-chip--ready', REJECTED: 'oh-chip--rejected',
  };
  const txt: Record<OrderRow['status'], string> = {
    PENDING: 'ждём бармена', ACCEPTED: 'готовится', READY: 'готов', REJECTED: 'отклонён',
  };
  return (
    <section className="ohistory">
      <h3>Уже отправлено</h3>
      {orders.map((o) => (
        <div className="oh-row" key={o.id}>
          <div className="oh-head">
            <span className="oh-id">#{o.id.slice(-6).toUpperCase()}</span>
            <span className={`oh-chip ${cls[o.status]}`}>{txt[o.status]}</span>
            <span className="oh-total">{fmt(o.total)} ₽</span>
          </div>
          <div className="oh-items">
            {o.items.map((it, i) => (
              <div key={i}><b>{it.qty}×</b> {it.summary} <span className="oh-by">— {it.guestName}</span></div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ============================== cat-nav ============================== */
function CatNav({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState(categories[0]?.id ?? '');
  useEffect(() => {
    const links = categories.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (!links.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((l) => io.observe(l));
    return () => io.disconnect();
  }, [categories]);
  return (
    <nav className="cat-nav">
      {categories.map((c) => (
        <a key={c.id} href={`#${c.id}`} className={active === c.id ? 'active' : ''}>{c.name}</a>
      ))}
    </nav>
  );
}

/* ============================== item card ============================== */
function ItemCard({ base, onAdd }: { base: Base; onAdd: () => void }) {
  const [ok, setOk] = useState(false);
  const click = async () => {
    await onAdd();
    setOk(true);
    setTimeout(() => setOk(false), 600);
  };
  return (
    <div className="oitem">
      <div className="oinfo">
        <h4>{base.name} <span className="pr">{fmt(base.price)} ₽</span></h4>
        {base.description && <p>{base.description}</p>}
      </div>
      <div className="qtybox">
        <button className={`addbtn${ok ? ' ok' : ''}`} onClick={click} aria-label={`Добавить ${base.name}`}>
          {ok ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}

/* ============================== builder card ============================== */
function BuilderCard({ base, onAdd }: { base: Base; onAdd: (sel: Record<string, string[]>, qty: number) => Promise<void> }) {
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(base.groups.map((g) => [
      g.id,
      g.modifiers.filter((m) => m.defaultSelected).slice(0, g.maxSelect).map((m) => m.id),
    ])),
  );
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const toggle = (g: Group, modId: string) => {
    setSelections((s) => {
      const cur = s[g.id] ?? [];
      const has = cur.includes(modId);
      let next: string[];
      if (g.maxSelect <= 1) next = has ? cur : [modId];
      else next = has ? cur.filter((x) => x !== modId) : [...cur, modId].slice(0, g.maxSelect);
      return { ...s, [g.id]: next };
    });
  };

  const errors: string[] = [];
  for (const g of base.groups) {
    const sel = selections[g.id] ?? [];
    if (g.required && sel.length < Math.max(1, g.minSelect)) {
      errors.push(`Выберите: ${stripStep(g.name)}`);
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

  const add = async () => {
    if (errors.length || busy) return;
    setBusy(true);
    await onAdd(selections, qty);
    setBusy(false);
    setOk(true);
    setTimeout(() => setOk(false), 1400);
  };

  return (
    <div className="builder">
      <div className="bhead">
        <h3>{base.name}</h3>
        {base.description && <p className="bdesc">{base.description}</p>}
      </div>
      {base.groups.map((g, idx) => {
        const sel = selections[g.id] ?? [];
        const subname = stripStep(g.name);
        const maxed = sel.length >= g.maxSelect;
        return (
          <div className="bstep" key={g.id}>
            <div className="slabel">
              <span className="num">{idx + 1}</span>
              <h4>{subname}</h4>
              <span className="hint">
                {g.required ? 'обязательно' : 'опционально'}
                {g.maxSelect > 1 ? ` · ${sel.length}/${g.maxSelect}` : ''}
              </span>
            </div>
            {g.maxSelect <= 1 ? (
              <div className="opts">
                {g.modifiers.map((m) => {
                  const on = sel.includes(m.id);
                  const delta = Number(m.priceDelta);
                  return (
                    <button key={m.id} type="button"
                      className={`opt${on ? ' sel' : ''}`}
                      onClick={() => toggle(g, m.id)}
                    >
                      <span>{m.name}</span>
                      {delta > 0 && <span className="op">+{fmt(delta)} ₽</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flavors">
                {g.modifiers.map((m) => {
                  const on = sel.includes(m.id);
                  const disabled = !on && maxed;
                  return (
                    <button key={m.id} type="button"
                      className={`flavor${on ? ' sel' : ''}${disabled ? ' disabled' : ''}`}
                      onClick={() => toggle(g, m.id)}
                    >
                      <span className="fdot" />
                      <div className="fn">{m.name}</div>
                      {Number(m.priceDelta) > 0 && <div className="ft">+{fmt(m.priceDelta)} ₽</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div className="bfoot">
        <div className="bprice">
          <span className="lbl">Цена</span>
          <span className="val">{fmt(unit * qty)}<small> ₽</small></span>
        </div>
        <button type="button" className="btn badd" disabled={errors.length > 0 || busy} onClick={add}>
          <span>{ok ? 'Добавлено ✓' : (errors[0] ?? 'Добавить в заказ')}</span>
        </button>
      </div>
    </div>
  );
}

/* ============================== cart panel ============================== */
function CartPanel({
  cart, myGuestId, total, onRemove, onCheckout, canCheckout, scrolling,
}: {
  cart: CartLine[]; myGuestId: string | null; total: string;
  onRemove: (id: string) => void; onCheckout: () => void; canCheckout: boolean;
  scrolling?: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CartLine[]>();
    for (const c of cart) {
      const k = c.guestId === myGuestId ? '__mine__' : c.guestName;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return Array.from(map.entries());
  }, [cart, myGuestId]);

  return (
    <>
      <div className="chead">
        <h3>Заказ <span className="badge">{cart.reduce((s, c) => s + c.qty, 0)}</span></h3>
      </div>
      <div className="citems" style={scrolling ? { flex: 1, overflowY: 'auto' } : undefined}>
        {cart.length === 0 ? (
          <div className="cempty">
            <div className="ic">✦</div>
            <p>Корзина пуста.<br/>Соберите напиток или выберите из меню.</p>
          </div>
        ) : grouped.map(([who, lines]) => (
          <div key={who}>
            <div className="cgroup">{who === '__mine__' ? 'Моё' : who}</div>
            {lines.map((it) => (
              <div className="crow" key={it.id}>
                <div className="cmain">
                  <div className="cn">{it.qty}× {it.summary}</div>
                </div>
                <div className="cright">
                  <div className="cp">{fmt(it.lineTotal)} ₽</div>
                  {it.guestId === myGuestId && (
                    <div className="cqty">
                      <button onClick={() => onRemove(it.id)} aria-label="Удалить">✕</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="cfoot">
        <div className="ctotal"><span className="t">Итого</span><span className="v">{fmt(total)} ₽</span></div>
        <button className="btn" type="button" disabled={!canCheckout} onClick={onCheckout}>
          <span>Оформить заказ</span>
        </button>
        <p className="cnote">Заказ передаётся бармену. Оплата на месте.</p>
      </div>
    </>
  );
}

/* ============================== checkout modal ============================== */
function CheckoutModal({
  cart, total, sending, orderNo, err, onSubmit, onClose,
}: {
  cart: CartLine[]; total: string;
  sending: boolean; orderNo: string | null; err: string | null;
  onSubmit: () => void; onClose: () => void;
}) {
  if (orderNo) {
    return (
      <div className="modal show">
        <div className="scrim" onClick={onClose} />
        <div className="dialog">
          <button className="close" onClick={onClose} aria-label="Закрыть">✕</button>
          <div className="osuccess">
            <div className="ic">✦</div>
            <h2>Заказ принят</h2>
            <p>Бармен подтвердит и вы увидите статус в блоке «Уже отправлено».</p>
            <div className="ono">№ {orderNo}</div>
            <button className="btn" onClick={onClose} type="button"><span>Продолжить</span></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal show">
      <div className="scrim" onClick={onClose} />
      <div className="dialog">
        <button className="close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h2>Оформление</h2>
        <p className="msub">Проверьте состав — и подтвердите заказ. Стол мы уже знаем по QR.</p>
        <div className="msum">
          {cart.map((c) => (
            <div className="ms" key={c.id}>
              <span>{c.qty}× {c.summary} <span style={{ color: 'var(--muted)' }}>— {c.guestName}</span></span>
              <span>{fmt(c.lineTotal)} ₽</span>
            </div>
          ))}
          <div className="mt"><span>Итого</span><span>{fmt(total)} ₽</span></div>
        </div>
        {err && <p className="modal-err">{err}</p>}
        <button className="btn" type="button" disabled={sending} onClick={onSubmit}>
          <span>{sending ? 'Отправляем…' : 'Подтвердить заказ'}</span>
        </button>
      </div>
    </div>
  );
}
