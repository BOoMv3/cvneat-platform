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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <>
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <FaArrowLeft className="text-lg" />
                  <span>Retour</span>
                </button>
                {showHomeButton && <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>}
              </>
            )}
            {showHomeButton && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <FaHome className="text-lg" />
                <span>Accueil</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {Icon && <Icon className="text-blue-500 dark:text-blue-400 text-2xl" />}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          </div>
          
          <div className="flex items-center">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
