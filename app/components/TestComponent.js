'use client';

export default function TestComponent() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Test Component
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Ce composant fonctionne correctement.
      </p>
    </div>
  );
}
