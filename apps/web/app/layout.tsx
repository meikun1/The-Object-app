import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { prata, golos, mono } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'THE OBJECT — Lounge Bar',
  description:
    'THE OBJECT — лаунж-бар: авторская барная карта и кальянная комната в эстетике ночного нуара.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'THE OBJECT — Lounge Bar',
    description: 'Коллекция объектов желания. Бар, кальян, ночь.',
    type: 'website',
    images: ['/img/cocktail.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0908',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${prata.variable} ${golos.variable} ${mono.variable}`}>
      <body>
        <div className="grain" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
