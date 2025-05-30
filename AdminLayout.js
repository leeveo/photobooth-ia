"use client";

import Link from 'next/link';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Administration Photobooth</h1>
          <div className="space-x-4">
            <Link href="/photobooth-ia/admin/projects" className="hover:underline">
              Projets
            </Link>
            <Link href="/photobooth-ia/admin/styles" className="hover:underline">
              Styles
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
      
      <footer className="bg-gray-100 p-4 mt-8 text-center text-gray-600 text-sm">
        &copy; {new Date().getFullYear()} - Photobooth Admin
      </footer>
    </div>
  );
}