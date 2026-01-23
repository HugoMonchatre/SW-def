import { useState } from 'react';
import styles from './GuildWarMap.module.css';

// Tower positions on the map (in percentage)
// color: 'red' (top), 'blue' (left), 'yellow' (right)
const TOWER_LAYOUT = [
  // Red towers (top area)
  { id: 't1', x: 50, y: 10, type: 'tower', color: 'red' },
  { id: 't2', x: 35, y: 20, type: 'tower', color: 'red' },
  { id: 't3', x: 65, y: 20, type: 'tower', color: 'red' },
  { id: 't4', x: 50, y: 30, type: 'tower', color: 'red' },

  // Blue towers (left area)
  { id: 't5', x: 20, y: 35, type: 'tower', color: 'blue' },
  { id: 't6', x: 12, y: 50, type: 'tower', color: 'blue' },
  { id: 't7', x: 25, y: 50, type: 'tower', color: 'blue' },
  { id: 't8', x: 8, y: 65, type: 'tower', color: 'blue' },
  { id: 't9', x: 20, y: 65, type: 'tower', color: 'blue' },
  { id: 't10', x: 5, y: 80, type: 'tower', color: 'blue' },

  // Yellow towers (right area)
  { id: 't11', x: 80, y: 35, type: 'tower', color: 'yellow' },
  { id: 't12', x: 75, y: 50, type: 'tower', color: 'yellow' },
  { id: 't13', x: 88, y: 50, type: 'tower', color: 'yellow' },
  { id: 't14', x: 80, y: 65, type: 'tower', color: 'yellow' },
  { id: 't15', x: 92, y: 65, type: 'tower', color: 'yellow' },
  { id: 't16', x: 95, y: 80, type: 'tower', color: 'yellow' },

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

      <div className={styles.battlefield}>
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
            onClick={() => handleTowerClick(tower)}
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
            {selectedTower.startsWith('hq') ? 'Quartier Général' : `Tour ${selectedTower.replace('t', '')}`}
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
