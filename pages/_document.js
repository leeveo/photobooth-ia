import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="fr">
      <Head />
      <body>
        <Main />
        <NextScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Safety net for commonly undefined variables
              window.id = window.id || '';
              window.ew = window.ew || {};
              
              // Global error handler
              window.onerror = function(message, source, lineno, colno, error) {
                console.log('Global error captured:', { message, source, lineno, colno });
                // Prevent the error from causing a white screen
                return true;
              };
            `,
          }}
        />
      </body>
    </Html>
  );
}
