import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AppProviders } from '@/components/providers'
import './globals.css'


export const metadata: Metadata = {
  title: 'MosqueConnect - Virtual Mosque Management Platform',
  description: 'Connect with your local mosques, find prayer times, explore events, and strengthen your community bonds through MosqueConnect.',
  keywords: ['mosque', 'masjid', 'prayer times', 'islamic center', 'muslim community', 'jummah', 'salah'],
  authors: [{ name: 'MosqueConnect' }],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1a7f5a' },
    { media: '(prefers-color-scheme: dark)', color: '#0f3d2e' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  )
}

