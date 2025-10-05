'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface Gallery {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  _count: {
    images: number;
  };
  images: Array<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  }>;
}

interface UploadDialogProps {
  galleries: Gallery[];
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function UploadDialog({ galleries, onClose, onUploadSuccess }: UploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadResults, setUploadResults] = useState<{ [key: string]: { success: boolean; error?: string } }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0 || !selectedGalleryId) {
      return;
    }

    setIsUploading(true);
    setUploadProgress({});
    setUploadResults({});

    // Nombre maximum d'uploads simultanés
    const MAX_CONCURRENT_UPLOADS = 3;

    // Diviser les fichiers en groupes pour l'upload parallélisé
    const fileGroups = [];
    for (let i = 0; i < selectedFiles.length; i += MAX_CONCURRENT_UPLOADS) {
      fileGroups.push(selectedFiles.slice(i, i + MAX_CONCURRENT_UPLOADS));
    }

    // Traiter chaque groupe en parallèle
    for (const group of fileGroups) {
      const uploadPromises = group.map(async (file) => {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

          const formData = new FormData();
          formData.append('file', file);
          formData.append('galleryId', selectedGalleryId);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            setUploadResults(prev => ({ ...prev, [file.name]: { success: true } }));
          } else {
            const error = await response.json();
            setUploadResults(prev => ({ ...prev, [file.name]: { success: false, error: error.error } }));
          }
        } catch (error) {
          setUploadResults(prev => ({
            ...prev,
            [file.name]: { success: false, error: 'Erreur de connexion' }
          }));
        }
      });

      // Attendre que tous les uploads du groupe soient terminés avant de passer au suivant
      await Promise.allSettled(uploadPromises);
    }

    setIsUploading(false);
    onUploadSuccess();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const hasErrors = Object.values(uploadResults).some(result => !result.success);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ajouter des images</h2>
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Gallery Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner une galerie
            </label>
            <select
              value={selectedGalleryId}
              onChange={(e) => setSelectedGalleryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isUploading}
            >
              <option value="">Choisir une galerie...</option>
              {galleries.map((gallery) => (
                <option key={gallery.id} value={gallery.id}>
                  {gallery.name} ({gallery._count.images} images)
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isUploading
                ? 'border-gray-300 bg-gray-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            {selectedFiles.length === 0 ? (
              <div>
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Glissez vos images ici
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  ou cliquez pour sélectionner des fichiers
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Sélectionner des fichiers
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-gray-600">
                    Taille totale: {formatFileSize(getTotalSize())}
                  </p>
                </div>

                {/* File List */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Progress Bar */}
                        {isUploading && (
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name] || 0}%` }}
                            />
                          </div>
                        )}

                        {/* Status */}
                        {uploadResults[file.name] && (
                          <div className="w-5 h-5">
                            {uploadResults[file.name].success ? (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Remove Button */}
                        {!isUploading && (
                          <Button
                            onClick={() => removeFile(index)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error Summary */}
                {hasErrors && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Certaines images n'ont pas pu être uploadées :
                    </p>
                    <div className="space-y-1">
                      {Object.entries(uploadResults)
                        .filter(([_, result]) => !result.success)
                        .map(([filename, result]) => (
                          <p key={filename} className="text-xs text-red-700">
                            {filename}: {result.error}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isUploading}
          >
            Annuler
          </Button>

          <Button
            onClick={uploadFiles}
            disabled={selectedFiles.length === 0 || !selectedGalleryId || isUploading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isUploading ? 'Upload en cours...' : `Uploader ${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
