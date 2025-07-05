// Composant d'encart publicitaire
export default function AdBanner({ title, image, description, link, sponsor, style }) {
  return (
    <div
      className="relative bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl mb-8 hover:scale-[1.02] transition-transform duration-300 group animate-fade-in"
      style={style}
    >
      {image && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0">
          <img src={image} alt={title} className="w-36 h-36 object-cover rounded-xl shadow-lg border-4 border-yellow-200 group-hover:scale-105 transition-transform duration-300" />
        </a>
      )}
      <div className="flex-1">
        <h3 className="text-2xl font-extrabold text-yellow-800 mb-2 drop-shadow-lg">{title}</h3>
        <p className="text-gray-700 mb-4 text-lg leading-relaxed">{description}</p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-6 py-2 rounded-full shadow-md transition-colors duration-200 text-lg"
          >
            Découvrir
          </a>
        )}
        {sponsor && (
          <div className="mt-3 text-xs text-yellow-600 font-semibold italic">Sponsorisé par {sponsor}</div>
        )}
      </div>
      {/* Badge "PUB" */}
      <div className="absolute top-2 right-2 bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
        PUB
      </div>
    </div>
  );
} 