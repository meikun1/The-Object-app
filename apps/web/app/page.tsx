// Лендинг «/» — premium dark lounge.
// Контент пока с примерами из макета (тексты подмените под реальный бар).
// Конструктор «/t/[token]» и админка «/admin» используют свой нуар-стиль.
import LandingClient from '@/components/landing/LandingClient';
import Smoke from '@/components/landing/Smoke';
import BookingForm from '@/components/landing/BookingForm';

export default function Page() {
  return (
    <div className="landing">
      <LandingClient />

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
            <div className="stat"><div className="n">40+</div><div className="t">Сортов табака</div></div>
            <div className="stat"><div className="n">7</div><div className="t">Лет ритуала</div></div>
            <div className="stat"><div className="n">03:00</div><div className="t">Закрываем</div></div>
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
              <div className="f" data-reveal data-delay="3"><h4>Винил &amp; lo-fi</h4><p>Музыка, под которую слышно собеседника</p></div>
              <div className="f" data-reveal data-delay="4"><h4>Кухня до утра</h4><p>Горячее и закуски всю ночь</p></div>
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
            <button className="tab" data-tab="author">Авторские</button>
            <button className="tab" data-tab="tobacco">Табаки</button>
          </div>

          <div className="tabpane show" data-pane="classic">
            <div className="cards">
              <HookahCard idx="01" name="Двойное яблоко" price="1200" desc="Тот самый вкус, с которого начинается каждый вечер. Плотный дым, мягкая пряность." tags={['Классика', 'Крепкий']} />
              <HookahCard idx="02" name="Мята & лёд" price="1200" desc="Свежесть, которая бодрит. Холодок на вдохе и долгое прохладное послевкусие." tags={['Свежий', 'Лёгкий']} />
              <HookahCard idx="03" name="Виноград" price="1200" desc="Сочный, чуть сладкий, понятный каждому. Идеален для долгой беседы." tags={['Сладкий', 'Средний']} />
            </div>
          </div>
          <div className="tabpane" data-pane="premium">
            <div className="cards">
              <HookahCard idx="01" name="На грейпфруте" price="1900" desc="Чаша из свежего грейпфрута. Цитрусовая горчинка раскрывает вкус табака по-новому." tags={['Fruit-bowl', 'Цитрус']} />
              <HookahCard idx="02" name="На молоке" price="1700" desc="Колба на молоке смягчает дым до бархата. Сливочное, обволакивающее послевкусие." tags={['Soft', 'Сливочный']} />
              <HookahCard idx="03" name="На ананасе" price="2100" desc="Тропическая чаша на половине ананаса. Сочно, ярко, по-настоящему празднично." tags={['Fruit-bowl', 'Тропики']} />
            </div>
          </div>
          <div className="tabpane" data-pane="author">
            <div className="cards">
              <HookahCard idx="01" name="Тихий вечер" price="2400" desc="Микс инжира, выдержанного табака и лёгкой ванили. Тёплый, медитативный, наш фирменный." tags={['Signature', 'Десертный']} />
              <HookahCard idx="02" name="Чёрный объект" price="2600" desc="Смелый купаж чёрной смородины, специй и табачного листа. Для тех, кто любит характер." tags={['Signature', 'Крепкий']} />
              <HookahCard idx="03" name="Сад на крыше" price="2400" desc="Персик, базилик и капля бергамота. Свежий и парфюмерный — любимец летних вечеров." tags={['Signature', 'Свежий']} />
            </div>
          </div>
          <div className="tabpane" data-pane="tobacco">
            <div className="cards">
              <HookahCard idx="01" name="Tangiers" price="от 1400" desc="Крепкий американский табак с насыщенным вкусом. Для опытных гостей." tags={['Крепкий']} />
              <HookahCard idx="02" name="DarkSide" price="от 1300" desc="Глубокие сложные вкусы и плотный дым. Золотая середина крепости." tags={['Средний']} />
              <HookahCard idx="03" name="MustHave" price="от 1100" desc="Лёгкий, ароматный, без лишней крепости. Отличный старт вечера." tags={['Лёгкий']} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ BAR ============ */}
      <section className="bar section-pad" id="bar">
        <div className="wrap">
          <div className="head">
            <div className="l">
              <span className="eyebrow" data-reveal>Бар &amp; кухня</span>
              <h2 className="title" data-reveal data-delay="1">Что в <em>бокале</em></h2>
              <p className="lead" data-reveal data-delay="2">Коктейли, которые дружат с дымом, и кухня, которая держит вечер до самого закрытия.</p>
            </div>
          </div>
          <div className="cols">
            <div className="col" data-reveal>
              <h3>Коктейли <span className="ln" /></h3>
              <div className="sub">Авторская карта</div>
              <BarItem name="Old Object" desc="Бурбон, выдержанный вермут, дымная горечь" price="690" />
              <BarItem name="Бархатный Негрони" desc="Джин, кампари, апельсиновое масло" price="650" />
              <BarItem name="Дымный сауэр" desc="Мескаль, лайм, тимьян, белок" price="720" />
              <BarItem name="Грейпфрут & розмарин" desc="Джин, тоник, свежий грейпфрут" price="590" />
              <BarItem name="Безалкогольный сад" desc="Бузина, мята, яблоко, содовая" price="420" />
            </div>
            <div className="col" data-reveal data-delay="2">
              <h3>Кухня <span className="ln" /></h3>
              <div className="sub">До 06:00</div>
              <BarItem name="Сырная тарелка" desc="Пять сортов, мёд, орехи, груша" price="890" />
              <BarItem name="Тартар из говядины" desc="Каперсы, перепелиный желток, бриошь" price="740" />
              <BarItem name="Креветки на гриле" desc="Чеснок, чили, лимон" price="820" />
              <BarItem name="Брускетты сет" desc="Томаты, лосось, рикотта · 3 шт" price="560" />
              <BarItem name="Десерт «Объект»" desc="Шоколадный фондан, солёная карамель" price="480" />
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
          <div className="grid">
            <article className="ev" data-reveal data-delay="1" style={{ backgroundImage: 'url(/img/lounge.jpg)' }}>
              <div className="shade" />
              <div className="body">
                <span className="when">Каждый четверг · 21:00</span>
                <h3>Винил-вечера</h3>
                <p>Резидент крутит джаз и lo-fi на пластинках. Первый кальян — со скидкой 20%.</p>
              </div>
            </article>
            <article className="ev" data-reveal data-delay="2" style={{ backgroundImage: 'url(/img/cocktail.jpg)' }}>
              <div className="shade" />
              <div className="body">
                <span className="when">Пн–Чт · 18:00–20:00</span>
                <h3>Тихий час</h3>
                <p>Скидка 30% на всю кальянную карту в ранние часы. Лучшее время для разговора.</p>
              </div>
            </article>
            <article className="ev" data-reveal data-delay="3" style={{ backgroundImage: 'url(/img/hookah.jpg)' }}>
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
              <h2 className="title" data-reveal data-delay="1">Отзывы <em>вечеров</em></h2>
            </div>
          </div>
          <div className="review-grid">
            <Review name="Артём" role="завсегдатай" text="Лучший дым в городе и атмосфера, в которую возвращаешься. Кальянщики реально слышат, что ты любишь." delay={1} />
            <Review name="Марина" role="гость" text="Приходим компанией каждую пятницу. Тихо, красиво, коктейли на уровне хорошего бара. Кухня — отдельная любовь." delay={2} />
            <Review name="Дмитрий" role="отмечал ДР" text="Бронировали ложу на день рождения — всё на пять. Свет, музыка, дым. Гости до сих пор вспоминают." delay={3} />
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
                <div className="s">Вход со двора · под вывеской «O»</div>
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
              <div className="road" style={{ left: 0, right: 0, top: '32%', height: 2 }} />
              <div className="road" style={{ left: 0, right: 0, top: '68%', height: 2 }} />
              <div className="road" style={{ top: 0, bottom: 0, left: '40%', width: 2 }} />
              <div className="road" style={{ top: 0, bottom: 0, left: '74%', width: 2 }} />
              <div className="pin">
                <div className="dot" />
                <div className="lbl">The Object</div>
              </div>
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
                <a href="#bar">Бар &amp; кухня</a>
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
          <div className="bot">
            <span>© <span id="landing-year">2026</span> The Object · Все права защищены</span>
            <span className="age"><b>18</b> Курение вредит вашему здоровью</span>
            <span><a href="#top">Наверх ↑</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HookahCard({ idx, name, price, desc, tags }: { idx: string; name: string; price: string; desc: string; tags: string[] }) {
  return (
    <article className="card" data-reveal data-delay="1">
      <div className="idx">{idx}</div>
      <div className="top">
        <h3>{name}</h3>
        <div className="price">{price}<small> ₽</small></div>
      </div>
      <p>{desc}</p>
      <div className="tagrow">
        {tags.map((t) => <span key={t} className="chip">{t}</span>)}
      </div>
    </article>
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

function Review({ name, role, text, delay }: { name: string; role: string; text: string; delay: number }) {
  return (
    <article className="review" data-reveal data-delay={delay}>
      <div className="stars">★★★★★</div>
      <blockquote>«{text}»</blockquote>
      <div className="who">
        <span className="av">{name.charAt(0)}</span>
        <div>
          <div className="nm">{name}</div>
          <div className="rl">{role}</div>
        </div>
      </div>
    </article>
  );
}
