'use client';

// Клиентский интерактив лендинга: прелоадер, scrolled-шапка, magnetic-кнопки,
// reveal со ступенчатой задержкой, счётчики, мобильное меню.
// Логика 1:1 из визитки (js/main.js), без scroll-слушателей.
import { useEffect } from 'react';

export default function LandingClient() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine   = window.matchMedia('(pointer: fine)').matches;
    const $  = <T extends Element = Element>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
    const $$ = (s: string, c: ParentNode = document) => Array.from(c.querySelectorAll(s)) as HTMLElement[];
    const cleanups: Array<() => void> = [];

    /* ---------- Прелоадер 00 → 100 ---------- */
    const loader = document.getElementById('loader');
    const count  = document.getElementById('loaderCount');
    if (loader && count) {
      if (reduce) {
        loader.classList.add('done');
      } else {
        let n = 0;
        const t = window.setInterval(() => {
          n += Math.floor(Math.random() * 8) + 3;
          if (n >= 100) { n = 100; window.clearInterval(t); }
          count.textContent = n >= 100 ? '100' : String(n).padStart(2, '0');
        }, 90);
        const done = window.setTimeout(() => loader.classList.add('done'), 2000);
        cleanups.push(() => { window.clearInterval(t); window.clearTimeout(done); });
      }
    }

    /* ---------- Scrolled-шапка через IntersectionObserver ---------- */
    const head = document.getElementById('head');
    if (head && 'IntersectionObserver' in window) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:64px;pointer-events:none;';
      document.body.prepend(sentinel);
      const io = new IntersectionObserver(
        ([e]) => head.classList.toggle('scrolled', !e.isIntersecting),
        { threshold: 0 },
      );
      io.observe(sentinel);
      cleanups.push(() => { io.disconnect(); sentinel.remove(); });
    }

    /* ---------- Magnetic-кнопки (десктоп) ---------- */
    if (fine && !reduce) {
      $$('[data-magnetic]').forEach((el) => {
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left - r.width / 2;
          const y = e.clientY - r.top - r.height / 2;
          el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        };
        const leave = () => { el.style.transform = ''; };
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        cleanups.push(() => {
          el.removeEventListener('mousemove', move);
          el.removeEventListener('mouseleave', leave);
        });
      });
    }

    /* ---------- Мобильное меню ---------- */
    const burger = document.getElementById('burger');
    const menu = document.getElementById('menu');
    if (burger && menu) {
      const toggle = (open?: boolean) => {
        const o = typeof open === 'boolean' ? open : !menu.classList.contains('open');
        menu.classList.toggle('open', o);
        burger.classList.toggle('open', o);
        burger.setAttribute('aria-expanded', String(o));
        document.body.style.overflow = o ? 'hidden' : '';
      };
      const onBurger = () => toggle();
      const onLinks = $$('.menu__link').map((l) => {
        const fn = () => toggle(false);
        l.addEventListener('click', fn);
        return () => l.removeEventListener('click', fn);
      });
      burger.addEventListener('click', onBurger);
      cleanups.push(() => burger.removeEventListener('click', onBurger), ...onLinks);
    }

    /* ---------- Reveal со ступенчатой задержкой ---------- */
    const reveals = $$('.reveal');
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).style.transitionDelay = Math.min(i * 70, 280) + 'ms';
          e.target.classList.add('in');
          io.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    } else {
      reveals.forEach((el) => el.classList.add('in'));
    }

    /* ---------- Счётчики ---------- */
    $$('[data-count]').forEach((el) => {
      const target = parseInt(el.dataset.count ?? '0', 10);
      if ('IntersectionObserver' in window && !reduce) {
        const o = new IntersectionObserver((en) => {
          en.forEach((e) => {
            if (!e.isIntersecting) return;
            const dur = 1500;
            const start = performance.now();
            const tick = (now: number) => {
              const p = Math.min((now - start) / dur, 1);
              el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            o.unobserve(el);
          });
        }, { threshold: 0.6 });
        o.observe(el);
        cleanups.push(() => o.disconnect());
      } else {
        el.textContent = String(target);
      }
    });

    return () => { cleanups.forEach((c) => c()); };
  }, []);

  return (
    <div className="loader" id="loader">
      <div className="loader__count" id="loaderCount">00</div>
      <svg className="loader__ring" viewBox="0 0 200 200" aria-hidden="true">
        <ellipse cx="100" cy="100" rx="92" ry="58" />
      </svg>
    </div>
  );
}
