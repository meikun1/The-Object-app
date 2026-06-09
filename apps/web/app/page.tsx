// Лендинг «/» — premium dark lounge.
// Контент пока с примерами из макета (тексты подмените под реальный бар).
// Конструктор «/t/[token]» и админка «/admin» используют свой нуар-стиль.
import LandingClient from '@/components/landing/LandingClient';
import Smoke from '@/components/landing/Smoke';
import BookingForm from '@/components/landing/BookingForm';
import ClosingTimer from '@/components/landing/ClosingTimer';
import AgeGate from '@/components/landing/AgeGate';

export default function Page() {
  return (
    <div className="landing">
      <LandingClient />
      <AgeGate />

      {/* ============ NAV ============ */}
      <header className="nav">
        <div className="wrap">
          <a className="brand" href="#top">
            <span className="mark">O</span>
            <span className="name">The&nbsp;<b>Object</b></span>
          </a>
          <nav>
            <ul className="nav-links">
              <li><a href="#about">Атмосфера</a></li>
              <li><a href="#menu">Кальяны</a></li>
              <li><a href="#bar">Бар</a></li>
              <li><a href="#events">События</a></li>
              <li><a href="#reviews">Отзывы</a></li>
              <li><a href="#contact">Контакты</a></li>
            </ul>
          </nav>
          <div className="nav-cta">
            <a href="#book" className="btn"><span>Забронировать</span></a>
            <button className="burger" aria-label="Меню"><i /><i /><i /></button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div className="nav-mobile">
        <a href="#about">Атмосфера</a>
        <a href="#menu">Кальяны</a>
        <a href="#bar">Бар</a>
        <a href="#events">События</a>
        <a href="#reviews">Отзывы</a>
        <a href="#contact">Контакты</a>
        <a href="#book" className="btn"><span>Забронировать стол</span></a>
      </div>

      {/* ============ HERO ============ */}
      <section className="hero" id="top">
        <div className="hero-bg">
          <span className="ember" style={{ left: '18%', top: '32%' }} />
          <span className="ember" style={{ left: '76%', top: '58%' }} />
          <span className="ember" style={{ left: '42%', top: '18%' }} />
        </div>
        <Smoke />
        <div className="wrap">
          <div className="hero-inner">
            <span className="eyebrow">Лаундж-бар · с 12:00 до 03:00</span>
            <h1>
              <span className="l"><span>Дым,</span></span>
              <span className="l"><span>вкус&nbsp;&amp; тишина</span></span>
            </h1>
            <p className="lead">The Object — закрытое пространство для тех, кто ценит ритуал. Авторские миксы табака, барная карта от шефа и приглушённый свет, в котором вечер длится дольше.</p>
            <div className="hero-actions">
              <a href="#book" className="btn"><span>Забронировать стол</span></a>
              <a href="#menu" className="btn ghost"><span>Смотреть меню</span></a>
            </div>
          </div>
        </div>
        <div className="hero-meta">
          <div className="stats">
            <div className="stat"><div className="n">250+</div><div className="t">Сортов табака</div></div>
            <div className="stat"><div className="n">1,5</div><div className="t">Года ритуала</div></div>
            <ClosingTimer />
          </div>
          <div className="scroll-hint"><span className="ln" /> Листайте вниз</div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="about section-pad" id="about">
        <div className="wrap grid">
          <div className="copy">
            <span className="eyebrow" data-reveal>О пространстве</span>
            <h2 className="title" data-reveal data-delay="1">Место, где <em>замедляется</em> время</h2>
            <p data-reveal data-delay="2">Мы спрятались от городского шума за тяжёлой бархатной портьерой. Внутри — мягкий свет, глубокие диваны и запах вишнёвого дерева. Каждый кальян здесь собирают вручную, под ваш вкус и настроение вечера.</p>
            <p data-reveal data-delay="2">Никакой суеты. Только вы, компания и медленный ритуал, который хочется растянуть до утра.</p>
            <div className="feat">
              <div className="f" data-reveal data-delay="1"><h4>Авторская забивка</h4><p>Кальянные мастера с опытом от 5 лет</p></div>
              <div className="f" data-reveal data-delay="2"><h4>Тихие залы</h4><p>Зонирование и приватные ложи</p></div>
              <div className="f" data-reveal data-delay="3"><h4>Авторский бар</h4><p>Коктейли, лимонады и фирменный чай</p></div>
              <div className="f" data-reveal data-delay="4"><h4>До утра</h4><p>Открыто до 03:00 — для долгих вечеров</p></div>
            </div>
          </div>
          <div className="visual" data-reveal data-delay="2">
            <div className="stack">
              <div className="slot tall" style={{ backgroundImage: 'url(/img/atmosphere.jpg)' }} />
              <div className="row">
                <div className="slot" style={{ backgroundImage: 'url(/img/hookah.jpg)' }} />
                <div className="slot" style={{ backgroundImage: 'url(/img/bar.jpg)' }} />
              </div>
            </div>
            <div className="badge-float">
              <div className="n">4.9</div>
              <div className="t">Рейтинг гостей</div>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap"><div className="divider" /></div>

      {/* ============ HOOKAH MENU ============ */}
      <section className="menu section-pad" id="menu">
        <div className="wrap">
          <div className="head">
            <div className="l">
              <span className="eyebrow" data-reveal>Кальянная карта</span>
              <h2 className="title" data-reveal data-delay="1">Меню <em>кальянов</em></h2>
              <p className="lead" data-reveal data-delay="2">От классических одиночных сортов до многослойных авторских миксов на молоке, грейпфруте или фруктовой чаше.</p>
            </div>
          </div>

          <div className="tabs" data-reveal>
            <button className="tab active" data-tab="classic">Классика</button>
            <button className="tab" data-tab="premium">Премиум</button>
            <button className="tab" data-tab="parfume">Парфюм</button>
            <button className="tab" data-tab="cigar">Сигары</button>
          </div>

          <div className="tabpane show" data-pane="classic">
            <div className="brand-grid">
              {[
                'Blackburn', 'Overdose', 'Satir aroma line', 'Dogma', 'Наш', 'База',
                'MustHave', 'Darkside', 'Spectrum classic', 'Sebero classic', 'Sebero black',
                'Jent', 'Сарма', 'Северный professional', 'Северный',
                'Blansh', 'Starline', 'Palitra', 'Bliss',
              ].map((b) => <span key={b} className="brand-chip">{b}</span>)}
            </div>
          </div>
          <div className="tabpane" data-pane="premium">
            <div className="brand-grid">
              {['Kraken', 'Bonche', 'Satyr platinum', 'Jent cigar', 'Tangiers']
                .map((b) => <span key={b} className="brand-chip brand-chip--premium">{b}</span>)}
            </div>
          </div>
          <div className="tabpane" data-pane="parfume">
            <div className="brand-grid brand-grid--solo">
              <span className="brand-chip brand-chip--feature">Dogma · парфюмированная линейка</span>
            </div>
          </div>
          <div className="tabpane" data-pane="cigar">
            <div className="brand-grid brand-grid--solo">
              <span className="brand-chip brand-chip--feature">Dogma · Андре Гигант</span>
              <p className="brand-note">Полнокомпонентная сигара ручной скрутки.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BAR ============ */}
      <section className="bar section-pad" id="bar">
        <div className="wrap">
          <div className="head">
            <div className="l">
              <span className="eyebrow" data-reveal>Авторский бар</span>
              <h2 className="title" data-reveal data-delay="1">Что в <em>бокале</em></h2>
              <p className="lead" data-reveal data-delay="2">Коктейли, которые дружат с дымом — авторская карта от шефа.</p>
            </div>
          </div>
          <div className="cols cols--solo">
            <div className="col" data-reveal>
              <h3>Коктейли <span className="ln" /></h3>
              <div className="sub">Авторская карта</div>
              <BarItem name="Old Object" desc="Бурбон, выдержанный вермут, дымная горечь" price="690" />
              <BarItem name="Бархатный Негрони" desc="Джин, кампари, апельсиновое масло" price="650" />
              <BarItem name="Дымный сауэр" desc="Мескаль, лайм, тимьян, белок" price="720" />
              <BarItem name="Грейпфрут & розмарин" desc="Джин, тоник, свежий грейпфрут" price="590" />
              <BarItem name="Безалкогольный сад" desc="Бузина, мята, яблоко, содовая" price="420" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ EVENTS ============ */}
      <section className="events section-pad" id="events">
        <div className="wrap">
          <div className="head">
            <div className="l">
              <span className="eyebrow" data-reveal>Афиша &amp; акции</span>
              <h2 className="title" data-reveal data-delay="1">Поводы <em>прийти</em></h2>
            </div>
          </div>
          <div className="grid grid--two">
            <article className="ev" data-reveal data-delay="1" style={{ backgroundImage: 'url(/img/cocktail.jpg)' }}>
              <div className="shade" />
              <div className="body">
                <span className="when">Пн–Чт · 18:00–20:00</span>
                <h3>Тихий час</h3>
                <p>Скидка 30% на всю кальянную карту в ранние часы. Лучшее время для разговора.</p>
              </div>
            </article>
            <article className="ev" data-reveal data-delay="2" style={{ backgroundImage: 'url(/img/hookah.jpg)' }}>
              <div className="shade" />
              <div className="body">
                <span className="when">По запросу</span>
                <h3>Приватная ложа</h3>
                <p>Отдельный зал на 8–12 гостей для дня рождения или закрытой компании.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============ REVIEWS ============ */}
      <section className="reviews section-pad" id="reviews">
        <div className="wrap">
          <div className="head">
            <div className="l">
              <span className="eyebrow" data-reveal>Гости говорят</span>
              <h2 className="title" data-reveal data-delay="1">Отзывы <em>гостей</em></h2>
              <p className="lead" data-reveal data-delay="2">
                Живые отзывы наших гостей — на странице заведения в Яндекс.Картах. Туда же приходят новые, мы их не прячем.
              </p>
            </div>
          </div>
          <div className="reviews-cta" data-reveal data-delay="2">
            <div className="rcta__top">
              <span className="rcta__stars">★★★★★</span>
              <span className="rcta__rate">4.9 / 5</span>
            </div>
            <p className="rcta__text">Десятки отзывов в Яндексе — атмосфера, вкус и сервис, по которым к нам возвращаются.</p>
            <a className="btn" href="https://yandex.ru/maps/org/obyekt/58828646557/reviews/" target="_blank" rel="noopener">
              <span>Открыть отзывы</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============ BOOKING ============ */}
      <section className="book section-pad" id="book">
        <div className="glow" />
        <div className="wrap grid">
          <div className="copy">
            <span className="eyebrow" data-reveal>Бронирование</span>
            <h2 className="title" data-reveal data-delay="1">Займите свой <em>стол</em></h2>
            <p className="lead" data-reveal data-delay="2">Забронируйте место заранее — в выходные залы заполняются к девяти вечера. Мы перезвоним для подтверждения.</p>
            <div className="hours" data-reveal data-delay="2">
              <div className="h"><span>Воскресенье — Четверг</span><span>12:00 — 02:00</span></div>
              <div className="h"><span>Пятница — Суббота</span><span>12:00 — 03:00</span></div>
            </div>
          </div>
          <BookingForm />
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section className="contact section-pad" id="contact">
        <div className="wrap">
          <div className="head">
            <div className="l">
              <span className="eyebrow" data-reveal>Как нас найти</span>
              <h2 className="title" data-reveal data-delay="1">Контакты <em>&amp; адрес</em></h2>
            </div>
          </div>
          <div className="grid">
            <div className="info">
              <div className="cinfo" data-reveal data-delay="1">
                <div className="k">Адрес</div>
                <div className="v">
                  <a href="https://yandex.ru/maps/?text=Адмиральского%2037а" target="_blank" rel="noopener">
                    ул. Адмиральского, 37а
                  </a>
                </div>
              </div>
              <div className="cinfo" data-reveal data-delay="2">
                <div className="k">Телефон</div>
                <div className="v"><a href="tel:+79003333026">+7 (900) 333-30-26</a></div>
                <div className="s">Звонок и бронь · ежедневно с 12:00</div>
              </div>
              <div className="cinfo" data-reveal data-delay="3">
                <div className="k">Соцсети</div>
                <div className="socials">
                  <a href="#" aria-label="Instagram">IG</a>
                  <a href="#" aria-label="Telegram">TG</a>
                  <a href="#" aria-label="WhatsApp">WA</a>
                </div>
              </div>
            </div>
            <div className="map" data-reveal data-delay="2">
              <iframe
                src="https://yandex.ru/map-widget/v1/?ll=&z=17&pt=&text=%D1%83%D0%BB.%20%D0%90%D0%B4%D0%BC%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D1%81%D0%BA%D0%BE%D0%B3%D0%BE%2037%D0%B0&l=map"
                title="Карта · ул. Адмиральского, 37а"
                loading="lazy"
                allow="geolocation"
              />
              <a className="map-open" href="https://yandex.ru/maps/org/obyekt/58828646557/" target="_blank" rel="noopener">
                Открыть в Яндекс.Картах ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="footer">
        <div className="wrap">
          <div className="top">
            <div>
              <a className="brand" href="#top">
                <span className="mark">O</span>
                <span className="name">The&nbsp;<b>Object</b></span>
              </a>
              <p className="tag">Лаундж-бар и кальянная для тех, кто умеет замедляться. Дым, вкус и тишина — каждый вечер.</p>
            </div>
            <div className="fcols">
              <div className="fcol">
                <h5>Разделы</h5>
                <a href="#about">Атмосфера</a>
                <a href="#menu">Кальяны</a>
                <a href="#bar">Бар</a>
                <a href="#events">События</a>
              </div>
              <div className="fcol">
                <h5>Контакты</h5>
                <a href="tel:+79003333026">+7 (900) 333-30-26</a>
                <p>Адмиральского, 37а</p>
                <a href="#book">Забронировать</a>
              </div>
              <div className="fcol">
                <h5>Часы</h5>
                <p>Вс–Чт · 12:00–02:00</p>
                <p>Пт–Сб · 12:00–03:00</p>
              </div>
            </div>
          </div>
          <div className="legal-row">
            <p>
              Информация о товарах и услугах размещена для лиц старше 18 лет.
              Чрезмерное употребление алкоголя и курение вредит вашему здоровью.
              Никотин, кальянный дым и алкоголь вызывают зависимость.
            </p>
            <p className="legal-row__org">
              [Реквизиты Оператора · ИП/ООО, ИНН, ОГРН, юр. адрес — заполнить].
            </p>
          </div>
          <div className="bot">
            <span>© <span id="landing-year">2026</span> The Object · Все права защищены</span>
            <span className="age"><b>18</b> +</span>
            <span><a href="/privacy">Политика конфиденциальности</a></span>
            <span><a href="#top">Наверх ↑</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BarItem({ name, desc, price }: { name: string; desc: string; price: string }) {
  return (
    <div className="item">
      <div>
        <span className="nm">{name}</span>
        <span className="ds">{desc}</span>
      </div>
      <span className="dots" />
      <span className="pr">{price}</span>
    </div>
  );
}

