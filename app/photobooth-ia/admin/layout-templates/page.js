"use client";

// This is a server component (no "use client" directive)

import TemplatesClient from './components/TemplatesClient';

export default async function LayoutTemplatesPage() {
  // Server-side data fetching
  const data = {}; // Replace with your actual data fetching
  
  // Render the client component
  return <TemplatesClient data={data} />;
}