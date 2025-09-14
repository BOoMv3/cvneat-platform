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
    <div className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <>
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FaArrowLeft className="text-lg" />
                  <span>Retour</span>
                </button>
                {showHomeButton && <div className="h-6 w-px bg-gray-300"></div>}
              </>
            )}
            {showHomeButton && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaHome className="text-lg" />
                <span>Accueil</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {Icon && <Icon className="text-blue-500 text-2xl" />}
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          
          <div className="flex items-center">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
