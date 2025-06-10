'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import CanvasEditor dynamically to prevent SSR issues
const CanvasEditor = dynamic(
  () => import('./CanvasEditor'),
  { ssr: false }
);

export default function CanvasEditorWrapper({ projectId, onSave, initialData, isTemplateMode = false }) {
  return (
    <CanvasEditor
      projectId={projectId}
      onSave={onSave}
      initialData={initialData}
      isTemplateMode={isTemplateMode}
    />
  );
}
