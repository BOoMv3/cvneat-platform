'use client';

import { useState, useRef, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const PULL_THRESHOLD = 80;
  const REFRESH_THRESHOLD = 120;

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (containerRef.current?.scrollTop === 0 && startY.current > 0) {
      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance * 0.5, REFRESH_THRESHOLD));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= REFRESH_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    startY.current = 0;
    currentY.current = 0;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  return (
    <div className="relative">
      {/* Indicateur de pull-to-refresh */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center transition-all duration-200"
        style={{
          transform: `translateY(${Math.min(pullDistance, REFRESH_THRESHOLD)}px)`,
          opacity: pullDistance > 0 ? 1 : 0
        }}
      >
        <div className="bg-white rounded-full p-3 shadow-lg">
          {isRefreshing ? (
            <FaSpinner className="w-6 h-6 text-black animate-spin" />
          ) : (
            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{
          transform: `translateY(${Math.min(pullDistance, REFRESH_THRESHOLD)}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>

      {/* Overlay de chargement */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <FaSpinner className="w-8 h-8 text-black animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Actualisation...</p>
          </div>
        </div>
      )}
    </div>
  );
} 