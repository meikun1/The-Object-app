export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__bg" aria-hidden="true" />
      <div className="hero__ellipse" aria-hidden="true">
        <svg viewBox="0 0 900 520">
          <ellipse cx="450" cy="260" rx="430" ry="240" />
        </svg>
      </div>

      <div className="hero__inner">
        <p className="eyebrow hero__eyebrow">Лаундж-бар</p>
        <h1 className="hero__title">
          <span className="mask"><b style={{ ['--d' as any]: '.05s' }}>THE</b></span>
          <span className="mask"><b style={{ ['--d' as any]: '.18s' }}>OBJECT</b></span>
        </h1>
        <p className="hero__tag">Бар, кальян и тишина, <em>в которой слышно вкус.</em></p>
        <div className="hero__act">
          <a href="#bar" className="btn btn--solid" data-magnetic>Открыть меню</a>
          <a href="#booking" className="btn btn--line" data-magnetic>Забронировать</a>
        </div>
      </div>
    </section>
  );
}
