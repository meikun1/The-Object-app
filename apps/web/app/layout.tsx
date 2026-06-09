import './globals.css';
import './landing.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { prata, golos, mono, cormorant, jost } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'THE OBJECT — лаундж-бар & кальянная',
  description:
    'The Object — закрытое пространство для тех, кто ценит ритуал. Авторские миксы табака, барная карта от шефа и приглушённый свет, в котором вечер длится дольше.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'THE OBJECT — лаундж-бар & кальянная',
    description: 'Дым, вкус и тишина — каждый вечер. Лаундж-бар и кальянная.',
    type: 'website',
    images: ['/img/cocktail.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0806',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${prata.variable} ${golos.variable} ${mono.variable} ${cormorant.variable} ${jost.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
