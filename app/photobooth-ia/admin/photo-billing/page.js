'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';

export default function PhotoBilling() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [filter, setFilter] = useState('unpaid'); // 'all', 'paid', 'unpaid'
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const ITEMS_PER_PAGE = 20;
  
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, [supabase]);
  
  const fetchPhotoCount = useCallback(async () => {
    try {
      // Calculate totals based on filter criteria
      let query = supabase.from('photos').select('count, sum(payment_amount)', { count: 'exact' });
      
      if (filter === 'paid') {
        query = query.eq('is_paid', true);
      } else if (filter === 'unpaid') {
        query = query.eq('is_paid', false);
      }
      
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }
      
      const { count, error, data } = await query;
      
      if (error) throw error;
      setTotalCount(count || 0);
      setTotalValue(data?.[0]?.sum || 0);
    } catch (error) {
      console.error("Error fetching photo count:", error);
    }
  }, [supabase, filter, selectedProject]);
  
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Build the query based on filters
      let query = supabase
        .from('photos')
        .select(`
          *,
          projects(name),
          styles(name)
        `)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
      
      if (filter === 'paid') {
        query = query.eq('is_paid', true);
      } else if (filter === 'unpaid') {
        query = query.eq('is_paid', false);
      }
      
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setPhotos(data || []);
      setHasMore((data || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedProject, page, filter]);
  
  async function markAsPaid(photoId, price = 1.0) {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ 
          is_paid: true, 
          payment_id: `manual-${Date.now()}`,
          payment_amount: price
        })
        .eq('id', photoId);
      
      if (error) throw error;
      
      // Refresh the list
      fetchPhotos();
      fetchPhotoCount();
    } catch (error) {
      console.error("Error marking photo as paid:", error);
    }
  }
  
  async function markBulkAsPaid(price = 1.0) {
    if (!confirm(`Are you sure you want to mark all filtered photos as paid at ${price}€ each?`)) {
      return;
    }
    
    try {
      let query = supabase
        .from('photos')
        .update({ 
          is_paid: true, 
          payment_id: `bulk-${Date.now()}`,
          payment_amount: price
        });
      
      if (filter === 'unpaid') {
        query = query.eq('is_paid', false);
      }
      
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      // Refresh the list
      fetchPhotos();
      fetchPhotoCount();
    } catch (error) {
      console.error("Error marking photos as paid:", error);
    }
  }
  
  useEffect(() => {
    fetchProjects();
    fetchPhotoCount();
  }, [fetchProjects, fetchPhotoCount]);
  
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Photo Billing Management</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setPage(0);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Photos</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid Only</option>
            </select>
          </div>
          
          {filter === 'unpaid' && (
            <button
              onClick={() => markBulkAsPaid(1.0)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow"
            >
              Mark All As Paid (1.00€ each)
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow p-4 text-white">
            <h3 className="text-sm font-medium uppercase opacity-80">Total Photos</h3>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm mt-1">Matching current filters</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-lg shadow p-4 text-white">
            <h3 className="text-sm font-medium uppercase opacity-80">Total Value</h3>
            <p className="text-2xl font-bold">{totalValue.toFixed(2)}€</p>
            <p className="text-sm mt-1">Paid photos only</p>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-red-600 rounded-lg shadow p-4 text-white">
            <h3 className="text-sm font-medium uppercase opacity-80">Estimated Pending</h3>
            <p className="text-2xl font-bold">
              {filter === 'unpaid' ? `${totalCount.toFixed(2)}€` : 'N/A'}
            </p>
            <p className="text-sm mt-1">At 1.00€ per photo</p>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-2 text-gray-500">Loading photos...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {photos.map(photo => (
                    <tr key={photo.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="w-20 h-20 relative">
                          <Image
                            src={photo.image_url}
                            alt="Generated photo"
                            fill
                            style={{ objectFit: "cover" }}
                            className="rounded-md"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {photo.projects?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(photo.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {photo.styles?.name || 'Default'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {photo.is_paid ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Paid ({photo.payment_amount || '?'}€)
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {!photo.is_paid && (
                          <button
                            onClick={() => markAsPaid(photo.id)}
                            className="px-3 py-1 text-xs text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-md shadow"
                          >
                            Mark as Paid (1.00€)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="px-4 py-2 border border-gray-300 text-sm rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page + 1}
              </span>
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={!hasMore}
                className="px-4 py-2 border border-gray-300 text-sm rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
