import { useState, useEffect, useCallback } from 'react';
import { Modal, ConfirmDialog } from './Modal';
import DefenseDetail from './DefenseDetail';
import axios from 'axios';
import styles from './DefenseBuilder.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DefenseBuilder({ guildId, guild, user, onToast }) {
  const [defenses, setDefenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defenseName, setDefenseName] = useState('');
  const [selectedMonsters, setSelectedMonsters] = useState([null, null, null]);
  const [monsterSearch, setMonsterSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [editingDefense, setEditingDefense] = useState(null);
  const [selectedDefense, setSelectedDefense] = useState(null);
  const [defenseSearchQuery, setDefenseSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    defenseId: null,
    defenseName: ''
  });

  useEffect(() => {
    if (guildId) {
      fetchDefenses();
    }
  }, [guildId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && !e.target.closest(`.${styles.defenseActions}`)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const fetchDefenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/defenses/guild/${guildId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDefenses(response.data.defenses);
    } catch (error) {
      console.error('Error fetching defenses:', error);
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
      const response = await axios.get(`${API_URL}/defenses/monsters/search`, {
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

    // leader_skill is already included in the monster data from the API
    const newMonsters = [...selectedMonsters];
    newMonsters[activeSlot] = {
      com2us_id: monster.com2us_id,
      name: monster.name,
      image: monster.image,
      element: monster.element,
      natural_stars: monster.natural_stars,
      leader_skill: monster.leader_skill || null
    };
    setSelectedMonsters(newMonsters);

    // Auto-generate defense name from monster names
    const monsterNames = newMonsters
      .filter(m => m !== null)
      .map(m => m.name)
      .join('-');
    if (monsterNames) {
      setDefenseName(monsterNames);
    }

    setActiveSlot(null);
    setMonsterSearch('');
    setSearchResults([]);
  };

  const removeMonster = (slot) => {
    const newMonsters = [...selectedMonsters];
    newMonsters[slot] = null;
    setSelectedMonsters(newMonsters);

    // Update defense name
    const monsterNames = newMonsters
      .filter(m => m !== null)
      .map(m => m.name)
      .join('-');
    setDefenseName(monsterNames);
  };

  const openCreateModal = () => {
    setDefenseName('');
    setSelectedMonsters([null, null, null]);
    setEditingDefense(null);
    setShowCreateModal(true);
  };

  const openEditModal = (defense) => {
    setDefenseName(defense.name);
    setSelectedMonsters(defense.monsters);
    setEditingDefense(defense);
    setShowCreateModal(true);
  };

  const saveDefense = async () => {
    if (!defenseName.trim()) {
      onToast('Veuillez entrer un nom pour la défense', 'error');
      return;
    }

    if (selectedMonsters.some(m => m === null)) {
      onToast('Veuillez sélectionner 3 monstres', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (editingDefense) {
        await axios.patch(`${API_URL}/defenses/${editingDefense._id}`, {
          name: defenseName,
          monsters: selectedMonsters
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onToast('Défense mise à jour avec succès !', 'success');
      } else {
        await axios.post(`${API_URL}/defenses`, {
          name: defenseName,
          guildId,
          monsters: selectedMonsters
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onToast('Défense créée avec succès !', 'success');
      }

      setShowCreateModal(false);
      fetchDefenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const confirmDeleteDefense = (defense) => {
    setConfirmDialog({
      isOpen: true,
      defenseId: defense._id,
      defenseName: defense.name
    });
  };

  const deleteDefense = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/defenses/${confirmDialog.defenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onToast('Défense supprimée avec succès !', 'success');
      setConfirmDialog({ isOpen: false, defenseId: null, defenseName: '' });
      fetchDefenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
  };

  const canManageDefense = (defense) => {
    if (!user || !guild) return false;

    // Creator can manage
    if (defense.createdBy?._id === user._id) return true;

    // Guild leader can manage
    if (guild.leader?._id === user._id) return true;

    // Sub-leaders can manage
    if (guild.subLeaders?.some(s => s._id === user._id)) return true;

    // Admin can manage
    if (user.role === 'admin') return true;

    return false;
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

  const filteredDefenses = defenses.filter(defense => {
    if (!defenseSearchQuery.trim()) return true;

    const query = defenseSearchQuery.toLowerCase();

    // Search in defense name
    if (defense.name.toLowerCase().includes(query)) return true;

    // Search in monster names
    return defense.monsters.some(monster =>
      monster.name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div className={styles.loading}>Chargement des défenses...</div>;
  }

  return (
    <div className={styles.defenseBuilder}>
      <div className={styles.header}>
        <h3>Défenses de Guilde</h3>
        <button className={styles.btnCreate} onClick={openCreateModal}>
          + Nouvelle Défense
        </button>
      </div>

      {defenses.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Aucune défense créée pour le moment.</p>
          <button className={styles.btnCreate} onClick={openCreateModal}>
            Créer une défense
          </button>
        </div>
      ) : (
        <>
          <div className={styles.searchBar}>
            <input
              type="text"
              value={defenseSearchQuery}
              onChange={(e) => setDefenseSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de défense ou de monstre..."
              className={styles.searchInput}
            />
            {defenseSearchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setDefenseSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {filteredDefenses.length === 0 ? (
            <div className={styles.noResults}>
              Aucune défense trouvée pour "{defenseSearchQuery}"
            </div>
          ) : (
            <div className={styles.defensesList}>
              {filteredDefenses.map(defense => (
            <div
              key={defense._id}
              className={styles.defenseCard}
              onClick={() => setSelectedDefense(defense)}
            >
              <div className={`${styles.counterBadge} ${defense.offenseCount > 0 ? styles.hasCounters : ''}`}>
                {defense.offenseCount || 0}
              </div>
              <div className={styles.defenseHeader}>
                <h4>{defense.name}</h4>
                {canManageDefense(defense) && (
                  <div className={styles.defenseActions} onClick={e => e.stopPropagation()}>
                    <button
                      className={styles.btnManage}
                      onClick={() => setOpenMenuId(openMenuId === defense._id ? null : defense._id)}
                    >
                      Gérer
                    </button>
                    {openMenuId === defense._id && (
                      <div className={styles.manageMenu}>
                        <button
                          className={styles.menuItem}
                          onClick={() => {
                            openEditModal(defense);
                            setOpenMenuId(null);
                          }}
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => {
                            confirmDeleteDefense(defense);
                            setOpenMenuId(null);
                          }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.defenseContent}>
                <div className={styles.monstersRow}>
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
                        <img
                          src={monster.image}
                          alt={monster.name}
                        />
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
                <div className={styles.defenseFooter}>
                  <span>Créé par {defense.createdBy?.name || 'Inconnu'}</span>
                  <span className={styles.clickHint}>Cliquer pour voir les offenses</span>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, defenseId: null, defenseName: '' })}
        onConfirm={deleteDefense}
        title="Supprimer la défense"
        message={`Êtes-vous sûr de vouloir supprimer la défense "${confirmDialog.defenseName}" ? Cette action est irréversible.`}
      />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingDefense ? 'Modifier la Défense' : 'Créer une Défense'}
      >
        <div className={styles.createForm}>
          <div className={styles.formGroup}>
            <label>Nom de la défense</label>
            <input
              type="text"
              value={defenseName}
              onChange={(e) => setDefenseName(e.target.value)}
              placeholder="Ex: Defense Tower 1"
            />
          </div>

          <div className={styles.monsterSlots}>
            <label>Sélectionnez 3 monstres</label>
            <div className={styles.slots}>
              {selectedMonsters.map((monster, idx) => (
                <div
                  key={idx}
                  className={`${styles.slot} ${activeSlot === idx ? styles.active : ''} ${monster ? styles.filled : ''}`}
                  onClick={() => !monster && setActiveSlot(idx)}
                >
                  {monster ? (
                    <>
                      <img
                        src={monster.image}
                        alt={monster.name}
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={(e) => { e.stopPropagation(); removeMonster(idx); }}
                      >
                        ×
                      </button>
                      <div className={styles.slotName}>{monster.name}</div>
                      {monster.leader_skill && (
                        <div className={styles.slotLeader}>L</div>
                      )}
                    </>
                  ) : (
                    <span className={styles.slotPlaceholder}>
                      {activeSlot === idx ? 'Recherchez...' : `Slot ${idx + 1}`}
                    </span>
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

          <div className={styles.modalActions}>
            <button
              className={styles.btnSecondary}
              onClick={() => setShowCreateModal(false)}
            >
              Annuler
            </button>
            <button
              className={styles.btnPrimary}
              onClick={saveDefense}
              disabled={!defenseName.trim() || selectedMonsters.some(m => m === null)}
            >
              {editingDefense ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {selectedDefense && (
        <DefenseDetail
          defense={selectedDefense}
          guild={guild}
          user={user}
          onClose={() => setSelectedDefense(null)}
          onToast={onToast}
          onOffenseUpdate={fetchDefenses}
        />
      )}
    </div>
  );
}

export default DefenseBuilder;
