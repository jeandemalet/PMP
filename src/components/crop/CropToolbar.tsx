'use client';

import { Button } from '@/components/ui/button';

interface CropToolbarProps {
  cropMode: 'manual' | 'auto';
  onCropModeChange: (mode: 'manual' | 'auto') => void;
  onCrop: () => void;
  isProcessing: boolean;
  // Nouveaux props pour les outils de recadrage
  onCropTool?: (tool: 'bars' | 'split' | 'rotate' | 'ai') => void;
  onAspectRatio?: (ratio: string) => void;
  onInstagramFormat?: (format: 'post' | 'story' | 'reel') => void;
  onCancel?: () => void;
}

export function CropToolbar({
  cropMode,
  onCropModeChange,
  onCrop,
  isProcessing,
  onCropTool,
  onAspectRatio,
  onInstagramFormat,
  onCancel,
}: CropToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Outils</h2>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Mode Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Mode de recadrage</h3>
          <div className="space-y-2">
            <Button
              onClick={() => onCropModeChange('manual')}
              variant={cropMode === 'manual' ? 'default' : 'outline'}
              className="w-full justify-start"
              disabled={isProcessing}
            >
              ✂️ Recadrage manuel
            </Button>
            <Button
              onClick={() => onCropModeChange('auto')}
              variant={cropMode === 'auto' ? 'default' : 'outline'}
              className="w-full justify-start"
              disabled={isProcessing}
            >
              🤖 Recadrage automatique
            </Button>
          </div>
        </div>

        {/* Crop Tools - Only show in manual mode */}
        {cropMode === 'manual' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Outils de recadrage</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onCropTool?.('bars')}
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isProcessing}
                title="Barres blanches"
              >
                ☰
              </Button>
              <Button
                onClick={() => onCropTool?.('split')}
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isProcessing}
                title="Fractionner"
              >
                ⊞
              </Button>
              <Button
                onClick={() => onCropTool?.('rotate')}
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isProcessing}
                title="Rotation"
              >
                ↻
              </Button>
              <Button
                onClick={() => onCropTool?.('ai')}
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={isProcessing}
                title="Recadrage IA"
              >
                🧠
              </Button>
            </div>
          </div>
        )}

        {/* Aspect Ratios - Only show in manual mode */}
        {cropMode === 'manual' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Formats prédéfinis</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onAspectRatio?.('1:1')}
                variant="outline"
                size="sm"
                disabled={isProcessing}
                title="Carré (1:1)"
              >
                1:1
              </Button>
              <Button
                onClick={() => onAspectRatio?.('3:4')}
                variant="outline"
                size="sm"
                disabled={isProcessing}
                title="Portrait (3:4)"
              >
                3:4
              </Button>
              <Button
                onClick={() => onAspectRatio?.('4:3')}
                variant="outline"
                size="sm"
                disabled={isProcessing}
                title="Paysage (4:3)"
              >
                4:3
              </Button>
              <Button
                onClick={() => onAspectRatio?.('16:9')}
                variant="outline"
                size="sm"
                disabled={isProcessing}
                title="Panoramique (16:9)"
              >
                16:9
              </Button>
            </div>
          </div>
        )}

        {/* Instagram Formats - Only show in manual mode */}
        {cropMode === 'manual' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Formats Instagram</h3>
            <div className="space-y-2">
              <Button
                onClick={() => onInstagramFormat?.('post')}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={isProcessing}
                title="Post Instagram (1:1)"
              >
                📱 Post carré
              </Button>
              <Button
                onClick={() => onInstagramFormat?.('story')}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={isProcessing}
                title="Story Instagram (9:16)"
              >
                📱 Story
              </Button>
              <Button
                onClick={() => onInstagramFormat?.('reel')}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={isProcessing}
                title="Reel Instagram (9:16)"
              >
                📱 Reel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t">
          <Button
            onClick={onCrop}
            disabled={isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement en cours...
              </>
            ) : (
              'Appliquer le recadrage'
            )}
          </Button>

          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full mt-2"
            disabled={isProcessing}
          >
            Annuler
          </Button>
        </div>

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Glissez pour déplacer la zone de recadrage</p>
          <p>• Utilisez les poignées pour redimensionner</p>
          <p>• Double-cliquez pour recentrer</p>
        </div>
      </div>
    </div>
  );
}
