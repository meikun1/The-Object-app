'use client';
// Клиентский интерактив лендинга: scrolled-шапка, мобильное меню,
// reveal-анимации, переключение табов кальянного меню, выбор кол-ва гостей.
import { useEffect } from 'react';

export default function LandingClient() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];

    /* --- scrolled-шапка через IntersectionObserver --- */
    const nav = document.querySelector('.landing .nav');
    if (nav && 'IntersectionObserver' in window) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;';
      document.body.prepend(sentinel);
      const io = new IntersectionObserver(
        ([e]) => nav.classList.toggle('solid', !e.isIntersecting),
        { threshold: 0 },
      );
      io.observe(sentinel);
      cleanups.push(() => { io.disconnect(); sentinel.remove(); });
    }

    /* --- мобильное меню --- */
    const burger = document.querySelector<HTMLButtonElement>('.landing .burger');
    if (burger) {
      const toggle = (open?: boolean) => {
        const o = typeof open === 'boolean' ? open : !document.body.classList.contains('landing-open');
        document.body.classList.toggle('landing-open', o);
      };
      const onBurger = () => toggle();
      burger.addEventListener('click', onBurger);
      const onLinks = Array.from(document.querySelectorAll<HTMLElement>('.landing .nav-mobile a')).map((l) => {
        const fn = () => toggle(false);
        l.addEventListener('click', fn);
        return () => l.removeEventListener('click', fn);
      });
      cleanups.push(() => burger.removeEventListener('click', onBurger), ...onLinks);
    }

    /* --- reveal-анимации с fail-safe --- */
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.landing [data-reveal]'));
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          io.unobserve(e.target);
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -4% 0px' });
      reveals.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
      // Fail-safe: если по любой причине observer не доехал — через 1.5 с
      // принудительно показываем всё. Лучше без анимации, чем пустые секции.
      const failsafe = window.setTimeout(() => {
        reveals.forEach((el) => el.classList.add('in'));
      }, 1500);
      cleanups.push(() => window.clearTimeout(failsafe));
    } else {
      reveals.forEach((el) => el.classList.add('in'));
    }

    /* --- табы кальянного меню --- */
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.landing .tabs .tab'));
    const panes = Array.from(document.querySelectorAll<HTMLElement>('.landing .tabpane'));
    const tabHandlers = tabs.map((t) => {
      const onClick = () => {
        const id = t.dataset.tab;
        tabs.forEach((x) => x.classList.toggle('active', x === t));
        panes.forEach((p) => p.classList.toggle('show', p.dataset.pane === id));
      };
      t.addEventListener('click', onClick);
      return () => t.removeEventListener('click', onClick);
    });
    cleanups.push(...tabHandlers);

    /* --- выбор кол-ва гостей --- */
    const guests = Array.from(document.querySelectorAll<HTMLButtonElement>('.landing .guests button'));
    const guestsHandlers = guests.map((g) => {
      const onClick = () => {
        guests.forEach((x) => x.classList.toggle('sel', x === g));
      };
      g.addEventListener('click', onClick);
      return () => g.removeEventListener('click', onClick);
    });
    cleanups.push(...guestsHandlers);

    /* --- год в футере --- */
    const y = document.getElementById('landing-year');
    if (y) y.textContent = String(new Date().getFullYear());

    return () => { cleanups.forEach((c) => c()); };
  }, []);

  return null;
}
