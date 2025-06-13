import { makeSerializable } from '../lib/serialization';
import ClientBoundary from '../components/ClientBoundary';
import ClientSideComponent from '../components/ClientSideComponent';

// This is a server component
export default async function ExamplePage() {
  // Fetch data from API or database
  const data = await fetchSomeData();
  
  // Make the data serializable before passing to client components
  const safeData = makeSerializable(data);
  
  return (
    <div>
      <h1>Server Component Part</h1>
      
      {/* Use ClientBoundary for components that need to access complex data */}
      <ClientBoundary serverData={safeData}>
        {(clientData) => <ClientSideComponent data={clientData} />}
      </ClientBoundary>
    </div>
  );
}
