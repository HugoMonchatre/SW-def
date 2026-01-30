// Tower positions on the map (in percentage)
// color: 'red' (top), 'blue' (left), 'yellow' (right)
export const TOWER_LAYOUT = [
  // Red towers (top area) - prefixed with 'r'
  { id: 'r2', x: 51, y: 19, type: 'tower', color: 'red' },
  { id: 'r3', x: 33, y: 19, type: 'tower', color: 'red' },
  { id: 'r1', x: 66, y: 19, type: 'tower', color: 'red' },
  { id: 'r5', x: 42, y: 26, type: 'tower', color: 'red' },
  { id: 'r4', x: 58, y: 27, type: 'tower', color: 'red' },
  { id: 'r11', x: 29, y: 34, type: 'tower', color: 'red' },
  { id: 'r10', x: 38, y: 39, type: 'tower', color: 'red' },
  { id: 'r12', x: 19, y: 30, type: 'tower', color: 'red' },
  { id: 'r9', x: 50, y: 42, type: 'tower', color: 'red' },
  { id: 'r8', x: 62, y: 40, type: 'tower', color: 'red' },
  { id: 'r7', x: 72, y: 35, type: 'tower', color: 'red' },
  { id: 'r6', x: 82, y: 31, type: 'tower', color: 'red' },

  // Blue towers (left area) - prefixed with 'b'
  { id: 'b9', x: 42, y: 55, type: 'tower', color: 'blue' },
  { id: 'b6', x: 9, y: 50, type: 'tower', color: 'blue' },
  { id: 'b7', x: 21, y: 47, type: 'tower', color: 'blue' },
  { id: 'b8', x: 31, y: 51, type: 'tower', color: 'blue' },
  { id: 'b1', x: 4, y: 65, type: 'tower', color: 'blue' },
  { id: 'b4', x: 23, y: 63, type: 'tower', color: 'blue' },
  { id: 'b10', x: 43, y: 69, type: 'tower', color: 'blue' },
  { id: 'b11', x: 47, y: 85, type: 'tower', color: 'blue' },
  { id: 'b12', x: 39, y: 93, type: 'tower', color: 'blue' },
  { id: 'b3', x: 25, y: 93, type: 'tower', color: 'blue' },
  { id: 'b5', x: 32, y: 76, type: 'tower', color: 'blue' },
  { id: 'b2', x: 16, y: 77, type: 'tower', color: 'blue' },

  // Yellow towers (right area) - prefixed with 'y'
  { id: 'y9', x: 57, y: 56, type: 'tower', color: 'yellow' },
  { id: 'y10', x: 68, y: 51, type: 'tower', color: 'yellow' },
  { id: 'y12', x: 91, y: 48, type: 'tower', color: 'yellow' },
  { id: 'y5', x: 80, y: 65, type: 'tower', color: 'yellow' },
  { id: 'y1', x: 96, y: 65, type: 'tower', color: 'yellow' },
  { id: 'y2', x: 83, y: 78, type: 'tower', color: 'yellow' },
  { id: 'y11', x: 80, y: 49, type: 'tower', color: 'yellow' },
  { id: 'y8', x: 55, y: 70, type: 'tower', color: 'yellow' },
  { id: 'y6', x: 55, y: 94, type: 'tower', color: 'yellow' },
  { id: 'y7', x: 59, y: 83, type: 'tower', color: 'yellow' },
  { id: 'y4', x: 68, y: 70, type: 'tower', color: 'yellow' },
  { id: 'y3', x: 72, y: 91, type: 'tower', color: 'yellow' },

  // Headquarters
  { id: 'hq1', x: 5, y: 95, type: 'headquarters' },
  { id: 'hq2', x: 50, y: 5, type: 'headquarters' },
  { id: 'hq3', x: 95, y: 95, type: 'headquarters' },
];

// Tower images by color
export const DEFAULT_TOWER_IMAGES = {
  red: '/TowerR.png',
  blue: '/TowerB.png',
  yellow: '/TowerY.png',
};

// Color names for display
export const COLOR_NAMES = {
  r: 'Rouge',
  b: 'Bleue',
  y: 'Jaune',
};

// Legend items
export const LEGEND_ITEMS = [
  { color: 'red', image: '/TowerR.png', label: 'Rouge' },
  { color: 'blue', image: '/TowerB.png', label: 'Bleu' },
  { color: 'yellow', image: '/TowerY.png', label: 'Jaune' },
];

// Get tower display name from id
export const getTowerDisplayName = (towerId) => {
  if (!towerId) return '';
  if (towerId.startsWith('hq')) return 'Quartier Général';

  const colorCode = towerId.charAt(0).toLowerCase();
  const colorName = COLOR_NAMES[colorCode] || '';
  const number = towerId.slice(1);
  return `Tour ${colorName} ${number}`;
};

// Get tower image path
export const getTowerImagePath = (tower, defenseCount = 0) => {
  if (tower.color === 'blue') {
    return `/TowerB/TowerB${defenseCount}.png`;
  }
  return DEFAULT_TOWER_IMAGES[tower.color];
};
