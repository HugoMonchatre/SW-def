import { useEffect, useState } from 'react';
import api from '../services/api';
import styles from './RuneEfficiency.module.css';

const RUNE_SETS = [
  { id: 1, name: 'Energy', pieces: 2, color: '#22c55e' },
  { id: 2, name: 'Guard', pieces: 2, color: '#64748b' },
  { id: 3, name: 'Swift', pieces: 4, color: '#3b82f6' },
  { id: 4, name: 'Blade', pieces: 2, color: '#ef4444' },
  { id: 5, name: 'Rage', pieces: 4, color: '#f97316' },
  { id: 6, name: 'Focus', pieces: 2, color: '#8b5cf6' },
  { id: 7, name: 'Endure', pieces: 2, color: '#14b8a6' },
  { id: 8, name: 'Fatal', pieces: 4, color: '#dc2626' },
  { id: 10, name: 'Despair', pieces: 4, color: '#a855f7' },
  { id: 11, name: 'Vampire', pieces: 4, color: '#be123c' },
  { id: 13, name: 'Violent', pieces: 4, color: '#7c3aed' },
  { id: 14, name: 'Nemesis', pieces: 2, color: '#f59e0b' },
  { id: 15, name: 'Will', pieces: 2, color: '#eab308' },
  { id: 16, name: 'Shield', pieces: 2, color: '#0ea5e9' },
  { id: 17, name: 'Revenge', pieces: 2, color: '#e11d48' },
  { id: 18, name: 'Destroy', pieces: 2, color: '#78716c' },
  { id: 19, name: 'Fight', pieces: 2, color: '#ef4444' },
  { id: 20, name: 'Determination', pieces: 2, color: '#2563eb' },
  { id: 21, name: 'Enhance', pieces: 2, color: '#16a34a' },
  { id: 22, name: 'Accuracy', pieces: 2, color: '#9333ea' },
  { id: 23, name: 'Tolerance', pieces: 2, color: '#0d9488' },
];

function RuneEfficiency({ guildId }) {
  const [loading, setLoading] = useState(true);
  const [setEfficiencies, setSetEfficiencies] = useState([]);

  useEffect(() => {
    fetchRuneEfficiency();
  }, [guildId]);

  const fetchRuneEfficiency = async () => {
    try {
      const response = await api.get(`/guilds/${guildId}/rune-efficiency`);
      setSetEfficiencies(response.data.efficiencies);
    } catch (error) {
      console.error('Erreur lors du chargement des efficacités:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h2>💎 Efficacité des Runes</h2>
        <p className={styles.loading}>Chargement...</p>
      </div>
    );
  }

  if (setEfficiencies.length === 0) {
    return (
      <div className={styles.container}>
        <h2>💎 Efficacité des Runes</h2>
        <p className={styles.noData}>Aucune donnée disponible. Les membres doivent importer leurs données SW.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>💎 Efficacité des Runes</h2>
        <p className={styles.subtitle}>Efficacité moyenne par set de runes pour la guilde</p>
      </div>

      <div className={styles.setsGrid}>
        {setEfficiencies.map(set => (
          <div key={set.setId} className={styles.setCard}>
            <div className={styles.setHeader}>
              <span className={styles.setName}>{set.name}</span>
              <span className={styles.setEfficiency} style={{ color: set.color }}>
                {set.avgEfficiency.toFixed(1)}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min(set.avgEfficiency, 100)}%`,
                  background: set.color
                }}
              />
            </div>
            <div className={styles.setDetails}>
              <span className={styles.runeCount}>{set.totalRunes} runes</span>
              <span className={styles.memberCount}>{set.memberCount} membres</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RuneEfficiency;
