'use client';
// Редактор меню для админки. Дерево: Основы → Группы → Модификаторы.
// Все действия защищены ADMIN_ACCESS_TOKEN, переданным props'ом.
import { useEffect, useState } from 'react';

export type Modifier = {
  id: string; name: string; priceDelta: string;
  defaultSelected: boolean; available: boolean; sortOrder: number;
};
export type Group = {
  id: string; name: string; required: boolean;
  minSelect: number; maxSelect: number; sortOrder: number;
  modifiers: Modifier[];
};
export type Base = {
  id: string; name: string; description: string | null;
  price: string; category: string | null;
  available: boolean; sortOrder: number;
  groups: Group[];
};

type EditTarget =
  | { kind: 'base'; base: Base | null }
  | { kind: 'group'; group: Group | null; baseId: string }
  | { kind: 'mod'; mod: Modifier | null; groupId: string };

export default function MenuEditor({ token }: { token: string }) {
  const [bases, setBases] = useState<Base[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await fetch('/api/admin/menu', { headers: { 'x-admin-token': token } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? String(r.status));
      setBases(j.bases ?? []);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const send = async (url: string, method: string, body?: any) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `Ошибка ${r.status}`);
      }
      return r.json();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      throw e;
    } finally { setBusy(false); }
  };

  const toggleBaseAvail = async (b: Base) => {
    await send(`/api/admin/bases/${b.id}`, 'PATCH', { available: !b.available });
    load();
  };
  const toggleModAvail = async (m: Modifier) => {
    await send(`/api/admin/modifiers/${m.id}`, 'PATCH', { available: !m.available });
    load();
  };
  const delBase = async (b: Base) => {
    if (!confirm(`Удалить «${b.name}»? Группы и модификаторы тоже удалятся.`)) return;
    await send(`/api/admin/bases/${b.id}`, 'DELETE');
    load();
  };
  const delGroup = async (g: Group) => {
    if (!confirm(`Удалить группу «${g.name}»? Модификаторы тоже удалятся.`)) return;
    await send(`/api/admin/groups/${g.id}`, 'DELETE');
    load();
  };
  const delMod = async (m: Modifier) => {
    if (!confirm(`Удалить «${m.name}»?`)) return;
    await send(`/api/admin/modifiers/${m.id}`, 'DELETE');
    load();
  };

  return (
    <section className="adm__card">
      <div className="adm__row-h2">
        <h2 className="adm__h2">Меню</h2>
        <button className="trow__btn" onClick={() => setEdit({ kind: 'base', base: null })}>
          + Основа
        </button>
      </div>
      <p className="adm__note">
        Основы, группы модификаторов и сами модификаторы. Тык по строке —
        редактировать. Чекбокс «есть в продаже» — мгновенный стоп-лист.
      </p>

      {err && <p className="adm__msg adm__msg--err">{err}</p>}
      {bases === null && <p className="adm__note">Загружаем…</p>}
      {bases && bases.length === 0 && (
        <p className="adm__note">Меню пустое. Нажмите «+ Основа» или «Засеять демо-данные».</p>
      )}

      <div className="me">
        {bases?.map((b) => (
          <div key={b.id} className={`me__base${b.available ? '' : ' me__base--off'}`}>
            <div className="me__base-head">
              <button
                className="me__base-toggle"
                onClick={() => setOpen((o) => ({ ...o, [b.id]: !o[b.id] }))}
                aria-label={open[b.id] ? 'Свернуть' : 'Развернуть'}
              >
                {open[b.id] ? '▾' : '▸'}
              </button>
              <button
                className="me__base-title"
                onClick={() => setEdit({ kind: 'base', base: b })}
              >
                <span>{b.name}</span>
                {b.category && <em className="me__cat">{b.category}</em>}
                <i>{Number(b.price).toLocaleString('ru-RU')} ₽</i>
              </button>
              <label className="me__avail" title="Есть в продаже">
                <input
                  type="checkbox"
                  checked={b.available}
                  onChange={() => toggleBaseAvail(b)}
                  disabled={busy}
                />
              </label>
              <button className="trow__btn trow__btn--danger me__del" onClick={() => delBase(b)} disabled={busy}>✕</button>
            </div>
            {b.description && open[b.id] && <p className="me__desc">{b.description}</p>}

            {open[b.id] && (
              <div className="me__groups">
                {b.groups.map((g) => (
                  <div key={g.id} className="me__group">
                    <div className="me__group-head">
                      <button className="me__group-title" onClick={() => setEdit({ kind: 'group', group: g, baseId: b.id })}>
                        {g.name}
                        <i>
                          {g.required ? 'обяз.' : 'опц.'} · {g.minSelect}–{g.maxSelect}
                        </i>
                      </button>
                      <button className="trow__btn trow__btn--danger me__del" onClick={() => delGroup(g)} disabled={busy}>✕</button>
                    </div>
                    <div className="me__mods">
                      {g.modifiers.map((m) => (
                        <div key={m.id} className={`me__mod${m.available ? '' : ' me__mod--off'}`}>
                          <button className="me__mod-name" onClick={() => setEdit({ kind: 'mod', mod: m, groupId: g.id })}>
                            {m.name}
                            {m.defaultSelected && <em className="me__default" title="Выбран по умолчанию">★</em>}
                            {Number(m.priceDelta) !== 0 && (
                              <i>{Number(m.priceDelta) > 0 ? '+' : ''}{Number(m.priceDelta).toLocaleString('ru-RU')} ₽</i>
                            )}
                          </button>
                          <label className="me__avail-mini" title="Есть в продаже">
                            <input type="checkbox" checked={m.available} onChange={() => toggleModAvail(m)} disabled={busy} />
                          </label>
                          <button className="me__del-mini" onClick={() => delMod(m)} disabled={busy} aria-label="Удалить">✕</button>
                        </div>
                      ))}
                      <button className="me__add" onClick={() => setEdit({ kind: 'mod', mod: null, groupId: g.id })}>
                        + модификатор
                      </button>
                    </div>
                  </div>
                ))}
                <button className="me__add" onClick={() => setEdit({ kind: 'group', group: null, baseId: b.id })}>
                  + группа
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {edit && (
        <EditModal
          target={edit}
          token={token}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }}
        />
      )}
    </section>
  );
}

/* ============================== МОДАЛКА ============================== */
function EditModal({
  target, token, onClose, onSaved,
}: { target: EditTarget; token: string; onClose: () => void; onSaved: () => void }) {
  if (target.kind === 'base') return <BaseModal base={target.base} token={token} onClose={onClose} onSaved={onSaved} />;
  if (target.kind === 'group') return <GroupModal group={target.group} baseId={target.baseId} token={token} onClose={onClose} onSaved={onSaved} />;
  return <ModModal mod={target.mod} groupId={target.groupId} token={token} onClose={onClose} onSaved={onSaved} />;
}

function BaseModal({
  base, token, onClose, onSaved,
}: { base: Base | null; token: string; onClose: () => void; onSaved: () => void }) {
  const isNew = !base;
  const [name, setName] = useState(base?.name ?? '');
  const [description, setDescription] = useState(base?.description ?? '');
  const [category, setCategory] = useState(base?.category ?? '');
  const [price, setPrice] = useState(base?.price ?? '');
  const [available, setAvailable] = useState<boolean>(base?.available ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body = isNew
        ? { name, description: description || undefined, price, category: category || undefined }
        : { name, description, price, category, available };
      const r = await fetch(isNew ? '/api/admin/bases' : `/api/admin/bases/${base!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `Ошибка ${r.status}`);
      onSaved();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title={isNew ? 'Новая основа' : (base!.name)} onClose={onClose}>
      <form onSubmit={save}>
        <label className="ed__fld">
          <span>Название</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="напр. «Джин-тоник»" />
        </label>
        <label className="ed__fld">
          <span>Описание (опц.)</span>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="короткая подсказка для гостя" />
        </label>
        <label className="ed__fld">
          <span>Категория (опц.)</span>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} list="cat-suggestions" placeholder="напр. «Коктейли», «Кофе», «Лимонады»" />
          <datalist id="cat-suggestions">
            <option value="Коктейли" />
            <option value="Кофе" />
            <option value="Лимонады" />
            <option value="Чай" />
            <option value="Снеки" />
            <option value="Мороженое" />
          </datalist>
        </label>
        <label className="ed__fld">
          <span>Цена, ₽</span>
          <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="350" />
        </label>
        {!isNew && (
          <label className="ed__check">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            <span>Есть в продаже</span>
          </label>
        )}
        {err && <p className="adm__msg adm__msg--err">{err}</p>}
        <div className="ed__act">
          <button type="submit" className="adm__btn" disabled={busy}>
            {busy ? 'Сохраняем…' : (isNew ? 'Создать' : 'Сохранить')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function GroupModal({
  group, baseId, token, onClose, onSaved,
}: { group: Group | null; baseId: string; token: string; onClose: () => void; onSaved: () => void }) {
  const isNew = !group;
  const [name, setName] = useState(group?.name ?? '');
  const [required, setRequired] = useState<boolean>(group?.required ?? false);
  const [minSelect, setMinSelect] = useState<number>(group?.minSelect ?? 0);
  const [maxSelect, setMaxSelect] = useState<number>(group?.maxSelect ?? 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body = { name, required, minSelect, maxSelect, ...(isNew ? { baseId } : {}) };
      const r = await fetch(isNew ? '/api/admin/groups' : `/api/admin/groups/${group!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `Ошибка ${r.status}`);
      onSaved();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title={isNew ? 'Новая группа' : group!.name} onClose={onClose}>
      <form onSubmit={save}>
        <label className="ed__fld">
          <span>Название группы</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus placeholder="напр. «Крепость» или «Цитрус»" />
        </label>
        <label className="ed__check">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          <span>Обязательный выбор</span>
        </label>
        <div className="ed__row">
          <label className="ed__fld">
            <span>Мин. выбор</span>
            <input type="number" min={0} max={10} value={minSelect} onChange={(e) => setMinSelect(Number(e.target.value))} />
          </label>
          <label className="ed__fld">
            <span>Макс. выбор</span>
            <input type="number" min={1} max={10} value={maxSelect} onChange={(e) => setMaxSelect(Number(e.target.value))} />
          </label>
        </div>
        {err && <p className="adm__msg adm__msg--err">{err}</p>}
        <div className="ed__act">
          <button type="submit" className="adm__btn" disabled={busy}>
            {busy ? 'Сохраняем…' : (isNew ? 'Создать' : 'Сохранить')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModModal({
  mod, groupId, token, onClose, onSaved,
}: { mod: Modifier | null; groupId: string; token: string; onClose: () => void; onSaved: () => void }) {
  const isNew = !mod;
  const [name, setName] = useState(mod?.name ?? '');
  const [priceDelta, setPriceDelta] = useState(mod?.priceDelta ?? '0');
  const [available, setAvailable] = useState<boolean>(mod?.available ?? true);
  const [defaultSelected, setDefaultSelected] = useState<boolean>(mod?.defaultSelected ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body = { name, priceDelta, defaultSelected, ...(isNew ? { groupId } : { available }) };
      const r = await fetch(isNew ? '/api/admin/modifiers' : `/api/admin/modifiers/${mod!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `Ошибка ${r.status}`);
      onSaved();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title={isNew ? 'Новый модификатор' : mod!.name} onClose={onClose}>
      <form onSubmit={save}>
        <label className="ed__fld">
          <span>Название</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus placeholder="напр. «Двойной» или «Лайм»" />
        </label>
        <label className="ed__fld">
          <span>Доплата, ₽ (0, если без доплаты)</span>
          <input type="text" inputMode="decimal" value={priceDelta} onChange={(e) => setPriceDelta(e.target.value)} placeholder="0" />
        </label>
        <label className="ed__check">
          <input type="checkbox" checked={defaultSelected} onChange={(e) => setDefaultSelected(e.target.checked)} />
          <span>Выбран по умолчанию (для «Айс-латте с ванилью» и т.п.)</span>
        </label>
        {!isNew && (
          <label className="ed__check">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            <span>Есть в продаже</span>
          </label>
        )}
        {err && <p className="adm__msg adm__msg--err">{err}</p>}
        <div className="ed__act">
          <button type="submit" className="adm__btn" disabled={busy}>
            {busy ? 'Сохраняем…' : (isNew ? 'Создать' : 'Сохранить')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="qrmodal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qrmodal__inner ed">
        <button type="button" className="qrmodal__close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h3 className="qrmodal__title">{title}</h3>
        {children}
      </div>
    </div>
  );
}
