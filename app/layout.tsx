import type { Metadata } from 'next'
import './globals.css'
import { BusinessProvider } from '@/lib/context/BusinessContext'

export const metadata: Metadata = {
  title: 'Endure OS',
  description: 'Business operating system — Endure Decking Perth WA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080808] text-[#e8ddd0] antialiased">
        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  )
}
