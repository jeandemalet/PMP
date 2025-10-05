'use client';

import { useState, useRef, useEffect } from 'react';

interface Image {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  width?: number;
  height?: number;
  mimeType: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropCanvasProps {
  image: Image;
  cropArea: CropArea;
  onCropAreaChange: (area: CropArea) => void;
  cropMode: 'manual' | 'auto';
}

export function CropCanvas({
  image,
  cropArea,
  onCropAreaChange,
  cropMode,
}: CropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Charger l'image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageElement(img);
      setImageLoaded(true);
    };
    img.src = `/uploads/${image.filename}`;
  }, [image]);

  // Dessiner le canvas quand l'image ou la zone de recadrage change
  useEffect(() => {
    if (!imageLoaded || !imageElement || !canvasRef.current || !containerRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Ajuster la taille du canvas à la taille du conteneur
    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Calculer les dimensions d'affichage de l'image (fit to container)
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imageElement.width / imageElement.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      // Image plus large que le conteneur
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / imageAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      // Image plus haute que le conteneur
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * imageAspect;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner l'image
    ctx.drawImage(imageElement, offsetX, offsetY, displayWidth, displayHeight);

    // Dessiner l'overlay semi-transparent
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculer la zone de recadrage en pixels d'affichage
    const cropScaleX = displayWidth / imageElement.width;
    const cropScaleY = displayHeight / imageElement.height;

    const displayCropX = offsetX + cropArea.x * cropScaleX;
    const displayCropY = offsetY + cropArea.y * cropScaleY;
    const displayCropWidth = cropArea.width * cropScaleX;
    const displayCropHeight = cropArea.height * cropScaleY;

    // Effacer la zone de recadrage
    ctx.clearRect(displayCropX, displayCropY, displayCropWidth, displayCropHeight);

    // Dessiner la bordure de la zone de recadrage
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(displayCropX, displayCropY, displayCropWidth, displayCropHeight);

    // Dessiner les poignées de redimensionnement
    const handleSize = 8;
    ctx.fillStyle = '#3b82f6';

    const handles = [
      { x: displayCropX, y: displayCropY }, // Top-left
      { x: displayCropX + displayCropWidth, y: displayCropY }, // Top-right
      { x: displayCropX, y: displayCropY + displayCropHeight }, // Bottom-left
      { x: displayCropX + displayCropWidth, y: displayCropY + displayCropHeight }, // Bottom-right
      { x: displayCropX + displayCropWidth / 2, y: displayCropY }, // Top-middle
      { x: displayCropX + displayCropWidth / 2, y: displayCropY + displayCropHeight }, // Bottom-middle
      { x: displayCropX, y: displayCropY + displayCropHeight / 2 }, // Left-middle
      { x: displayCropX + displayCropWidth, y: displayCropY + displayCropHeight / 2 }, // Right-middle
    ];

    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });

    // Dessiner les guides de règle des tiers
    if (cropMode === 'manual') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;

      // Lignes horizontales
      const thirdY1 = displayCropY + displayCropHeight / 3;
      const thirdY2 = displayCropY + (2 * displayCropHeight) / 3;
      ctx.beginPath();
      ctx.moveTo(displayCropX, thirdY1);
      ctx.lineTo(displayCropX + displayCropWidth, thirdY1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(displayCropX, thirdY2);
      ctx.lineTo(displayCropX + displayCropWidth, thirdY2);
      ctx.stroke();

      // Lignes verticales
      const thirdX1 = displayCropX + displayCropWidth / 3;
      const thirdX2 = displayCropX + (2 * displayCropWidth) / 3;
      ctx.beginPath();
      ctx.moveTo(thirdX1, displayCropY);
      ctx.lineTo(thirdX1, displayCropY + displayCropHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(thirdX2, displayCropY);
      ctx.lineTo(thirdX2, displayCropY + displayCropHeight);
      ctx.stroke();
    }
  }, [imageLoaded, imageElement, cropArea, cropMode]);

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (cropMode !== 'manual') return;

    const pos = getMousePosition(e);

    // Vérifier si on clique sur une poignée
    const handles = getHandlePositions();
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      const distance = Math.sqrt((pos.x - handle.x) ** 2 + (pos.y - handle.y) ** 2);
      if (distance <= 10) {
        setIsDragging(true);
        setDragStart({ x: i, y: 0 }); // i = index de la poignée
        return;
      }
    }

    // Sinon, commencer à déplacer la zone de recadrage
    setIsDragging(true);
    setDragStart(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || cropMode !== 'manual') return;

    const pos = getMousePosition(e);

    if (typeof dragStart.x === 'number' && dragStart.x >= 0 && dragStart.x <= 7) {
      // Redimensionnement par poignées
      handleResize(pos);
    } else {
      // Déplacement de la zone
      handleMove(pos);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getHandlePositions = () => {
    if (!canvasRef.current || !imageElement || !containerRef.current) return [];

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const containerRect = container.getBoundingClientRect();
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imageElement.width / imageElement.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / imageAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * imageAspect;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    const cropScaleX = displayWidth / imageElement.width;
    const cropScaleY = displayHeight / imageElement.height;

    const displayCropX = offsetX + cropArea.x * cropScaleX;
    const displayCropY = offsetY + cropArea.y * cropScaleY;
    const displayCropWidth = cropArea.width * cropScaleX;
    const displayCropHeight = cropArea.height * cropScaleY;

    return [
      { x: displayCropX, y: displayCropY }, // Top-left
      { x: displayCropX + displayCropWidth, y: displayCropY }, // Top-right
      { x: displayCropX, y: displayCropY + displayCropHeight }, // Bottom-left
      { x: displayCropX + displayCropWidth, y: displayCropY + displayCropHeight }, // Bottom-right
      { x: displayCropX + displayCropWidth / 2, y: displayCropY }, // Top-middle
      { x: displayCropX + displayCropWidth / 2, y: displayCropY + displayCropHeight }, // Bottom-middle
      { x: displayCropX, y: displayCropY + displayCropHeight / 2 }, // Left-middle
      { x: displayCropX + displayCropWidth, y: displayCropY + displayCropHeight / 2 }, // Right-middle
    ];
  };

  const handleMove = (currentPos: { x: number; y: number }) => {
    if (!imageElement || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imageElement.width / imageElement.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / imageAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * imageAspect;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    const scaleX = imageElement.width / displayWidth;
    const scaleY = imageElement.height / displayHeight;

    const deltaX = (currentPos.x - dragStart.x) * scaleX;
    const deltaY = (currentPos.y - dragStart.y) * scaleY;

    const newX = Math.max(0, Math.min(imageElement.width - cropArea.width, cropArea.x + deltaX));
    const newY = Math.max(0, Math.min(imageElement.height - cropArea.height, cropArea.y + deltaY));

    onCropAreaChange({
      ...cropArea,
      x: newX,
      y: newY,
    });

    setDragStart(currentPos);
  };

  const handleResize = (currentPos: { x: number; y: number }) => {
    if (!imageElement || !containerRef.current || typeof dragStart.x !== 'number') return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imageElement.width / imageElement.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / imageAspect;
      offsetX = 0;
      offsetY = (containerRect.height - displayHeight) / 2;
    } else {
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * imageAspect;
      offsetX = (containerRect.width - displayWidth) / 2;
      offsetY = 0;
    }

    const scaleX = imageElement.width / displayWidth;
    const scaleY = imageElement.height / displayHeight;

    const cropScaleX = displayWidth / imageElement.width;
    const cropScaleY = displayHeight / imageElement.height;

    const displayCropX = offsetX + cropArea.x * cropScaleX;
    const displayCropY = offsetY + cropArea.y * cropScaleY;
    const displayCropWidth = cropArea.width * cropScaleX;
    const displayCropHeight = cropArea.height * cropScaleY;

    // Calculer les deltas en pixels d'affichage
    const deltaX = currentPos.x - (displayCropX + displayCropWidth / 2);
    const deltaY = currentPos.y - (displayCropY + displayCropHeight / 2);

    // Convertir en coordonnées d'image
    const imageDeltaX = deltaX * scaleX;
    const imageDeltaY = deltaY * scaleY;

    let newX = cropArea.x;
    let newY = cropArea.y;
    let newWidth = cropArea.width;
    let newHeight = cropArea.height;

    const handleIndex = dragStart.x;

    // Gestion des 8 poignées de redimensionnement
    switch (handleIndex) {
      case 0: // Top-left
        newX = Math.min(cropArea.x + cropArea.width - 10, cropArea.x + imageDeltaX);
        newY = Math.min(cropArea.y + cropArea.height - 10, cropArea.y + imageDeltaY);
        newWidth = cropArea.width - (newX - cropArea.x);
        newHeight = cropArea.height - (newY - cropArea.y);
        break;

      case 1: // Top-right
        newY = Math.min(cropArea.y + cropArea.height - 10, cropArea.y + imageDeltaY);
        newWidth = cropArea.width + imageDeltaX;
        newHeight = cropArea.height - (newY - cropArea.y);
        break;

      case 2: // Bottom-left
        newX = Math.min(cropArea.x + cropArea.width - 10, cropArea.x + imageDeltaX);
        newWidth = cropArea.width - (newX - cropArea.x);
        newHeight = cropArea.height + imageDeltaY;
        break;

      case 3: // Bottom-right
        newWidth = cropArea.width + imageDeltaX;
        newHeight = cropArea.height + imageDeltaY;
        break;

      case 4: // Top-middle
        newY = Math.min(cropArea.y + cropArea.height - 10, cropArea.y + imageDeltaY);
        newHeight = cropArea.height - (newY - cropArea.y);
        break;

      case 5: // Bottom-middle
        newHeight = cropArea.height + imageDeltaY;
        break;

      case 6: // Left-middle
        newX = Math.min(cropArea.x + cropArea.width - 10, cropArea.x + imageDeltaX);
        newWidth = cropArea.width - (newX - cropArea.x);
        break;

      case 7: // Right-middle
        newWidth = cropArea.width + imageDeltaX;
        break;
    }

    // S'assurer que les nouvelles dimensions sont valides
    newWidth = Math.max(10, Math.min(imageElement.width - newX, newWidth));
    newHeight = Math.max(10, Math.min(imageElement.height - newY, newHeight));
    newX = Math.max(0, Math.min(imageElement.width - newWidth, newX));
    newY = Math.max(0, Math.min(imageElement.height - newHeight, newY));

    onCropAreaChange({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  if (!imageLoaded) {
    return (
      <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement de l'image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Recadrage</h2>
        <p className="text-sm text-gray-600">
          {image.originalName} ({image.width} × {image.height})
        </p>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 p-4">
        <div
          ref={containerRef}
          className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden"
          style={{ minHeight: '400px' }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Mode Auto Overlay */}
          {cropMode === 'auto' && (
            <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  🤖
                </div>
                <p className="text-lg font-medium">Mode automatique</p>
                <p className="text-sm opacity-90">L'IA va détecter le sujet principal</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Zone: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
          </span>
          <span>
            Position: ({Math.round(cropArea.x)}, {Math.round(cropArea.y)})
          </span>
        </div>
      </div>
    </div>
  );
}
