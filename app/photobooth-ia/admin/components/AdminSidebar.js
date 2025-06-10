// ...existing code...

const navigation = [
  { name: 'Dashboard', href: '/photobooth-ia/admin/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/photobooth-ia/admin/projects', icon: FolderIcon },
  { name: 'Gallery', href: '/photobooth-ia/admin/project-gallery', icon: PhotoIcon },
  // Add the new billing page
  { name: 'Photo Billing', href: '/photobooth-ia/admin/photo-billing', icon: CurrencyDollarIcon },
  // ...other existing navigation items...
];

// Dans la liste des liens de navigation
<li>
  <Link
    href="/photobooth-ia/admin/templates"
    className={`flex items-center px-4 py-2 text-sm ${
      pathname === '/photobooth-ia/admin/templates'
        ? 'bg-indigo-800 text-white'
        : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
    }`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
    Templates de Layout
  </Link>
</li>

// ...existing code...