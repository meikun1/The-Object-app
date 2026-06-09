export default function About() {
  return (
    <section className="block about" id="about">
      <header className="block__head">
        <h2 className="block__title reveal">Атмосфера</h2>
      </header>
      <div className="about__grid">
        <div className="about__lead reveal">
          <p>Не просто бар. <em>Объект притяжения.</em></p>
        </div>
        <div className="about__body reveal">
          <p>Приглушённый свет, фактурные стены, холодный блеск хрома и бокал, который ловит отражение. Мы собрали пространство, где вечер замедляется: авторские коктейли, выдержанная кальянная карта и музыка, под которую остаёшься ещё на час.</p>
          <p>Каждая деталь, от подачи до отражения в зеркале, выстроена так, чтобы главным объектом внимания были вы.</p>
        </div>
        <figure className="about__shot reveal" role="img" aria-label="Интерьер бара THE OBJECT" />
        <div className="about__spec reveal">
          <div className="spec"><b data-count="47">0</b><span>позиций в баре</span></div>
          <div className="spec"><b data-count="25">0</b><span>вкусов табака</span></div>
          <div className="spec"><b>02</b><span>этажа атмосферы</span></div>
          <div className="spec"><b>03:00</b><span>до закрытия</span></div>
        </div>
      </div>
    </section>
  );
}
