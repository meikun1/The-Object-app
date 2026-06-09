// Гостевой конструктор за столом. Открывается по подписанному QR
// «/t/{table_id}?sig=...». Полная реализация — Этап 2 дорожной карты.
type Props = { params: { token: string } };

export default function GuestPage({ params }: Props) {
  return (
    <main className="wrap">
      <p className="eyebrow">THE OBJECT · Заказ за столом</p>
      <h1>Стол открыт</h1>
      <p style={{ color: 'var(--dim)' }}>
        Токен сессии: <code style={{ color: 'var(--ink)' }}>{params.token}</code>
      </p>

      <div className="card">
        <b>Этап 2.</b> Здесь будет конструктор: основа → группы модификаторов → корзина стола.
        Каркас сессий и подписанных токенов готовится отдельным PR.
      </div>

      <div className="card">
        <a href="/" style={{ color: 'var(--blood)' }}>← Вернуться на главную</a>
      </div>
    </main>
  );
}
