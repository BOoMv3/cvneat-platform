'use client';

import { useState, useRef, useEffect } from 'react';

export default function SwipeableTabs({ tabs, activeTab, onTabChange }) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const currentIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = startX - currentX;
    const threshold = 50; // Seuil minimum pour déclencher le swipe
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < tabs.length - 1) {
        // Swipe vers la gauche - tab suivant
        onTabChange(tabs[currentIndex + 1].id);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe vers la droite - tab précédent
        onTabChange(tabs[currentIndex - 1].id);
      }
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  const handleMouseDown = (e) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Empêcher le scroll pendant le swipe
    const preventScroll = (e) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      container.removeEventListener('touchmove', preventScroll);
    };
  }, [isDragging]);

  return (
    <div className="relative">
      {/* Indicateurs de swipe */}
      <div className="absolute top-1/2 left-2 transform -translate-y-1/2 z-10">
        {currentIndex > 0 && (
          <div className="w-2 h-2 bg-gray-300 rounded-full opacity-50"></div>
        )}
      </div>
      
      <div className="absolute top-1/2 right-2 transform -translate-y-1/2 z-10">
        {currentIndex < tabs.length - 1 && (
          <div className="w-2 h-2 bg-gray-300 rounded-full opacity-50"></div>
        )}
      </div>

      {/* Conteneur principal */}
      <div
        ref={containerRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            width: `${tabs.length * 100}%`
          }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="flex-shrink-0 w-full"
              style={{ width: `${100 / tabs.length}%` }}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>

      {/* Indicateurs de position */}
      <div className="flex justify-center space-x-2 mt-4">
        {tabs.map((_, index) => (
          <button
            key={index}
            onClick={() => onTabChange(tabs[index].id)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-black' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
} 