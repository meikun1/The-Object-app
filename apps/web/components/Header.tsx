export default function Header() {
  return (
    <header className="head" id="head">
      <a href="#hero" className="head__brand">
        <span className="head__o" />THE&nbsp;OBJECT
      </a>
      <nav className="menu" id="menu">
        <a href="#about"    className="menu__link">Атмосфера</a>
        <a href="#bar"      className="menu__link">Бар</a>
        <a href="#hookah"   className="menu__link">Кальян</a>
        <a href="#gallery"  className="menu__link">Галерея</a>
        <a href="#contacts" className="menu__link">Контакты</a>
      </nav>
      <a href="#booking" className="head__cta" data-magnetic>Бронь</a>
      <button className="burger" id="burger" aria-label="Меню" aria-expanded="false">
        <span /><span />
      </button>
    </header>
  );
}
