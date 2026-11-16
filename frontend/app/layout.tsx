import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Source_Sans_3, Playfair_Display } from 'next/font/google'
import './globals.css'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MercadoLibro — Intercambiá libros con tu comunidad',
  description:
    'Plataforma comunitaria de intercambio de libros mediante puntos virtuales, trueque directo y cadenas circulares.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf8f5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`bg-[#faf8f5] ${sourceSans.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-[#faf8f5] font-sans text-stone-800 antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
