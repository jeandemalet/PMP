import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { MainLayout } from '@/components/layout/MainLayout'
import { QueryProvider } from '@/lib/query-client'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PMP - Photo Management Platform',
  description: 'Plateforme complète de gestion de photos avec traitement d\'images',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          <MainLayout>
            {children}
          </MainLayout>
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  )
}
