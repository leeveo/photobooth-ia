"use client";

import { useState, useEffect } from 'react';

/**
 * A client component wrapper that safely handles potentially non-serializable data
 * Use this at the boundary between server and client components
 */
export default function ClientBoundary({ children, serverData }) {
  const [clientData, setClientData] = useState(serverData);
  
  return (
    <div data-client-boundary>
      {typeof children === 'function' ? children(clientData) : children}
    </div>
  );
}
