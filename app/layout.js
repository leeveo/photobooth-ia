import './globals.css';

export const metadata = {
  title: 'PhotoboothIA',
  description: 'PhotoboothIA - Photobooth avec transformation par intelligence artificielle',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* Utiliser Google Fonts via balise link au lieu de next/font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
