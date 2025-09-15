'use client';

import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaHome } from 'react-icons/fa';

export default function PageHeader({ 
  title, 
  icon: Icon, 
  showBackButton = true, 
  showHomeButton = true,
  rightContent = null,
  className = ''
}) {
  const router = useRouter();

  return (
    <div className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Navigation gauche - version mobile compacte */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {showBackButton && (
              <>
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-1 sm:space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <FaArrowLeft className="text-sm sm:text-lg" />
                  <span className="hidden xs:inline text-sm sm:text-base">Retour</span>
                </button>
                {showHomeButton && <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>}
              </>
            )}
            {showHomeButton && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <FaHome className="text-sm sm:text-lg" />
                <span className="hidden xs:inline text-sm sm:text-base">Accueil</span>
              </button>
            )}
          </div>
          
          {/* Titre central - responsive */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 justify-center">
            {Icon && <Icon className="text-blue-500 dark:text-blue-400 text-lg sm:text-2xl" />}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
          </div>
          
          {/* Contenu droit - responsive */}
          <div className="flex items-center ml-2">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
