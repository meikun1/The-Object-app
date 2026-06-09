import {
  Prata,
  Golos_Text,
  JetBrains_Mono,
  Cormorant_Garamond,
  Jost,
} from 'next/font/google';

// --- Конструктор + админка (нуар) ---
export const prata = Prata({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});
export const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});
export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

// --- Лендинг (premium lounge, золото + тёплый) ---
export const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
export const jost = Jost({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
});
