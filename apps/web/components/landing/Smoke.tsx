'use client';
// Canvas-дым в hero: мягкие облачка, плывущие вверх, и редкие угольки.
// Запускается только если не reduced-motion.
import { useEffect, useRef } from 'react';

export default function Smoke() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cnv = ref.current;
    if (!cnv) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = cnv.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    type Puff = { x: number; y: number; r: number; v: number; a: number; life: number; ttl: number };
    const puffs: Puff[] = [];

    const resize = () => {
      const r = cnv.getBoundingClientRect();
      w = r.width; h = r.height;
      cnv.width = Math.floor(w * dpr);
      cnv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const seedPuff = (origin: number, big = false): Puff => ({
      x: origin + (Math.random() - 0.5) * 80,
      y: h * 0.92,
      r: big ? 80 + Math.random() * 60 : 40 + Math.random() * 40,
      v: 0.25 + Math.random() * 0.45,
      a: 0.05 + Math.random() * 0.08,
      life: 0,
      ttl: 240 + Math.random() * 200,
    });

    // Стартовая «затяжка»
    for (let i = 0; i < 18; i++) puffs.push(seedPuff(w * 0.3, i % 3 === 0));

    let spawnT = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      // Угасание + рост
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life++;
        p.y -= p.v;
        p.r += 0.4;
        const k = 1 - p.life / p.ttl;
        const alpha = Math.max(0, p.a * k);
        const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(231,203,138,${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(231,203,138,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.life > p.ttl || p.y < -p.r) puffs.splice(i, 1);
      }
      // Подсыпка
      spawnT++;
      if (spawnT % 4 === 0) {
        const x = w * (0.2 + 0.6 * Math.random());
        puffs.push(seedPuff(x, Math.random() < 0.2));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Плавный fade-in canvas через .lit
    requestAnimationFrame(() => cnv.classList.add('lit'));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
