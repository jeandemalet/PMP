'use client';

interface Image {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  width?: number;
  height?: number;
  mimeType: string;
}

interface CropFilmstripProps {
  images: Image[];
  currentImageIndex: number;
  onImageSelect: (index: number) => void;
}

export function CropFilmstrip({
  images,
  currentImageIndex,
  onImageSelect,
}: CropFilmstripProps) {
  if (images.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm">Aucune image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Images</h2>
        <p className="text-sm text-gray-600">
          {images.length} image{images.length > 1 ? 's' : ''} disponible{images.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Filmstrip */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all ${
                index === currentImageIndex
                  ? 'ring-2 ring-indigo-500 border-2 border-indigo-200'
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onImageSelect(index)}
            >
              {/* Image Thumbnail */}
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                {image.filename ? (
                  <img
                    src={`/uploads/${image.filename}`}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-xs text-white truncate">
                  {image.originalName}
                </p>
                {image.width && image.height && (
                  <p className="text-xs text-gray-300">
                    {image.width} × {image.height}
                  </p>
                )}
              </div>

              {/* Current Image Indicator */}
              {index === currentImageIndex && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Image {currentImageIndex + 1} sur {images.length}
          </span>

          <div className="flex space-x-1">
            <button
              onClick={() => onImageSelect(Math.max(0, currentImageIndex - 1))}
              disabled={currentImageIndex === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ←
            </button>
            <button
              onClick={() => onImageSelect(Math.min(images.length - 1, currentImageIndex + 1))}
              disabled={currentImageIndex === images.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
