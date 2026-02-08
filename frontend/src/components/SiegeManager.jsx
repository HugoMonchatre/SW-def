import { useState, useEffect } from 'react';
import { ConfirmDialog } from './Modal';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import styles from './SiegeManager.module.css';

function SiegeManager({ guildId, guild, user, onToast }) {
  const [siege, setSiege] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' });

  const { canManage } = usePermissions(guild, user);

  useEffect(() => {
    if (guildId) fetchActiveSiege();
  }, [guildId]);

  const fetchActiveSiege = async () => {
    try {
      const response = await api.get(`/sieges/guild/${guildId}/active`);
      const data = response.data.siege;
      setSiege(data);
      if (data?.registrations) {
        setRegistrations(data.registrations);
        setSelectedIds(new Set(data.registrations.filter(r => r.selected).map(r => r.user.id)));
      } else {
        setRegistrations([]);
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Error fetching siege:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSiege = async () => {
    try {
      await api.post(`/sieges/guild/${guildId}`);
      onToast('Inscriptions au siège ouvertes !', 'success');
      fetchActiveSiege();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur', 'error');
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.patch(`/sieges/${siege.id}/status`, { status: newStatus });
      onToast(newStatus === 'closed' ? 'Inscriptions fermées' : 'Siège archivé', 'success');
      if (newStatus === 'archived') {
        setSiege(null);
        setRegistrations([]);
        setSelectedIds(new Set());
      } else {
        fetchActiveSiege();
      }
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur', 'error');
    }
  };

  const register = async (status) => {
    try {
      await api.post(`/sieges/${siege.id}/register`, { status });
      onToast(status === 'available' ? 'Inscrit comme disponible' : 'Marqué indisponible', 'success');
      fetchActiveSiege();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur', 'error');
    }
  };

  const removeRegistration = async () => {
    try {
      await api.delete(`/sieges/${siege.id}/register`);
      onToast('Inscription retirée', 'success');
      fetchActiveSiege();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur', 'error');
    }
  };

  const toggleSelect = (userId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (next.size >= 25) {
          onToast('Maximum 25 participants', 'error');
          return prev;
        }
        next.add(userId);
      }
      return next;
    });
  };

  const saveSelection = async () => {
    try {
      await api.put(`/sieges/${siege.id}/select`, { selectedUserIds: Array.from(selectedIds) });
      onToast('Sélection sauvegardée', 'success');
      fetchActiveSiege();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur', 'error');
    }
  };

  const deleteSiege = async () => {
    try {
      await api.delete(`/sieges/${siege.id}`);
      onToast('Siège supprimé', 'success');
      setSiege(null);
      setRegistrations([]);
      setSelectedIds(new Set());
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur', 'error');
    }
  };

  const showConfirm = (title, message, onConfirm, variant = 'danger') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
  };

  // Get all guild members for the list
  const allMembers = guild?.members || [];
  const myRegistration = registrations.find(r => r.user?.id === user?.id || r.userId === user?.id);

  const availableCount = registrations.filter(r => r.status === 'available').length;
  const unavailableCount = registrations.filter(r => r.status === 'unavailable').length;
  const selectedCount = selectedIds.size;

  if (loading) {
    return (
      <div className={styles.siegeManager}>
        <div className={styles.header}>
          <h3>Siège</h3>
        </div>
        <p className={styles.loading}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className={styles.siegeManager}>
      <div className={styles.header}>
        <h3>Siège</h3>
        {canManage && siege && (
          <div className={styles.headerActions}>
            {siege.status === 'open' && (
              <button
                className={styles.btnWarning}
                onClick={() => showConfirm(
                  'Fermer les inscriptions',
                  'Voulez-vous fermer les inscriptions au siège ?',
                  () => updateStatus('closed'),
                  'info'
                )}
              >
                Fermer les inscriptions
              </button>
            )}
            {siege.status === 'closed' && (
              <button
                className={styles.btnSecondary}
                onClick={() => showConfirm(
                  'Archiver le siège',
                  'Voulez-vous archiver ce siège ? Vous pourrez en créer un nouveau ensuite.',
                  () => updateStatus('archived'),
                  'info'
                )}
              >
                Archiver
              </button>
            )}
            <button
              className={styles.btnDanger}
              onClick={() => showConfirm(
                'Supprimer le siège',
                'Voulez-vous supprimer ce siège et toutes les inscriptions ?',
                deleteSiege,
                'danger'
              )}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* No active siege */}
      {!siege && (
        <div className={styles.emptyState}>
          <p>Aucun siège en cours.</p>
          {canManage && (
            <button className={styles.btnCreate} onClick={createSiege}>
              Ouvrir les inscriptions
            </button>
          )}
        </div>
      )}

      {/* Active siege */}
      {siege && (
        <>
          {/* Status badge */}
          <div className={styles.statusBar}>
            <span className={`${styles.statusBadge} ${styles[siege.status]}`}>
              {siege.status === 'open' ? 'Inscriptions ouvertes' : 'Inscriptions fermées'}
            </span>
            <div className={styles.statsRow}>
              <span className={styles.statItem}>
                <span className={styles.statValue}>{availableCount}</span> disponible{availableCount > 1 ? 's' : ''}
              </span>
              <span className={styles.statItem}>
                <span className={styles.statValueWarn}>{unavailableCount}</span> indisponible{unavailableCount > 1 ? 's' : ''}
              </span>
              {canManage && (
                <span className={styles.statItem}>
                  <span className={styles.statValueSelected}>{selectedCount}</span>/25 sélectionné{selectedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Member registration buttons */}
          {siege.status === 'open' && (
            <div className={styles.registerSection}>
              <p className={styles.registerLabel}>Votre disponibilité :</p>
              <div className={styles.registerButtons}>
                <button
                  className={`${styles.btnAvailable} ${myRegistration?.status === 'available' ? styles.active : ''}`}
                  onClick={() => register('available')}
                >
                  Disponible
                </button>
                <button
                  className={`${styles.btnUnavailable} ${myRegistration?.status === 'unavailable' ? styles.active : ''}`}
                  onClick={() => register('unavailable')}
                >
                  Indisponible
                </button>
                {myRegistration && (
                  <button className={styles.btnRemoveReg} onClick={removeRegistration}>
                    Retirer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Members list */}
          <div className={styles.membersList}>
            <h4>Membres ({allMembers.length})</h4>
            {canManage && registrations.some(r => r.status === 'available') && (
              <div className={styles.selectionActions}>
                <button className={styles.btnSave} onClick={saveSelection}>
                  Sauvegarder la sélection ({selectedCount}/25)
                </button>
              </div>
            )}
            <div className={styles.membersGrid}>
              {allMembers.map(member => {
                const reg = registrations.find(r => r.user?.id === member.id);
                const isSelected = selectedIds.has(member.id);

                return (
                  <div
                    key={member.id}
                    className={`${styles.memberRow} ${reg ? styles[reg.status] : styles.notRegistered} ${isSelected ? styles.selected : ''}`}
                    onClick={canManage && reg?.status === 'available' ? () => toggleSelect(member.id) : undefined}
                  >
                    <div className={styles.memberInfo}>
                      <div className={styles.memberAvatar}>
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} />
                        ) : (
                          <span>{(member.username || member.name)?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className={styles.memberName}>{member.username || member.name}</span>
                    </div>
                    <div className={styles.memberStatus}>
                      {!reg && <span className={styles.tagNotRegistered}>-</span>}
                      {reg?.status === 'available' && <span className={styles.tagAvailable}>Dispo</span>}
                      {reg?.status === 'unavailable' && <span className={styles.tagUnavailable}>Indispo</span>}
                      {isSelected && <span className={styles.tagSelected}>Sélectionné</span>}
                      {canManage && reg?.status === 'available' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(member.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={styles.selectCheckbox}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
}

export default SiegeManager;
