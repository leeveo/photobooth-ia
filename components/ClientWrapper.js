"use client";

import { useState, useEffect } from 'react';

/**
 * A client component wrapper that safely handles potentially non-serializable data
 */
export default function ClientWrapper({ 
  children, 
  serverData, 
  Component 
}) {
  const [clientData, setClientData] = useState(serverData);
  
  // Any additional processing of data can happen here
  
  if (Component) {
    return <Component data={clientData}>{children}</Component>;
  }
  
  return children;
}
