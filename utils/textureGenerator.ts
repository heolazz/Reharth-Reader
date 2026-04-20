import * as THREE from 'three';

export const createBookTexture = (title: string, color: string, width: number = 256, height: number = 360) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Spine Shadow (Left side)
  const gradient = ctx.createLinearGradient(0, 0, 40, 0);
  gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 40, height);

  // Texture noise
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }

  // Title Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Wrap text
  const words = title.split(' ');
  let line = '';
  let y = height / 3;
  const lineHeight = 30;

  for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > width - 40 && n > 0) {
      ctx.fillText(line, width / 2, y);
      line = words[n] + ' ';
      y += lineHeight;
    }
    else {
      line = testLine;
    }
  }
  ctx.fillText(line, width / 2, y);

  // Bottom Decoration
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(40, height - 60, width - 80, 2);

  return new THREE.CanvasTexture(canvas);
};

export const createSpineTexture = (title: string, color: string, width: number = 64, height: number = 360) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Shading edges to look round
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
  gradient.addColorStop(0.2, 'rgba(0,0,0,0.0)');
  gradient.addColorStop(0.8, 'rgba(0,0,0,0.0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Vertical Text
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 18px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.length > 20 ? title.substring(0, 18) + '..' : title, 0, 0);
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
};
