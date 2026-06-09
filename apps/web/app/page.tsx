// Лендинг «/». Секции — отдельные компоненты, сборка в порядке визитки.
// Серверный рендер по умолчанию; интерактив будет вынесен отдельным client-компонентом.
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import About from '@/components/About';
import BarMenu from '@/components/BarMenu';
import Hookah from '@/components/Hookah';
import Gallery from '@/components/Gallery';
import Contacts from '@/components/Contacts';
import BookingForm from '@/components/BookingForm';
import Footer from '@/components/Footer';
import LandingClient from '@/components/LandingClient';

export default function Page() {
  return (
    <>
      <LandingClient />
      <Header />
      <Hero />
      <Marquee />
      <About />
      <BarMenu />
      <Hookah />
      <Gallery />
      <section className="block contacts" id="contacts">
        <header className="block__head">
          <h2 className="block__title reveal">Контакты</h2>
        </header>
        <div className="contacts__grid">
          <Contacts />
          <BookingForm />
        </div>
      </section>
      <Footer />
    </>
  );
}
