'use client';

// Now this component can use client-side APIs like useState
import { useState } from 'react';

export default function SomeClientComponent() {
  const [state, setState] = useState(null);
  
  return <div>Client component</div>;
}
