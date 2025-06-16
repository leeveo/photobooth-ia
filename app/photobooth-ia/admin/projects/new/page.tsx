```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export default function NewProject() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Check authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    };
    
    checkUser();
  }, [router, supabase]);

  const handleSave = async () => {
    if (!name) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a new project in the database
      const { data, error: dbError } = await supabase
        .from('projects')
        .insert([
          { 
            name,
            description,
            event_date: eventDate || null,
            event_location: eventLocation,
            client_name: clientName,
            created_by: user?.id,
            status: 'active'
          }
        ])
        .select();
      
      if (dbError) throw new Error(dbError.message);
      
      if (data && data.length > 0) {
        // Using string concatenation instead of template literals
        router.push('/photobooth-ia/admin/projects/' + data[0].id);
      } else {
        throw new Error('Failed to create project');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/photobooth-ia/admin/projects');
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Project</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Project Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter project name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter project description (optional)"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Event Location</label>
            <input
              type="text"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter event location"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter client name"
          />
        </div>
        
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
```
