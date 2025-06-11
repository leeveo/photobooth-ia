'use client';

import { Suspense, useState, useEffect } from 'react';

// This component safely renders tab content and helps diagnose component issues
const TabComponentWrapper = ({ component: Component, componentName, ...props }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  // Reset error state when component changes
  useEffect(() => {
    setHasError(false);
    setErrorInfo(null);
  }, [Component]);

  // If component is undefined or null, show friendly message
  if (!Component) {
    console.error(`Tab component "${componentName}" is not defined`);
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-red-700 font-medium">Component Error</h3>
        <p className="text-red-600">
          The component <strong>{componentName}</strong> is not properly imported or exported.
        </p>
        <p className="text-sm text-red-500 mt-2">
          Please check that:
          <ul className="list-disc ml-5 mt-1">
            <li>The component file exists</li>
            <li>The component is exported with "export default ComponentName"</li>
            <li>The import statement matches the export</li>
          </ul>
        </p>
      </div>
    );
  }

  // If previous render had an error, show error info
  if (hasError) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-red-700 font-medium">Error in {componentName}</h3>
        <p className="text-red-600">{errorInfo}</p>
      </div>
    );
  }

  // Try to render the component
  try {
    return (
      <Suspense fallback={<div>Loading {componentName}...</div>}>
        <Component {...props} />
      </Suspense>
    );
  } catch (error) {
    console.error(`Error rendering ${componentName}:`, error);
    setHasError(true);
    setErrorInfo(error.message);
    
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-red-700 font-medium">Error in {componentName}</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }
};

export default TabComponentWrapper;
