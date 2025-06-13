// CORRECT - Using dynamic imports properly in a server component
import dynamic from 'next/dynamic';

// Proper way to use dynamic imports in server components
const SomeComponent = dynamic(() => import('../components/SomeComponent'));

export default function Page() {
  return <div><SomeComponent /></div>;
}
