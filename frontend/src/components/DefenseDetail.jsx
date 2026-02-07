import { useState, useEffect } from 'react';
import { Modal, ConfirmDialog } from './Modal';
import api from '../services/api';
import { useMonsterSearch } from '../hooks/useMonsterSearch';
import { usePermissions } from '../hooks/usePermissions';
import { getElementColor, formatLeaderSkill } from '../utils/monsters';
import styles from './DefenseDetail.module.css';

function DefenseDetail({ defense, guild, user, onClose, onToast, onOffenseUpdate }) {
  const [offenses, setOffenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableOffenses, setAvailableOffenses] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [editingOffense, setEditingOffense] = useState(null);
  const [offenseName, setOffenseName] = useState('');
  const [selectedMonsters, setSelectedMonsters] = useState([
    { monster: null, instructions: '' },
    { monster: null, instructions: '' },
    { monster: null, instructions: '' }
  ]);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    offenseId: null,
    offenseName: '',
    action: 'delete'
  });
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  const { canManageItem: canManageOffense } = usePermissions(guild, user);

  const {
    monsterSearch, setMonsterSearch,
    searchResults, searchLoading,
    activeSlot, setActiveSlot,
    clearSearch,
  } = useMonsterSearch({ endpoint: '/offenses/monsters/search' });

  useEffect(() => {
    if (defense?.id) {
      fetchOffenses();
    }
  }, [defense]);

  const fetchOffenses = async () => {
    try {
      const response = await api.get(`/offenses/defense/${defense.id}`);
      setOffenses(response.data.offenses);
    } catch (error) {
      console.error('Error fetching offenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOffenses = async () => {
    setLoadingAvailable(true);
    try {
      const response = await api.get(`/offenses/guild/${guild.id}`, {
        params: { excludeDefenseId: defense.id }
      });
      setAvailableOffenses(response.data.offenses);
    } catch (error) {
      console.error('Error fetching available offenses:', error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const linkOffense = async (offenseId) => {
    try {
      await api.post(`/offenses/${offenseId}/link`, { defenseId: defense.id });
      onToast('Offense liée avec succès !', 'success');
      setShowLinkModal(false);
      fetchOffenses();
      onOffenseUpdate?.();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la liaison', 'error');
    }
  };

  const unlinkOffense = async (offenseId) => {
    try {
      await api.post(`/offenses/${offenseId}/unlink`, { defenseId: defense.id });
      onToast('Offense retirée de cette défense', 'success');
      setConfirmDialog({ isOpen: false, offenseId: null, offenseName: '', action: 'delete' });
      fetchOffenses();
      onOffenseUpdate?.();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors du retrait', 'error');
    }
  };

  const openLinkModal = () => {
    fetchAvailableOffenses();
    setShowLinkModal(true);
  };

  const selectMonster = (monster) => {
    if (activeSlot === null) return;

    const newMonsters = [...selectedMonsters];
    newMonsters[activeSlot] = {
      ...newMonsters[activeSlot],
      monster: {
        com2us_id: monster.com2us_id,
        name: monster.name,
        image: monster.image,
        element: monster.element,
        natural_stars: monster.natural_stars,
        leader_skill: monster.leader_skill || null
      }
    };
    setSelectedMonsters(newMonsters);

    // Auto-generate offense name
    const monsterNames = newMonsters
      .filter(m => m.monster !== null)
      .map(m => m.monster.name)
      .join('-');
    if (monsterNames) {
      setOffenseName(monsterNames);
    }

    clearSearch();
  };

  const removeMonster = (slot) => {
    const newMonsters = [...selectedMonsters];
    newMonsters[slot] = { monster: null, instructions: '' };
    setSelectedMonsters(newMonsters);

    const monsterNames = newMonsters
      .filter(m => m.monster !== null)
      .map(m => m.monster.name)
      .join('-');
    setOffenseName(monsterNames);
  };

  const updateMonsterInstructions = (slot, instructions) => {
    const newMonsters = [...selectedMonsters];
    newMonsters[slot] = { ...newMonsters[slot], instructions };
    setSelectedMonsters(newMonsters);
  };

  const openCreateModal = () => {
    setOffenseName('');
    setSelectedMonsters([
      { monster: null, instructions: '' },
      { monster: null, instructions: '' },
      { monster: null, instructions: '' }
    ]);
    setGeneralInstructions('');
    setEditingOffense(null);
    setShowCreateModal(true);
  };

  const openEditModal = (offense) => {
    setOffenseName(offense.name);
    setSelectedMonsters(offense.monsters.map(m => ({
      monster: {
        com2us_id: m.com2us_id,
        name: m.name,
        image: m.image,
        element: m.element,
        natural_stars: m.natural_stars,
        leader_skill: m.leader_skill
      },
      instructions: m.instructions || ''
    })));
    setGeneralInstructions(offense.generalInstructions || '');
    setEditingOffense(offense);
    setShowCreateModal(true);
  };

  const saveOffense = async () => {
    if (!offenseName.trim()) {
      onToast('Veuillez entrer un nom pour l\'offense', 'error');
      return;
    }

    if (selectedMonsters.some(m => m.monster === null)) {
      onToast('Veuillez sélectionner 3 monstres', 'error');
      return;
    }

    try {
      const monsters = selectedMonsters.map(m => ({
        ...m.monster,
        instructions: m.instructions
      }));

      if (editingOffense) {
        await api.patch(`/offenses/${editingOffense.id}`, {
          name: offenseName,
          monsters,
          generalInstructions
        });
        onToast('Offense mise à jour avec succès !', 'success');
      } else {
        await api.post('/offenses', {
          name: offenseName,
          defenseId: defense.id,
          monsters,
          generalInstructions
        });
        onToast('Offense créée avec succès !', 'success');
      }

      setShowCreateModal(false);
      fetchOffenses();
      onOffenseUpdate?.();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const confirmDeleteOffense = (offense) => {
    const isLinkedToMultiple = offense.defenses && offense.defenses.length > 1;
    setConfirmDialog({
      isOpen: true,
      offenseId: offense.id,
      offenseName: offense.name,
      action: isLinkedToMultiple ? 'unlink' : 'delete',
      linkedCount: offense.defenses?.length || 1
    });
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.action === 'unlink') {
      await unlinkOffense(confirmDialog.offenseId);
    } else {
      await deleteOffense();
    }
  };

  const deleteOffense = async () => {
    try {
      await api.delete(`/offenses/${confirmDialog.offenseId}`);
      onToast('Offense supprimée avec succès !', 'success');
      setConfirmDialog({ isOpen: false, offenseId: null, offenseName: '', action: 'delete' });
      fetchOffenses();
      onOffenseUpdate?.();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
  };

  const voteOffense = async (offenseId, voteType) => {
    try {
      await api.post(`/offenses/${offenseId}/vote`, { voteType });
      fetchOffenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors du vote', 'error');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>

        {/* Defense Display */}
        <div className={styles.defenseSection}>
          <h2>Défense: {defense.name}</h2>
          <div className={styles.defenseMonsters}>
            {defense.monsters[0]?.leader_skill && (
              <div className={styles.leaderSkillBadge}>
                <span className={styles.leaderIcon}>L</span>
                {formatLeaderSkill(defense.monsters[0].leader_skill)}
              </div>
            )}
            {defense.monsters.map((monster, idx) => (
              <div key={idx} className={styles.monsterDisplay}>
                <div
                  className={`${styles.monsterImage} ${idx === 0 && monster.leader_skill ? styles.hasLeader : ''}`}
                  style={{ borderColor: getElementColor(monster.element) }}
                >
                  <img src={monster.image} alt={monster.name} />
                  {idx === 0 && monster.leader_skill && (
                    <div className={styles.leaderBadge}>L</div>
                  )}
                </div>
                <div className={styles.monsterName}>{monster.name}</div>
                <div className={styles.monsterStars}>
                  {'★'.repeat(monster.natural_stars)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offenses Section */}
        <div className={styles.offensesSection}>
          <div className={styles.offensesHeader}>
            <h3>Offenses proposées ({offenses.length})</h3>
            <div className={styles.headerActions}>
              <button className={styles.btnLink} onClick={openLinkModal}>
                Lier une offense existante
              </button>
              <button className={styles.btnCreate} onClick={openCreateModal}>
                + Proposer une Offense
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Chargement des offenses...</div>
          ) : offenses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Aucune offense proposée pour cette défense.</p>
              <p className={styles.hint}>Soyez le premier à proposer une stratégie !</p>
            </div>
          ) : (
            <div className={styles.offensesList}>
              {offenses.map(offense => {
                const upVotes = typeof offense.votes?.up === 'number' ? offense.votes.up : 0;
                const downVotes = typeof offense.votes?.down === 'number' ? offense.votes.down : 0;

                return (
                  <div key={offense.id} className={styles.offenseCard}>
                    <div className={styles.offenseHeader}>
                      <h4>{offense.name}</h4>
                      <div className={styles.voteSection}>
                        <div className={styles.voteGroup}>
                          <button
                            className={`${styles.voteBtnSmall} ${styles.decrementUp}`}
                            onClick={() => voteOffense(offense.id, 'decrement_up')}
                            title="Retirer un succes"
                            disabled={upVotes === 0}
                          >
                            -
                          </button>
                          <button
                            className={`${styles.voteBtn} ${styles.upvote}`}
                            onClick={() => voteOffense(offense.id, 'up')}
                            title="Ca a marche !"
                          >
                            <span className={styles.voteIcon}>✓</span>
                            <span className={styles.voteCount}>{upVotes}</span>
                          </button>
                        </div>
                        <div className={styles.voteGroup}>
                          <button
                            className={`${styles.voteBtn} ${styles.downvote}`}
                            onClick={() => voteOffense(offense.id, 'down')}
                            title="Ca n'a pas marche"
                          >
                            <span className={styles.voteIcon}>✗</span>
                            <span className={styles.voteCount}>{downVotes}</span>
                          </button>
                          <button
                            className={`${styles.voteBtnSmall} ${styles.decrementDown}`}
                            onClick={() => voteOffense(offense.id, 'decrement_down')}
                            title="Retirer un echec"
                            disabled={downVotes === 0}
                          >
                            -
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.offenseMonstersWrapper}>
                      {offense.monsters[0]?.leader_skill && (
                        <div className={styles.offenseLeaderSkillBadge}>
                          <span className={styles.leaderIcon}>L</span>
                          {formatLeaderSkill(offense.monsters[0].leader_skill)}
                        </div>
                      )}
                      <div className={styles.offenseMonsters}>
                        {offense.monsters.map((monster, idx) => (
                          <div key={idx} className={styles.offenseMonster}>
                            <div
                              className={`${styles.offenseMonsterImage} ${idx === 0 && monster.leader_skill ? styles.hasLeader : ''}`}
                              style={{ borderColor: getElementColor(monster.element) }}
                            >
                              <img src={monster.image} alt={monster.name} />
                              {idx === 0 && monster.leader_skill && (
                                <div className={styles.leaderBadge}>L</div>
                              )}
                            </div>
                            <div className={styles.offenseMonsterInfo}>
                              <span className={styles.offenseMonsterName}>{monster.name}</span>
                              <span className={styles.offenseMonsterStars}>
                                {'★'.repeat(monster.natural_stars)}
                              </span>
                              {monster.instructions && (
                                <div className={styles.monsterInstructions}>
                                  {monster.instructions}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {offense.generalInstructions && (
                      <div className={styles.generalInstructions}>
                        <strong>Instructions générales:</strong>
                        <p>{offense.generalInstructions}</p>
                      </div>
                    )}

                    <div className={styles.offenseFooter}>
                      <div className={styles.offenseInfo}>
                        <span>Proposé par {offense.createdBy?.name || 'Inconnu'}</span>
                        {offense.defenses && offense.defenses.length > 1 && (
                          <span className={styles.linkedBadge} title={`Liée à ${offense.defenses.length} défenses`}>
                            Utilisée sur {offense.defenses.length} défenses
                          </span>
                        )}
                      </div>
                      {canManageOffense(offense) && (
                        <div className={styles.offenseActions}>
                          <button
                            className={styles.btnEdit}
                            onClick={() => openEditModal(offense)}
                          >
                            Modifier
                          </button>
                          <button
                            className={styles.btnDelete}
                            onClick={() => confirmDeleteOffense(offense)}
                          >
                            {offense.defenses && offense.defenses.length > 1 ? 'Retirer' : 'Supprimer'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, offenseId: null, offenseName: '', action: 'delete' })}
          onConfirm={handleConfirmAction}
          title={confirmDialog.action === 'unlink' ? "Retirer l'offense" : "Supprimer l'offense"}
          message={
            confirmDialog.action === 'unlink'
              ? `L'offense "${confirmDialog.offenseName}" est liée à ${confirmDialog.linkedCount} défenses. Voulez-vous la retirer de cette défense ? Elle restera disponible sur les autres défenses.`
              : `Êtes-vous sûr de vouloir supprimer l'offense "${confirmDialog.offenseName}" ? Cette action est irréversible.`
          }
        />

        {/* Create/Edit Offense Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={editingOffense ? 'Modifier l\'Offense' : 'Proposer une Offense'}
        >
          <div className={styles.createForm}>
            <div className={styles.formGroup}>
              <label>Nom de l'offense</label>
              <input
                type="text"
                value={offenseName}
                onChange={(e) => setOffenseName(e.target.value)}
                placeholder="Ex: Lushen Cleave"
              />
            </div>

            <div className={styles.monsterSlots}>
              <label>Sélectionnez 3 monstres</label>
              <div className={styles.slots}>
                {selectedMonsters.map((slot, idx) => (
                  <div key={idx} className={styles.slotContainer}>
                    <div
                      className={`${styles.slot} ${activeSlot === idx ? styles.active : ''} ${slot.monster ? styles.filled : ''}`}
                      onClick={() => !slot.monster && setActiveSlot(idx)}
                    >
                      {slot.monster ? (
                        <>
                          <img src={slot.monster.image} alt={slot.monster.name} />
                          <button
                            className={styles.removeBtn}
                            onClick={(e) => { e.stopPropagation(); removeMonster(idx); }}
                          >
                            ×
                          </button>
                          <div className={styles.slotName}>{slot.monster.name}</div>
                          {slot.monster.leader_skill && (
                            <div className={styles.slotLeader}>L</div>
                          )}
                        </>
                      ) : (
                        <span className={styles.slotPlaceholder}>
                          {activeSlot === idx ? 'Recherchez...' : `Slot ${idx + 1}`}
                        </span>
                      )}
                    </div>
                    {slot.monster && (
                      <textarea
                        className={styles.monsterInstructionsInput}
                        value={slot.instructions}
                        onChange={(e) => updateMonsterInstructions(idx, e.target.value)}
                        placeholder="Instructions pour ce monstre..."
                        rows={2}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {activeSlot !== null && (
              <div className={styles.searchSection}>
                <input
                  type="text"
                  value={monsterSearch}
                  onChange={(e) => setMonsterSearch(e.target.value)}
                  placeholder="Rechercher un monstre..."
                  className={styles.searchInput}
                  autoFocus
                />

                {searchLoading && <div className={styles.searchLoading}>Recherche...</div>}

                {searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map(monster => (
                      <div
                        key={monster.com2us_id}
                        className={styles.searchResult}
                        onClick={() => selectMonster(monster)}
                      >
                        <img
                          src={monster.image}
                          alt={monster.name}
                          className={styles.resultImage}
                        />
                        <div className={styles.resultInfo}>
                          <span className={styles.resultName}>{monster.name}</span>
                          <span className={styles.resultMeta}>
                            {monster.element} {'★'.repeat(monster.natural_stars)}
                            {monster.leader_skill && ' (Leader)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Instructions générales</label>
              <textarea
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                placeholder="Expliquez la stratégie globale, l'ordre des tours, les cibles prioritaires..."
                rows={4}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowCreateModal(false)}
              >
                Annuler
              </button>
              <button
                className={styles.btnPrimary}
                onClick={saveOffense}
                disabled={!offenseName.trim() || selectedMonsters.some(m => m.monster === null)}
              >
                {editingOffense ? 'Mettre à jour' : 'Proposer'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Link Existing Offense Modal */}
        <Modal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            setLinkSearchQuery('');
          }}
          title="Lier une offense existante"
        >
          <div className={styles.linkModalContent}>
            {loadingAvailable ? (
              <div className={styles.loading}>Chargement des offenses...</div>
            ) : availableOffenses.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Aucune offense disponible à lier.</p>
                <p className={styles.hint}>Toutes les offenses de la guilde sont déjà liées à cette défense ou il n'y en a pas encore.</p>
              </div>
            ) : (
              <>
                <div className={styles.linkSearchBar}>
                  <input
                    type="text"
                    value={linkSearchQuery}
                    onChange={(e) => setLinkSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom d'offense ou de monstre..."
                    className={styles.searchInput}
                  />
                  {linkSearchQuery && (
                    <button
                      className={styles.clearSearch}
                      onClick={() => setLinkSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className={styles.availableOffensesList}>
                  {availableOffenses
                    .filter(offense => {
                      if (!linkSearchQuery.trim()) return true;
                      const query = linkSearchQuery.toLowerCase();

                      if (offense.name.toLowerCase().includes(query)) return true;

                      return offense.monsters.some(monster =>
                        monster.name.toLowerCase().includes(query)
                      );
                    })
                    .map(offense => (
                  <div key={offense.id} className={styles.availableOffenseCard}>
                    <div className={styles.availableOffenseHeader}>
                      <h4>{offense.name}</h4>
                      <span className={styles.linkedCount}>
                        Liée à {offense.defenses?.length || 0} défense(s)
                      </span>
                    </div>
                    <div className={styles.availableOffenseMonsters}>
                      {offense.monsters.map((monster, idx) => (
                        <div
                          key={idx}
                          className={styles.availableMonster}
                          style={{ borderColor: getElementColor(monster.element) }}
                        >
                          <img src={monster.image} alt={monster.name} />
                        </div>
                      ))}
                    </div>
                    <div className={styles.availableOffenseFooter}>
                      <span className={styles.createdBy}>
                        Par {offense.createdBy?.name || 'Inconnu'}
                      </span>
                      <button
                        className={styles.btnLink}
                        onClick={() => linkOffense(offense.id)}
                      >
                        Lier à cette défense
                      </button>
                    </div>
                  </div>
                    ))}
                </div>
              </>
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowLinkModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default DefenseDetail;
