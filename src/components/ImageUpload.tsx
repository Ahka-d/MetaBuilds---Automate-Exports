import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
}

export default function ImageUpload({ onImageSelect, selectedImage, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      onImageSelect(imageFile);
    }
  }, [onImageSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onImageSelect(files[0]);
    }
  };

  return (
    <div className="w-full">
      {!selectedImage ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-300 mb-2">Arrastra una imagen aquí</p>
          <p className="text-gray-500 text-sm mb-4">o</p>
          <label className="cursor-pointer inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Seleccionar archivo
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="relative">
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Preview"
            className="w-full h-64 object-cover rounded-lg"
          />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
