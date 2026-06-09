export default function Gallery() {
  return (
    <section className="block gal" id="gallery">
      <header className="block__head">
        <h2 className="block__title reveal">Галерея</h2>
      </header>
      <div className="gal__grid">
        <figure className="frame frame--a frame--cocktail reveal" role="img" aria-label="Коктейль в баре THE OBJECT" />
        <figure className="frame frame--b frame--bar reveal" role="img" aria-label="Атмосфера THE OBJECT" />
        <figure className="frame frame--c frame--lounge reveal" role="img" aria-label="Лаундж-зона с видом на город" />
        <figure className="frame frame--d frame--hookah reveal" role="img" aria-label="Кальян" />
        <figure className="frame frame--e frame--mirror reveal" role="img" aria-label="Интерьер с зеркалом" />
      </div>
    </section>
  );
}
