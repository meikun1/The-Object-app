export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="foot__big" aria-hidden="true">THE&nbsp;OBJECT</div>
      <div className="foot__bar">
        <span>© {year} THE OBJECT, Lounge Bar</span>
        <span className="foot__legal">18+, Чрезмерное употребление алкоголя и табака вредит здоровью</span>
      </div>
    </footer>
  );
}
