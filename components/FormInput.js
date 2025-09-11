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
  // Villages proches de Ganges pour l'autocomplétion
  const nearbyVillages = [
    'Ganges', 'Sumène', 'Saint-Bauzille-de-Putois', 'Laroque', 'Cazilhac', 
    'Montoulieu', 'Pégairolles-de-Buèges', 'Saint-Julien-de-la-Nef', 
    'Saint-Laurent-le-Minier', 'Moulès-et-Baucels', 'Pomérols', 'Causse-de-la-Selle'
  ];

  const isVilleField = name === 'ville';
  const isCodePostalField = name === 'code_postal';

  return (
    <div className="mb-3 sm:mb-4">
      <label 
        htmlFor={name} 
        className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {isVilleField && (
          <span className="text-xs text-gray-500 ml-1">
            (Ganges, Sumène, Saint-Bauzille...)
          </span>
        )}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        list={isVilleField ? 'villages-list' : undefined}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation text-sm sm:text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {isVilleField && (
        <datalist id="villages-list">
          {nearbyVillages.map((village, index) => (
            <option key={index} value={village} />
          ))}
        </datalist>
      )}
      {isCodePostalField && (
        <p className="mt-1 text-xs text-gray-500">
          Code postal de Ganges et environs (34190, 34150, 34160...)
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 