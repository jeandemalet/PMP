import { createCanvas, loadImage, Canvas } from 'canvas';
import { ImgData } from '../types/smartcrop'; // Nous allons créer ce type

// Cette fonction crée une "usine" de canvas que smartcrop peut utiliser
function nodeCanvasFactory(width: number, height: number): Canvas {
  return createCanvas(width, height);
}

// C'est le "pont" principal. Nous réimplémentons les opérations
// d'image pour qu'elles fonctionnent avec Node.js et node-canvas.
export const nodeImageOperations = {
  // Ouvre une image depuis un chemin de fichier
  open: async (imagePath: string): Promise<Canvas> => {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return canvas;
  },

  // Redimensionne une image (qui est maintenant un canvas)
  resample: async (canvas: Canvas, width: number, height: number): Promise<Canvas> => {
    const resampledCanvas = createCanvas(width, height);
    const ctx = resampledCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
    return resampledCanvas;
  },

  // Extrait les données de pixels brutes d'un canvas
  getData: async (canvas: Canvas): Promise<ImgData> => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // smartcrop.js attend un objet spécifique `ImgData`
    return {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
    };
  },
};
