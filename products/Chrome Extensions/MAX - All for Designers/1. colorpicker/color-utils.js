/**
 * color-utils.js — Shared color conversion utilities for colorpicker.js + colorstudio.js
 *
 * [D7] getContrastColor / getContrastTextColor — 2 copies with identical logic
 * [D8] hexToRgb, hexToHsl, hexToCmyk, hexToRgbObj, rgbToHsvObj, hsvToRgbObj,
 *      rgbToHexStr, rgbToHslObj, hslToRgbObj, rgbToCmykObj, cmykToRgbObj
 *
 * All functions are exposed on window so both scripts can reference them directly.
 */

// [D8] Parse a hex color string → { r, g, b } integers (0-255). Returns null on invalid input.
window.hexToRgbObj = function hexToRgbObj(hex) {
  if (!hex) return null;
  let clean = hex.replace(/^#/, '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

// [D8] Parse hex → "rgb(r, g, b)" string (used by colorpicker.js display)
window.hexToRgbStr = function hexToRgbStr(hex) {
  const obj = window.hexToRgbObj(hex);
  return obj ? `rgb(${obj.r}, ${obj.g}, ${obj.b})` : 'rgb(0, 0, 0)';
};

// [D8] Parse hex → "hsl(H, S%, L%)" string
window.hexToHslStr = function hexToHslStr(hex) {
  const obj = window.hexToRgbObj(hex);
  if (!obj) return 'hsl(0, 0%, 0%)';
  const hsl = window.rgbToHslObj(obj.r, obj.g, obj.b);
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
};

// [D8] Parse hex → "cmyk(C%, M%, Y%, K%)" string
window.hexToCmykStr = function hexToCmykStr(hex) {
  const obj = window.hexToRgbObj(hex);
  if (!obj) return 'cmyk(0%, 0%, 0%, 100%)';
  const cmyk = window.rgbToCmykObj(obj.r, obj.g, obj.b);
  return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
};

// [D8] { r, g, b } → "#RRGGBB" uppercase hex string
window.rgbToHexStr = function rgbToHexStr(r, g, b) {
  const toHex = c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// [D8] (r,g,b) → { h:0-360, s:0-100, l:0-100 }
window.rgbToHslObj = function rgbToHslObj(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

// [D8] (h,s,l) → { r, g, b }
window.hslToRgbObj = function hslToRgbObj(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

// [D8] (r,g,b) → { h:0-360, s:0-100, v:0-100 }
window.rgbToHsvObj = function rgbToHsvObj(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
};

// [D8] (h,s,v) → { r, g, b }
window.hsvToRgbObj = function hsvToRgbObj(h, s, v) {
  s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor((h / 60) % 6);
  const f = (h / 60) - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

// [D8] (r,g,b) → { c, m, y, k } percentages 0-100
window.rgbToCmykObj = function rgbToCmykObj(r, g, b) {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const k = 1 - Math.max(rN, gN, bN);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = Math.round(((1 - rN - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gN - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bN - k) / (1 - k)) * 100);
  return { c, m, y, k: Math.round(k * 100) };
};

// [D8] (c,m,y,k) percentages → { r, g, b }
window.cmykToRgbObj = function cmykToRgbObj(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k))
  };
};

// [D7] Calculate perceived luminance (YIQ formula) and return a suitable text color.
// Returns '#0f172a' (dark) for light backgrounds, '#ffffff' for dark ones.
// Named getContrastColor here; colorstudio.js called it getContrastTextColor — same logic.
window.getContrastColor = function getContrastColor(hex) {
  if (!hex) return '#ffffff';
  const obj = window.hexToRgbObj(hex);
  if (!obj) return '#ffffff';
  const yiq = (obj.r * 299 + obj.g * 587 + obj.b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
};

// Alias used by colorstudio.js
window.getContrastTextColor = window.getContrastColor;
