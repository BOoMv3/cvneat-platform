'use client';

export default function NotificationToggle({ 
  enabled, 
  onChange, 
  label, 
  description,
  className = '' 
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{label}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-11 h-6 rounded-full peer transition-colors duration-200 ${
          enabled 
            ? 'bg-orange-500' 
            : 'bg-gray-300 dark:bg-gray-600'
        }`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}></div>
        </div>
      </label>
    </div>
  );
}
