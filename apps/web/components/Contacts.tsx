export default function Contacts() {
  return (
    <div className="contacts__info reveal">
      <div className="cr">
        <span className="cr__k">Адрес</span>
        <a className="cr__v" href="https://yandex.ru/maps/?text=Адмиральского%2037а" target="_blank" rel="noopener">Адмиральского, 37а</a>
      </div>
      <div className="cr">
        <span className="cr__k">Часы</span>
        <span className="cr__v">Вс-Чт 12:00-02:00, Пт-Сб 12:00-03:00</span>
      </div>
      <div className="cr">
        <span className="cr__k">Телефон</span>
        <a className="cr__v" href="tel:+79003333026">+7 (900) 333-30-26</a>
      </div>
      <div className="cr">
        <span className="cr__k">Соцсети</span>
        <span className="cr__v cr__soc">
          <a href="#">Instagram</a><a href="#">Telegram</a><a href="#">WhatsApp</a>
        </span>
      </div>
    </div>
  );
}
