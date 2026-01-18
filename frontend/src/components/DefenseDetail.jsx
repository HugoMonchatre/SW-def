import { useState, useEffect, useCallback } from 'react';
import { Modal, ConfirmDialog } from './Modal';
import axios from 'axios';
import styles from './DefenseDetail.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DefenseDetail({ defense, guild, user, onClose, onToast }) {
  const [offenses, setOffenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffense, setEditingOffense] = useState(null);
  const [offenseName, setOffenseName] = useState('');
  const [selectedMonsters, setSelectedMonsters] = useState([
    { monster: null, instructions: '' },
    { monster: null, instructions: '' },
    { monster: null, instructions: '' }
  ]);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [monsterSearch, setMonsterSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    offenseId: null,
    offenseName: ''
  });

  useEffect(() => {
    if (defense?._id) {
      fetchOffenses();
    }
  }, [defense]);

  const fetchOffenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/offenses/defense/${defense._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffenses(response.data.offenses);
    } catch (error) {
      console.error('Error fetching offenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchMonsters = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/offenses/monsters/search`, {
        params: { query },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error('Error searching monsters:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (monsterSearch) {
        searchMonsters(monsterSearch);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [monsterSearch, searchMonsters]);

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

    setActiveSlot(null);
    setMonsterSearch('');
    setSearchResults([]);
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
      const token = localStorage.getItem('token');
      const monsters = selectedMonsters.map(m => ({
        ...m.monster,
        instructions: m.instructions
      }));

      if (editingOffense) {
        await axios.patch(`${API_URL}/offenses/${editingOffense._id}`, {
          name: offenseName,
          monsters,
          generalInstructions
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onToast('Offense mise à jour avec succès !', 'success');
      } else {
        await axios.post(`${API_URL}/offenses`, {
          name: offenseName,
          defenseId: defense._id,
          monsters,
          generalInstructions
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onToast('Offense créée avec succès !', 'success');
      }

      setShowCreateModal(false);
      fetchOffenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const confirmDeleteOffense = (offense) => {
    setConfirmDialog({
      isOpen: true,
      offenseId: offense._id,
      offenseName: offense.name
    });
  };

  const deleteOffense = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/offenses/${confirmDialog.offenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onToast('Offense supprimée avec succès !', 'success');
      setConfirmDialog({ isOpen: false, offenseId: null, offenseName: '' });
      fetchOffenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
  };

  const voteOffense = async (offenseId, voteType) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/offenses/${offenseId}/vote`, { voteType }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOffenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors du vote', 'error');
    }
  };

  const canManageOffense = (offense) => {
    if (!user || !guild) return false;
    if (offense.createdBy?._id === user._id) return true;
    if (guild.leader?._id === user._id) return true;
    if (guild.subLeaders?.some(s => s._id === user._id)) return true;
    if (user.role === 'admin') return true;
    return false;
  };

  const getUserVote = (offense) => {
    if (!user) return 'none';
    if (offense.votes?.up?.some(id => id === user._id || id._id === user._id)) return 'up';
    if (offense.votes?.down?.some(id => id === user._id || id._id === user._id)) return 'down';
    return 'none';
  };

  const getElementColor = (element) => {
    const colors = {
      Fire: '#e74c3c',
      Water: '#3498db',
      Wind: '#f1c40f',
      Light: '#ecf0f1',
      Dark: '#9b59b6'
    };
    return colors[element] || '#95a5a6';
  };

  const formatLeaderSkill = (leaderSkill) => {
    if (!leaderSkill) return null;
    let text = `${leaderSkill.attribute} +${leaderSkill.amount}%`;
    if (leaderSkill.area === 'Element' && leaderSkill.element) {
      text += ` (${leaderSkill.element})`;
    } else if (leaderSkill.area !== 'General') {
      text += ` (${leaderSkill.area})`;
    }
    return text;
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
            <button className={styles.btnCreate} onClick={openCreateModal}>
              + Proposer une Offense
            </button>
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
                const userVote = getUserVote(offense);
                const voteScore = (offense.votes?.up?.length || 0) - (offense.votes?.down?.length || 0);

                return (
                  <div key={offense._id} className={styles.offenseCard}>
                    <div className={styles.offenseHeader}>
                      <h4>{offense.name}</h4>
                      <div className={styles.voteSection}>
                        <button
                          className={`${styles.voteBtn} ${styles.upvote} ${userVote === 'up' ? styles.active : ''}`}
                          onClick={() => voteOffense(offense._id, userVote === 'up' ? 'none' : 'up')}
                        >
                          ▲
                        </button>
                        <span className={`${styles.voteScore} ${voteScore > 0 ? styles.positive : voteScore < 0 ? styles.negative : ''}`}>
                          {voteScore}
                        </span>
                        <button
                          className={`${styles.voteBtn} ${styles.downvote} ${userVote === 'down' ? styles.active : ''}`}
                          onClick={() => voteOffense(offense._id, userVote === 'down' ? 'none' : 'down')}
                        >
                          ▼
                        </button>
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
                      <span>Proposé par {offense.createdBy?.name || 'Inconnu'}</span>
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
                            Supprimer
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
          onClose={() => setConfirmDialog({ isOpen: false, offenseId: null, offenseName: '' })}
          onConfirm={deleteOffense}
          title="Supprimer l'offense"
          message={`Êtes-vous sûr de vouloir supprimer l'offense "${confirmDialog.offenseName}" ? Cette action est irréversible.`}
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
      </div>
    </div>
  );
}

export default DefenseDetail;
