export default function FormInput({ 
  label, 
  type = 'text', 
  name, 
  placeholder, 
  required = false,
  error,
  value,
  onChange
}) {
  return (
    <div className="mb-3 sm:mb-4">
      <label 
        htmlFor={name} 
        className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation text-sm sm:text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 