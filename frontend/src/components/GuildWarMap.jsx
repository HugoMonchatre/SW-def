import { useState, useEffect, useCallback, useMemo } from 'react';
import TowerDefenseModal from './TowerDefenseModal';
import {
  TOWER_LAYOUT,
  LEGEND_ITEMS,
  getTowerDisplayName,
  getTowerImagePath,
} from './guildWarMapConfig';
import api from '../services/api';
import styles from './GuildWarMap.module.css';

function GuildWarMap({ guild, user, members = [], onTowerClick, onToast }) {
  const [selectedTower, setSelectedTower] = useState(null);
  const [modalTower, setModalTower] = useState(null);
  const [towerDefenseCounts, setTowerDefenseCounts] = useState({});

  // Fetch all tower defense counts
  const fetchTowerDefenses = useCallback(async () => {
    if (!guild?.id) return;

    try {
      const response = await api.get(`/towers/${guild.id}`);

      const counts = {};
      (response.data.towers || []).forEach(tower => {
        counts[tower.towerId] = tower.defenses?.length || 0;
      });
      setTowerDefenseCounts(counts);
    } catch (error) {
      console.error('Error fetching tower defenses:', error);
    }
  }, [guild?.id]);

  useEffect(() => {
    fetchTowerDefenses();
  }, [fetchTowerDefenses]);

  const handleTowerClick = useCallback((tower) => {
    setSelectedTower(prev => prev === tower.id ? null : tower.id);
    setModalTower(tower);
    onTowerClick?.(tower);
  }, [onTowerClick]);

  const handleCloseModal = useCallback(() => {
    setModalTower(null);
  }, []);

  const handleBattlefieldClick = useCallback(() => {
    setSelectedTower(null);
  }, []);

  // Memoize tower image getter
  const getTowerImage = useCallback((tower) => {
    const defenseCount = towerDefenseCounts[tower.id] || 0;
    return getTowerImagePath(tower, defenseCount);
  }, [towerDefenseCounts]);

  // Memoize selected tower display name
  const selectedTowerName = useMemo(() => {
    return getTowerDisplayName(selectedTower);
  }, [selectedTower]);

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <h3>Carte de Guerre</h3>
        <div className={styles.mapLegend}>
          {LEGEND_ITEMS.map(({ color, image, label }) => (
            <span key={color} className={styles.legendItem}>
              <img src={image} alt={label} className={styles.legendIcon} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.battlefield} onClick={handleBattlefieldClick}>
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
            style={{ left: `${tower.x}%`, top: `${tower.y}%` }}
            onClick={(e) => {
              e.stopPropagation();
              handleTowerClick(tower);
            }}
            title={tower.type === 'headquarters' ? 'QG' : `Tour ${tower.id}`}
          >
            {tower.type === 'tower' && tower.color && (
              <img
                src={getTowerImage(tower)}
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
          <h4>{selectedTowerName}</h4>
          <p className={styles.towerInfo}>
            Cliquez pour assigner des défenses à cette position
          </p>
        </div>
      )}

      <TowerDefenseModal
        isOpen={!!modalTower}
        onClose={handleCloseModal}
        tower={modalTower}
        guild={guild}
        user={user}
        onToast={onToast}
        onDefenseUpdate={fetchTowerDefenses}
      />
    </div>
  );
}

export default GuildWarMap;
