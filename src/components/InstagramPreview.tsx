import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

interface InstagramPreviewProps {
  imageUrl: string;
  caption: string;
}

export default function InstagramPreview({ imageUrl, caption }: InstagramPreviewProps) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 max-w-md mx-auto">
      <div className="flex items-center gap-3 p-3 border-b border-gray-700">
        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full"></div>
        <span className="font-semibold text-gray-100">tu_perfil</span>
      </div>

      <img src={imageUrl} alt="Post" className="w-full aspect-square object-cover" />

      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 text-gray-100 cursor-pointer hover:text-red-500 transition-colors" />
            <MessageCircle className="h-6 w-6 text-gray-100 cursor-pointer hover:text-gray-300 transition-colors" />
            <Send className="h-6 w-6 text-gray-100 cursor-pointer hover:text-gray-300 transition-colors" />
          </div>
          <Bookmark className="h-6 w-6 text-gray-100 cursor-pointer hover:text-gray-300 transition-colors" />
        </div>

        <div className="text-sm text-gray-100">
          <span className="font-semibold">tu_perfil</span>{' '}
          <span className="text-gray-300">{caption || 'Caption generado aparecerá aquí...'}</span>
        </div>
      </div>
    </div>
  );
}
