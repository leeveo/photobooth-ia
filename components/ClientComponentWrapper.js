"use client";

// This component safely wraps client-side functionality
export default function ClientComponentWrapper({ children, ...props }) {
  return <>{children}</>;
}
