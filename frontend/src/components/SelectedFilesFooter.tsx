// src/components/SelectedFilesFooter.tsx
import React from 'react';
import { FileText, Github } from 'lucide-react';
import { Button } from './ui/Button';

interface SelectedFilesFooterProps {
  selectedFileCount: number;
  onGenerateTests: () => void;
  isLoading: boolean;
}

export function SelectedFilesFooter({ selectedFileCount, onGenerateTests, isLoading }: SelectedFilesFooterProps) {
  if (selectedFileCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-700">
          <FileText className="h-5 w-5" />
          <span>{selectedFileCount} files selected</span>
        </div>
        <Button onClick={onGenerateTests} disabled={isLoading} className="flex items-center space-x-2">
          {isLoading ? (
            <>
              <Github className="h-5 w-5 animate-spin" />
              <span>Generating Tests...</span>
            </>
          ) : (
            <span>Generate Tests</span>
          )}
        </Button>
      </div>
    </div>
  );
}