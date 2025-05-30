'use client';

export default function LoadingSpinner({ text = "Chargement en cours", size = "medium", color = "indigo" }) {
  // Map size to appropriate classes
  const sizeClasses = {
    small: "h-8 w-8",
    medium: "h-12 w-12",
    large: "h-16 w-16"
  };
  
  // Map color to appropriate classes
  const colorClasses = {
    indigo: "border-indigo-500",
    blue: "border-blue-500",
    purple: "border-purple-500",
    green: "border-green-500",
    red: "border-red-500",
    gray: "border-gray-500"
  };

  // Get the appropriate classes based on props
  const spinnerSize = sizeClasses[size] || sizeClasses.medium;
  const spinnerColor = colorClasses[color] || colorClasses.indigo;
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`animate-spin rounded-full ${spinnerSize} border-t-2 border-b-2 ${spinnerColor}`}></div>
      <p className="mt-4 text-gray-600 font-medium">{text}</p>
    </div>
  );
}
