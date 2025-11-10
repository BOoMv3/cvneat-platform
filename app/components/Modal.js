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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Fermer la modal"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
} 