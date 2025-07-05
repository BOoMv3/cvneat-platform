// Composant d'encart publicitaire
export default function AdBanner({ title, image, description, link, sponsor }) {
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4 shadow mb-6">
      {image && (
        <a href={link} target="_blank" rel="noopener noreferrer">
          <img src={image} alt={title} className="w-32 h-32 object-cover rounded-lg" />
        </a>
      )}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-yellow-800 mb-1">{title}</h3>
        <p className="text-gray-700 mb-2">{description}</p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block text-yellow-900 font-semibold underline hover:text-yellow-700">Découvrir</a>
        )}
        {sponsor && (
          <div className="mt-2 text-xs text-yellow-600 font-medium">Sponsorisé par {sponsor}</div>
        )}
      </div>
    </div>
  );
} 