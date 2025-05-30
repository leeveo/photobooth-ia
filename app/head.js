export default function Head() {
  return (
    <>
      {/* ...existing code... */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.onerror = function(message, source, lineno, colno, error) {
              console.log('Global error handler:', {message, source, lineno, colno});
              return false;
            };
            
            // Initialize any missing variables to prevent 'not defined' errors
            window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};
            window.__NEXT_P = window.__NEXT_P || [];
          `
        }}
      />
      {/* ...existing code... */}
    </>
  );
}