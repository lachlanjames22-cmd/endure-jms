import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Endure OS',
  description: 'Business operating system — Endure Decking Perth WA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080808] text-[#e8ddd0] antialiased">
        {children}
      </body>
    </html>
  )
}
