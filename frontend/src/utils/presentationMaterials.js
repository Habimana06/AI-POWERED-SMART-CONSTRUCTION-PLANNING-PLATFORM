import * as THREE from 'three';
import { FURNITURE_CATALOG } from './buildingAssets';

const cache = {};

function noiseCanvas(w, h, baseColor, noiseAlpha = 0.07, grain = 1200) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < grain; i += 1) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * noiseAlpha;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}

function makeRepeatTexture(key, canvas, repeat = 4) {
  if (cache[key]) return cache[key];
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache[key] = tex;
  return tex;
}

export function plasterTexture(color = '#F5F5F5') {
  const key = `plaster-${color}`;
  return makeRepeatTexture(key, noiseCanvas(128, 128, color, 0.06, 900));
}

export function concreteTexture(color = '#ECEFF1') {
  const key = `concrete-${color}`;
  const canvas = noiseCanvas(128, 128, color, 0.09, 1400);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  for (let i = 0; i < 128; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  return makeRepeatTexture(key, canvas, 6);
}

export function woodGrainTexture(color = '#8D6E63') {
  const key = `wood-${color}`;
  const canvas = noiseCanvas(128, 32, color, 0.05, 400);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  for (let y = 0; y < 32; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache[key] = tex;
  return tex;
}

export function tileTexture(color = '#D7CCC8') {
  const key = `tile-${color}`;
  const canvas = noiseCanvas(64, 64, color, 0.04, 300);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 64, 64);
  return makeRepeatTexture(key, canvas, 8);
}

export function plasterMaterial(color = '#FFFFFF') {
  return {
    map: plasterTexture(color),
    color: '#ffffff',
    roughness: 0.78,
    metalness: 0,
  };
}

export function concreteMaterial(color = '#ECEFF1') {
  return {
    map: concreteTexture(color),
    color: '#ffffff',
    roughness: 0.82,
    metalness: 0,
  };
}

export function stoneMaterial(color = '#7F8C8D') {
  return {
    map: concreteTexture(color),
    color: '#ffffff',
    roughness: 0.92,
    metalness: 0.02,
  };
}

export function glassPhysicalProps({ color = '#7EC8E3', emissive = '#1a3040', emissiveIntensity = 0.06 } = {}) {
  return {
    color,
    transmission: 0.94,
    roughness: 0.03,
    thickness: 0.15,
    ior: 1.52,
    transparent: true,
    emissive,
    emissiveIntensity,
    metalness: 0.05,
  };
}

const CATEGORY_PRESETS = {
  bed: { roughness: 0.88, metalness: 0 },
  furniture: { roughness: 0.72, metalness: 0.03 },
  kitchen: { roughness: 0.38, metalness: 0.12 },
  bathroom: { roughness: 0.28, metalness: 0.08 },
  light: { roughness: 0.35, metalness: 0.25 },
  decor: { roughness: 0.85, metalness: 0 },
  exterior: { roughness: 0.55, metalness: 0.15 },
};

export function furnitureMaterialProps(item, presentationMode = false) {
  const cat = FURNITURE_CATALOG.find((c) => c.id === item.id)?.category || 'furniture';
  const preset = CATEGORY_PRESETS[cat] || CATEGORY_PRESETS.furniture;
  if (!presentationMode) {
    return { color: item.color || '#95A5A6', roughness: 0.7, metalness: 0 };
  }
  return {
    color: item.color || '#95A5A6',
    roughness: preset.roughness,
    metalness: preset.metalness,
    ...(cat === 'furniture' && item.id?.includes('desk') ? { map: woodGrainTexture('#8B4513') } : {}),
    ...(cat === 'bed' ? { roughness: 0.9 } : {}),
  };
}
