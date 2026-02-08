import { useEffect, useState } from 'react';
import api from '../services/api';
import styles from './SiegeManagement.module.css';

function SiegeManagement({ guildId, onToast }) {
  const [availabilities, setAvailabilities] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMonday, setSelectedMonday] = useState(new Set());
  const [selectedThursday, setSelectedThursday] = useState(new Set());

  useEffect(() => {
    fetchAvailabilities();
  }, [guildId]);

  const fetchAvailabilities = async () => {
    try {
      const response = await api.get(`/sieges/guild/${guildId}/weekly-availabilities`);
      setAvailabilities(response.data.availabilities);
      setWeekStartDate(response.data.weekStartDate);

      // Initialize selected sets
      const monday = new Set();
      const thursday = new Set();
      response.data.availabilities.forEach(a => {
        if (a.mondaySelected) monday.add(a.userId);
        if (a.thursdaySelected) thursday.add(a.userId);
      });
      setSelectedMonday(monday);
      setSelectedThursday(thursday);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
      onToast?.('Erreur lors du chargement des disponibilités', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (userId, day) => {
    if (day === 'monday') {
      const newSet = new Set(selectedMonday);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        if (newSet.size >= 25) {
          onToast?.('Maximum 25 participants par siège', 'error');
          return;
        }
        newSet.add(userId);
      }
      setSelectedMonday(newSet);
    } else {
      const newSet = new Set(selectedThursday);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        if (newSet.size >= 25) {
          onToast?.('Maximum 25 participants par siège', 'error');
          return;
        }
        newSet.add(userId);
      }
      setSelectedThursday(newSet);
    }
  };

  const saveSelections = async () => {
    try {
      // Update all availabilities
      await Promise.all(
        availabilities.filter(a => a.id).map(async (a) => {
          const mondaySelected = selectedMonday.has(a.userId);
          const thursdaySelected = selectedThursday.has(a.userId);

          // Only update if changed
          if (mondaySelected !== a.mondaySelected || thursdaySelected !== a.thursdaySelected) {
            await api.patch(`/sieges/weekly-availabilities/${a.id}/select`, {
              mondaySelected,
              thursdaySelected
            });
          }
        })
      );

      onToast?.('Sélections enregistrées', 'success');
      await fetchAvailabilities();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      onToast?.('Erreur lors de la sauvegarde', 'error');
    }
  };

  const formatWeekRange = (dateString) => {
    if (!dateString) return '';
    const saturday = new Date(dateString);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);

    const formatDate = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${formatDate(saturday)} - ${formatDate(friday)}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h2>📋 Gestion des Inscriptions au Siège</h2>
        <p className={styles.loading}>Chargement...</p>
      </div>
    );
  }

  const availableMonday = availabilities.filter(a => a.mondayAvailable === true);
  const availableThursday = availabilities.filter(a => a.thursdayAvailable === true);
  const unavailableMonday = availabilities.filter(a => a.mondayAvailable === false);
  const unavailableThursday = availabilities.filter(a => a.thursdayAvailable === false);
  const noResponseMonday = availabilities.filter(a => a.mondayAvailable === null);
  const noResponseThursday = availabilities.filter(a => a.thursdayAvailable === null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>📋 Gestion des Inscriptions au Siège</h2>
          <p className={styles.weekRange}>Semaine : {formatWeekRange(weekStartDate)}</p>
        </div>
        <button onClick={saveSelections} className={styles.btnSave}>
          💾 Enregistrer la sélection
        </button>
      </div>

      <div className={styles.siegeGrid}>
        {/* Monday */}
        <div className={styles.siegeCard}>
          <h3>🗡️ Lundi</h3>
          <div className={styles.stats}>
            <span className={styles.statBadge}>
              {selectedMonday.size}/25 sélectionnés
            </span>
            <span className={styles.statBadge}>
              {availableMonday.length} disponibles
            </span>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>✅ Disponibles ({availableMonday.length})</h4>
            <div className={styles.membersList}>
              {availableMonday.map(a => (
                <div key={a.userId} className={styles.memberItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedMonday.has(a.userId)}
                      onChange={() => toggleSelection(a.userId, 'monday')}
                      className={styles.checkbox}
                    />
                    <span className={styles.memberName}>
                      {a.user?.username || a.user?.name || 'Membre'}
                    </span>
                  </label>
                </div>
              ))}
              {availableMonday.length === 0 && (
                <p className={styles.emptyMessage}>Aucun membre disponible</p>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>❌ Indisponibles ({unavailableMonday.length})</h4>
            <div className={styles.membersList}>
              {unavailableMonday.map(a => (
                <div key={a.userId} className={styles.memberItem}>
                  <span className={styles.memberName}>
                    {a.user?.username || a.user?.name || 'Membre'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>⏳ Pas de réponse ({noResponseMonday.length})</h4>
            <div className={styles.membersList}>
              {noResponseMonday.map(a => (
                <div key={a.userId} className={styles.memberItem}>
                  <span className={styles.memberName}>
                    {a.user?.username || a.user?.name || 'Membre'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Thursday */}
        <div className={styles.siegeCard}>
          <h3>🗡️ Jeudi</h3>
          <div className={styles.stats}>
            <span className={styles.statBadge}>
              {selectedThursday.size}/25 sélectionnés
            </span>
            <span className={styles.statBadge}>
              {availableThursday.length} disponibles
            </span>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>✅ Disponibles ({availableThursday.length})</h4>
            <div className={styles.membersList}>
              {availableThursday.map(a => (
                <div key={a.userId} className={styles.memberItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedThursday.has(a.userId)}
                      onChange={() => toggleSelection(a.userId, 'thursday')}
                      className={styles.checkbox}
                    />
                    <span className={styles.memberName}>
                      {a.user?.username || a.user?.name || 'Membre'}
                    </span>
                  </label>
                </div>
              ))}
              {availableThursday.length === 0 && (
                <p className={styles.emptyMessage}>Aucun membre disponible</p>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>❌ Indisponibles ({unavailableThursday.length})</h4>
            <div className={styles.membersList}>
              {unavailableThursday.map(a => (
                <div key={a.userId} className={styles.memberItem}>
                  <span className={styles.memberName}>
                    {a.user?.username || a.user?.name || 'Membre'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>⏳ Pas de réponse ({noResponseThursday.length})</h4>
            <div className={styles.membersList}>
              {noResponseThursday.map(a => (
                <div key={a.userId} className={styles.memberItem}>
                  <span className={styles.memberName}>
                    {a.user?.username || a.user?.name || 'Membre'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SiegeManagement;
