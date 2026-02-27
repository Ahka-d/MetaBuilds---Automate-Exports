import { MapPin, Package } from 'lucide-react';

interface MarketplacePreviewProps {
  imageUrl: string;
  title: string;
  price: string;
  category: string;
  description: string;
}

export default function MarketplacePreview({
  imageUrl,
  title,
  price,
  category,
  description
}: MarketplacePreviewProps) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 max-w-2xl">
      <div className="grid md:grid-cols-2 gap-0">
        <div className="bg-gray-900">
          <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Package className="h-4 w-4" />
            <span>{category || 'Categoría'}</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-100 mb-3">
            {title || 'Título del producto'}
          </h2>

          <div className="text-3xl font-bold text-green-500 mb-4">
            ${price || '0.00'}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <MapPin className="h-4 w-4" />
            <span>Tu ubicación</span>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Descripción</h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {description || 'Descripción detallada aparecerá aquí...'}
            </p>
          </div>

          <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
            Contactar al vendedor
          </button>
        </div>
      </div>
    </div>
  );
}
