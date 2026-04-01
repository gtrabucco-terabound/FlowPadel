import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'PadelFlow - Gestión de Padel en Tiempo Real',
  description: 'Plataforma integral para la gestión de torneos y canchas abiertas de pádel.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
