export const metadata = {
  title: 'Mosaïque de photos',
}

export default function MosaicLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-white">
        {children}
      </body>
    </html>
  );
}