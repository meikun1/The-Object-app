const lines = [
  { name: 'Классический', desc: 'Привычная крепость и чистый вкус табака. Любой вкус из карты.' },
  { name: 'Премиум', desc: 'Bonche, Satyr Platinum, Jent Cigar. Насыщенные премиум-табаки для глубокого вкуса.', hot: true },
  { name: 'Tangiers', desc: 'Крепкий американский табак с ярким, плотным вкусом.' },
  { name: 'Парфюм', desc: 'Парфюмерная линейка: многослойные, насыщенные ароматы.' },
  { name: 'На фрукте', desc: 'Чаша из свежего фрукта: ананас, грейпфрут, яблоко.' },
];

const flavours = [
  'Двойное яблоко', 'Манго-маракуйя', 'Виноград-мята', 'Грейпфрут', 'Черника',
  'Лимон-пирог', 'Дыня', 'Барбарис', 'Тропик микс',
];

export default function Hookah() {
  return (
    <section className="block cat hookah" id="hookah">
      <div className="hookah__haze" aria-hidden="true" />
      <header className="block__head">
        <h2 className="block__title reveal">Кальянная&nbsp;карта</h2>
      </header>

      <figure className="hookah__shot reveal" role="img" aria-label="Кальян в лаундже THE OBJECT" />

      <div className="hookah__grid">
        {lines.map((l) => (
          <article className={`hk${l.hot ? ' hk--hot' : ''} reveal`} key={l.name}>
            <h3 className="hk__name">{l.name}</h3>
            <p className="hk__desc">{l.desc}</p>
          </article>
        ))}
      </div>

      <div className="flav reveal">
        <h3 className="flav__label">Популярные вкусы</h3>
        <div className="flav__tags">
          {flavours.map((f) => <span key={f}>{f}</span>)}
        </div>
      </div>
    </section>
  );
}
