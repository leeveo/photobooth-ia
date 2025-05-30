import './globals.css';
import { Inter } from 'next/font/google';
import ErrorBoundary from './components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PhotoboothIA',
  description: 'PhotoboothIA - Photobooth avec transformation par intelligence artificielle',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
