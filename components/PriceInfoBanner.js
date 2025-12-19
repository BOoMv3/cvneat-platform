'use client';

import { useState } from 'react';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';

export default function PriceInfoBanner({ variant = 'default' }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const variants = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    compact: 'bg-amber-50 border-amber-200 text-amber-800',
    inline: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  const variantClasses = variants[variant] || variants.default;

  return (
    <div className={`${variantClasses} border rounded-lg p-4 mb-4 relative`}>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Fermer"
      >
        <FaTimes className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3 pr-6">
        <FaInfoCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold mb-1 text-sm sm:text-base">
            💡 Pourquoi les prix sont-ils plus élevés qu'en boutique ?
          </h4>
          <p className="text-xs sm:text-sm leading-relaxed">
            Les prix affichés sur CVN'EAT incluent les <strong>frais de service de la plateforme</strong> qui permettent de vous offrir :
            la commande en ligne, la gestion des paiements sécurisés, le suivi en temps réel, et la livraison à domicile.
            Ces frais permettent de maintenir la qualité du service et de rémunérer équitablement tous les acteurs de la chaîne.
          </p>
        </div>
      </div>
    </div>
  );
}

