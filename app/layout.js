import './globals.css';
import { Inter } from 'next/font/google';
import ClientErrorBoundary from './components/ClientErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PhotoboothIA',
  description: 'PhotoboothIA - Photobooth avec transformation par intelligence artificielle',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <ClientErrorBoundary>
          {children}
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
