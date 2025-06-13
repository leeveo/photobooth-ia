"use client";

import { useState } from 'react';

export default function TemplateForm({ initialData = {} }) {
  const [formData, setFormData] = useState(initialData);
  
  // Handle form logic here with useState, event handlers, etc.
  // These non-serializable aspects are safe in client components
  
  return (
    <form onSubmit={/* your submit handler */}>
      {/* Form fields */}
    </form>
  );
}
