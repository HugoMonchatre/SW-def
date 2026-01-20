import { useState } from 'react';
import styles from './GuildWarMap.module.css';

// Tower layout: 4-3-2-1 pyramid with headquarters at top
const TOWER_LAYOUT = [
  { id: 'hq', row: 0, position: 0, type: 'headquarters' },
  { id: 't1', row: 1, position: 0, type: 'tower' },
  { id: 't2', row: 2, position: 0, type: 'tower' },
  { id: 't3', row: 2, position: 1, type: 'tower' },
  { id: 't4', row: 3, position: 0, type: 'tower' },
  { id: 't5', row: 3, position: 1, type: 'tower' },
  { id: 't6', row: 3, position: 2, type: 'tower' },
  { id: 't7', row: 4, position: 0, type: 'tower' },
  { id: 't8', row: 4, position: 1, type: 'tower' },
  { id: 't9', row: 4, position: 2, type: 'tower' },
  { id: 't10', row: 4, position: 3, type: 'tower' },
];

function GuildWarMap({ guild, members = [], onTowerClick }) {
  const [selectedTower, setSelectedTower] = useState(null);

  // Group towers by row
  const rows = TOWER_LAYOUT.reduce((acc, tower) => {
    if (!acc[tower.row]) acc[tower.row] = [];
    acc[tower.row].push(tower);
    return acc;
  }, {});

  const handleTowerClick = (tower) => {
    setSelectedTower(tower.id === selectedTower ? null : tower.id);
    if (onTowerClick) {
      onTowerClick(tower);
    }
  };

  const getTowerStatus = (towerId) => {
    // TODO: Connect to actual defense data
    // For now, return random status for demo
    return 'available'; // 'available', 'assigned', 'destroyed'
  };

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <h3>Carte de Guerre</h3>
        <div className={styles.mapLegend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.available}`}></span>
            Disponible
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.assigned}`}></span>
            Assigné
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.destroyed}`}></span>
            Détruit
          </span>
        </div>
      </div>

      <div className={styles.battlefield}>
        {Object.entries(rows).map(([rowIndex, towers]) => (
          <div key={rowIndex} className={styles.towerRow}>
            {towers.map((tower) => (
              <button
                key={tower.id}
                className={`
                  ${styles.tower}
                  ${tower.type === 'headquarters' ? styles.headquarters : ''}
                  ${styles[getTowerStatus(tower.id)]}
                  ${selectedTower === tower.id ? styles.selected : ''}
                `}
                onClick={() => handleTowerClick(tower)}
                title={tower.type === 'headquarters' ? 'QG' : `Tour ${tower.id.replace('t', '')}`}
              >
                {tower.type === 'headquarters' ? (
                  <div className={styles.towerIcon}>
                    <span className={styles.hqIcon}>HQ</span>
                  </div>
                ) : (
                  <div className={styles.towerIcon}>
                    <span className={styles.towerNumber}>{tower.id.replace('t', '')}</span>
                  </div>
                )}
                <div className={styles.towerHealth}>
                  <div className={styles.healthBar} style={{ width: '100%' }}></div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {selectedTower && (
        <div className={styles.towerDetails}>
          <h4>
            {selectedTower === 'hq' ? 'Quartier Général' : `Tour ${selectedTower.replace('t', '')}`}
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
