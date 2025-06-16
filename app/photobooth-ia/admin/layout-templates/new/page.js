'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function NewLayoutTemplate() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [layoutData, setLayoutData] = useState({
    width: 1200,
    height: 1600,
    elements: []
  });
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

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
      setError('Template name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          layoutData
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to save template');
      }

      router.push('/photobooth-ia/admin/layout-templates');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/photobooth-ia/admin/layout-templates');
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Layout Template</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Template Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter template name"
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter description (optional)"
          rows={3}
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Layout Editor</label>
        <div className="border rounded p-4 h-96 bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Layout editor will be implemented here</p>
        </div>
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
          {loading ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}