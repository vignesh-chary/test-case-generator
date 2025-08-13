// src/components/ErrorNotification.tsx
import React from 'react';
import { XCircle } from 'lucide-react';
import { useError } from '../contexts/ErrorContext';

export function ErrorNotification() {
  const { error, setError } = useError();

  if (!error) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg bg-red-500 text-white flex items-center space-x-2 z-[100] max-w-sm w-full">
      <XCircle className="h-5 w-5" />
      <span className="text-sm font-medium flex-1">{error}</span>
      <button onClick={() => setError(null)} className="ml-4 text-white hover:text-red-100 transition-colors">
        <XCircle className="h-5 w-5" />
      </button>
    </div>
  );
}