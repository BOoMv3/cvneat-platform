'use client';

import { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function MobileTabs({ tabs, activeTab, onTabChange }) {
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const checkScrollButtons = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [tabs]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -100, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 100, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative bg-white border-b border-gray-200">
      {/* Boutons de scroll */}
      {showScrollButtons && (
        <>
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-0 bottom-0 z-10 bg-white bg-gradient-to-r from-white to-transparent px-2 flex items-center justify-center"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={scrollRight}
            className="absolute right-0 top-0 bottom-0 z-10 bg-white bg-gradient-to-l from-white to-transparent px-2 flex items-center justify-center"
          >
            <FaChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </>
      )}

      {/* Onglets */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200
              ${activeTab === tab.id
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-black'
              }
            `}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Indicateur de position */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
        <div
          className="h-full bg-black transition-all duration-300"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${tabs.findIndex(tab => tab.id === activeTab) * 100}%)`
          }}
        />
      </div>
    </div>
  );
} 