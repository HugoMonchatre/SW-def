import { useState } from 'react';
import styles from './GuildWarMap.module.css';

// Tower positions on the map (in percentage)
// color: 'red' (top), 'blue' (left), 'yellow' (right)
const TOWER_LAYOUT = [
  // Red towers (top area) - prefixed with 'r'
  { id: 'r1', x: 51, y: 19, type: 'tower', color: 'red' },
  { id: 'r2', x: 33, y: 19, type: 'tower', color: 'red' },
  { id: 'r3', x: 66, y: 19, type: 'tower', color: 'red' },
  { id: 'r4', x: 42, y: 26, type: 'tower', color: 'red' },
  { id: 'r5', x: 58, y: 27, type: 'tower', color: 'red' },
  { id: 'r6', x: 29, y: 34, type: 'tower', color: 'red' },
  { id: 'r7', x: 38, y: 39, type: 'tower', color: 'red' },
  { id: 'r8', x: 19, y: 30, type: 'tower', color: 'red' },
  { id: 'r9', x: 50, y: 42, type: 'tower', color: 'red' },
  { id: 'r10', x: 62, y: 40, type: 'tower', color: 'red' },
  { id: 'r11', x: 72, y: 35, type: 'tower', color: 'red' },
  { id: 'r12', x: 82, y: 31, type: 'tower', color: 'red' },

  // Blue towers (left area) - prefixed with 'b'
  { id: 'b1', x: 42, y: 55, type: 'tower', color: 'blue' },
  { id: 'b2', x: 9, y: 50, type: 'tower', color: 'blue' },
  { id: 'b3', x: 21, y: 47, type: 'tower', color: 'blue' },
  { id: 'b4', x: 31, y: 51, type: 'tower', color: 'blue' },
  { id: 'b5', x: 4, y: 65, type: 'tower', color: 'blue' },
  { id: 'b6', x: 23, y: 63, type: 'tower', color: 'blue' },
  { id: 'b7', x: 43, y: 69, type: 'tower', color: 'blue' },
  { id: 'b8', x: 47, y: 85, type: 'tower', color: 'blue' },
  { id: 'b9', x: 39, y: 93, type: 'tower', color: 'blue' },
  { id: 'b10', x: 25, y: 93, type: 'tower', color: 'blue' },
  { id: 'b11', x: 32, y: 76, type: 'tower', color: 'blue' },
  { id: 'b12', x: 16, y: 77, type: 'tower', color: 'blue' },

  // Yellow towers (right area) - prefixed with 'y'
  { id: 'y1', x: 57, y: 56, type: 'tower', color: 'yellow' },
  { id: 'y2', x: 68, y: 51, type: 'tower', color: 'yellow' },
  { id: 'y3', x: 91, y: 48, type: 'tower', color: 'yellow' },
  { id: 'y4', x: 80, y: 65, type: 'tower', color: 'yellow' },
  { id: 'y5', x: 96, y: 65, type: 'tower', color: 'yellow' },
  { id: 'y6', x: 83, y: 78, type: 'tower', color: 'yellow' },
  { id: 'y7', x: 80, y: 49, type: 'tower', color: 'yellow' },
  { id: 'y8', x: 55, y: 70, type: 'tower', color: 'yellow' },
  { id: 'y9', x: 55, y: 94, type: 'tower', color: 'yellow' },
  { id: 'y10', x: 59, y: 83, type: 'tower', color: 'yellow' },
  { id: 'y10', x: 68, y: 70, type: 'tower', color: 'yellow' },
  { id: 'y10', x: 72, y: 91, type: 'tower', color: 'yellow' },

  // Headquarters (rectangles - no image for now)
  { id: 'hq1', x: 5, y: 95, type: 'headquarters' },
  { id: 'hq2', x: 50, y: 5, type: 'headquarters' },
  { id: 'hq3', x: 95, y: 95, type: 'headquarters' },
];

// Map color to image
const TOWER_IMAGES = {
  red: '/TowerR.png',
  blue: '/TowerB.png',
  yellow: '/TowerY.png',
};

function GuildWarMap({ guild, members = [], onTowerClick }) {
  const [selectedTower, setSelectedTower] = useState(null);

  const handleTowerClick = (tower) => {
    setSelectedTower(tower.id === selectedTower ? null : tower.id);
    if (onTowerClick) {
      onTowerClick(tower);
    }
  };

  const getTowerStatus = (towerId) => {
    // TODO: Connect to actual defense data
    return 'available'; // 'available', 'assigned', 'destroyed'
  };

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <h3>Carte de Guerre</h3>
        <div className={styles.mapLegend}>
          <span className={styles.legendItem}>
            <img src="/TowerR.png" alt="Rouge" className={styles.legendIcon} />
            Rouge
          </span>
          <span className={styles.legendItem}>
            <img src="/TowerB.png" alt="Bleu" className={styles.legendIcon} />
            Bleu
          </span>
          <span className={styles.legendItem}>
            <img src="/TowerY.png" alt="Jaune" className={styles.legendIcon} />
            Jaune
          </span>
        </div>
      </div>

      <div
        className={styles.battlefield}
        onClick={() => setSelectedTower(null)}
      >
        <img
          src="/gw-map.png"
          alt="Guild War Map"
          className={styles.mapBackground}
        />

        {TOWER_LAYOUT.map((tower) => (
          <button
            key={tower.id}
            className={`
              ${styles.tower}
              ${tower.type === 'headquarters' ? styles.headquarters : ''}
              ${selectedTower === tower.id ? styles.selected : ''}
            `}
            style={{
              left: `${tower.x}%`,
              top: `${tower.y}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleTowerClick(tower);
            }}
            title={tower.type === 'headquarters' ? 'QG' : `Tour ${tower.id.replace('t', '')}`}
          >
            {tower.type === 'tower' && tower.color && (
              <img
                src={TOWER_IMAGES[tower.color]}
                alt={`Tour ${tower.color}`}
                className={styles.towerImage}
              />
            )}
            {tower.type === 'headquarters' && (
              <span className={styles.hqLabel}>QG</span>
            )}
          </button>
        ))}
      </div>

      {selectedTower && (
        <div className={styles.towerDetails}>
          <h4>
            {selectedTower.startsWith('hq')
              ? 'Quartier Général'
              : `Tour ${selectedTower.charAt(0).toUpperCase() === 'R' ? 'Rouge' : selectedTower.charAt(0).toUpperCase() === 'B' ? 'Bleue' : 'Jaune'} ${selectedTower.slice(1)}`}
          </h4>
          <p className={styles.towerInfo}>
            Cliquez pour assigner des défenses à cette position
          </p>
        </div>
      )}
    </div>
  );
}

export default GuildWarMap;
