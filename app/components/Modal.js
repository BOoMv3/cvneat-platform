'use client';

import { useEffect } from 'react';

export default function Modal({ children, onClose }) {
  useEffect(() => {
    if (!onClose) return undefined;

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const { body } = document;
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeydown);

    return () => {
      body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [onClose]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 sm:px-4"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-lg shadow-lg p-4 sm:p-6 w-full sm:max-w-2xl relative"
        style={{
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-2xl font-bold shadow-md"
            aria-label="Fermer la modal"
          >
            ×
          </button>
        )}
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
} 