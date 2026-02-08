import { useEffect, useState } from 'react';
import api from '../services/api';
import styles from './WeeklySiegeWidget.module.css';

function WeeklySiegeWidget() {
  const [availability, setAvailability] = useState(null);
  const [dates, setDates] = useState({ mondayDate: null, thursdayDate: null });
  const [canAnswer, setCanAnswer] = useState({ monday: true, thursday: true });
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await api.get('/sieges/my-weekly-availability');
      // Only keep current week
      setAvailability(response.data.currentWeek);
      setDates({
        mondayDate: response.data.mondayDate,
        thursdayDate: response.data.thursdayDate
      });
      setCanAnswer({
        monday: response.data.canAnswerMonday,
        thursday: response.data.canAnswerThursday
      });
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = async (day, value) => {
    try {
      const payload = {
        weekStartDate: availability.weekStartDate,
        mondayAvailable: day === 'monday' ? value : availability.mondayAvailable ?? null,
        thursdayAvailable: day === 'thursday' ? value : availability.thursdayAvailable ?? null
      };

      await api.post('/sieges/weekly-availability', payload);
      await fetchAvailability();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const formatWeekRange = (weekStartDate) => {
    const saturday = new Date(weekStartDate);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);

    const formatDate = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${formatDate(saturday)} - ${formatDate(friday)}`;
  };

  const formatSiegeDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  if (loading) {
    return (
      <div className={styles.widget}>
        <h3>Disponibilité Siège</h3>
        <p className={styles.loading}>Chargement...</p>
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  const { weekStartDate, mondayAvailable, thursdayAvailable, mondaySelected, thursdaySelected } = availability;

  // Hide widget if both answers are provided
  if (mondayAvailable !== null && thursdayAvailable !== null) {
    return null;
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header} onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>📅 Disponibilité Siège</h3>
        <span className={`${styles.arrow} ${isCollapsed ? styles.arrowCollapsed : ''}`}>▼</span>
      </div>
      {!isCollapsed && (
        <div className={styles.weekSection}>
          <h4>Cette semaine</h4>
          <p className={styles.weekRange}>{formatWeekRange(weekStartDate)}</p>

        <div className={styles.daysGrid}>
          {/* Monday */}
          <div className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <div className={styles.dayInfo}>
                <span className={styles.dayName}>🗡️ {formatSiegeDate(dates.mondayDate)}</span>
                {mondaySelected && <span className={styles.selectedBadge}>Sélectionné</span>}
              </div>
            </div>
            {!canAnswer.monday ? (
              <p className={styles.deadlinePassed}>Délai dépassé (dimanche 12h)</p>
            ) : (
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => handleAvailabilityChange('monday', true)}
                  className={`${styles.btn} ${mondayAvailable === true ? styles.btnAvailable : ''}`}
                >
                  ✓ Disponible
                </button>
                <button
                  onClick={() => handleAvailabilityChange('monday', false)}
                  className={`${styles.btn} ${mondayAvailable === false ? styles.btnUnavailable : ''}`}
                >
                  ✗ Indisponible
                </button>
              </div>
            )}
          </div>

          {/* Thursday */}
          <div className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <div className={styles.dayInfo}>
                <span className={styles.dayName}>🗡️ {formatSiegeDate(dates.thursdayDate)}</span>
                {thursdaySelected && <span className={styles.selectedBadge}>Sélectionné</span>}
              </div>
            </div>
            {!canAnswer.thursday ? (
              <p className={styles.deadlinePassed}>Délai dépassé (mercredi 12h)</p>
            ) : (
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => handleAvailabilityChange('thursday', true)}
                  className={`${styles.btn} ${thursdayAvailable === true ? styles.btnAvailable : ''}`}
                >
                  ✓ Disponible
                </button>
                <button
                  onClick={() => handleAvailabilityChange('thursday', false)}
                  className={`${styles.btn} ${thursdayAvailable === false ? styles.btnUnavailable : ''}`}
                >
                  ✗ Indisponible
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

export default WeeklySiegeWidget;
