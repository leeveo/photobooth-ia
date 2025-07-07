import React from 'react';

export default function LoadingSpinner({ text = "Chargement...", size = "medium", color = "indigo" }) {
  const sizeClass = size === "large" ? "h-12 w-12" : size === "small" ? "h-4 w-4" : "h-8 w-8";
  const colorClass = color === "indigo" ? "text-indigo-600" : "text-gray-600";
  return (
    <div className="flex flex-col items-center justify-center">
      <svg className={`animate-spin ${sizeClass} ${colorClass}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {text && <span className="mt-2 text-sm text-gray-500">{text}</span>}
    </div>
  );
}
