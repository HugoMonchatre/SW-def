import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from './Modal';
import { getTowerDisplayName } from './guildWarMapConfig';
import axios from 'axios';
import styles from './TowerDefenseModal.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MAX_DEFENSES_PER_TOWER = 5;
const MAX_4_STAR_TOWERS = ['2', '7', '11'];

const ELEMENT_COLORS = {
  Fire: '#e74c3c',
  Water: '#3498db',
  Wind: '#f1c40f',
  Light: '#ecf0f1',
  Dark: '#9b59b6',
};

// Check if tower has 4-star restriction
const is4StarTower = (towerId) => {
  if (!towerId) return false;
  return MAX_4_STAR_TOWERS.includes(towerId.slice(1));
};

// Check if defense only has 4-star or less monsters
const isDefenseValid4Star = (defense) => {
  return defense.monsters.every(m => m.natural_stars <= 4);
};

// Get element color
const getElementColor = (element) => ELEMENT_COLORS[element] || '#95a5a6';

// Render monster list (extracted to avoid recreation)
const MonsterList = ({ monsters }) => (
  <div className={styles.monsterList}>
    {monsters.map((monster, idx) => (
      <div key={idx} className={styles.monsterItem}>
        <img src={monster.image} alt={monster.name} className={styles.monsterImage} />
      </div>
    ))}
  </div>
);

function TowerDefenseModal({
  isOpen,
  onClose,
  tower,
  guild,
  user,
  onToast,
  onDefenseUpdate
}) {
  const [defenses, setDefenses] = useState([]);
  const [towerDefenses, setTowerDefenses] = useState([]);
  const [availableDefenses, setAvailableDefenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create defense states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [defenseName, setDefenseName] = useState('');
  const [selectedMonsters, setSelectedMonsters] = useState([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [monsterSearch, setMonsterSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Memo states
  const [memo, setMemo] = useState('');
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoInput, setMemoInput] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);

  // Check if user can edit tower defenses
  const canEdit = guild && (
    guild.leader?._id === user?._id ||
    guild.subLeaders?.some(s => s._id === user?._id) ||
    user?.role === 'admin'
  );

  const isTowerFull = towerDefenses.length >= MAX_DEFENSES_PER_TOWER;
  const is4StarRestricted = is4StarTower(tower?.id);

  useEffect(() => {
    if (isOpen && guild?._id) {
      fetchDefenses();
      fetchTowerDefenses();
    }
  }, [isOpen, guild?._id, tower?.id]);

  const fetchDefenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/defenses/guild/${guild._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDefenses(response.data.defenses || []);
    } catch (error) {
      console.error('Error fetching defenses:', error);
    }
  };

  const fetchTowerDefenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/towers/${guild._id}/${tower?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTowerDefenses(response.data.defenses || []);
      setMemo(response.data.memo || '');
    } catch (error) {
      // Tower might not exist yet, that's ok
      setMemo('');
      setTowerDefenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filter available defenses (not already assigned to this tower)
    const assignedIds = towerDefenses.map(d => d._id);
    let filtered = defenses.filter(d => !assignedIds.includes(d._id));

    // Filter by 4-star restriction if applicable
    if (is4StarRestricted) {
      filtered = filtered.filter(d => isDefenseValid4Star(d));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setAvailableDefenses(filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.monsters.some(m => m.name.toLowerCase().includes(query))
      ));
    } else {
      setAvailableDefenses(filtered);
    }
  }, [defenses, towerDefenses, searchQuery, is4StarRestricted]);

  const handleAddDefense = async (defense) => {
    if (!canEdit) return;
    if (isTowerFull) {
      onToast?.(`Maximum ${MAX_DEFENSES_PER_TOWER} défenses par tour`, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/towers/${guild._id}/${tower.id}/defense`,
        { defenseId: defense._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTowerDefenses(prev => [...prev, defense]);
      onToast?.('Défense ajoutée à la tour', 'success');
      onDefenseUpdate?.();
    } catch (error) {
      console.error('Error adding defense:', error);
      onToast?.(error.response?.data?.error || 'Erreur lors de l\'ajout de la défense', 'error');
    }
  };

  const handleRemoveDefense = async (defense, index) => {
    if (!canEdit) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/towers/${guild._id}/${tower.id}/defense/${index}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTowerDefenses(prev => prev.filter((_, i) => i !== index));
      onToast?.('Défense retirée de la tour', 'success');
      onDefenseUpdate?.();
    } catch (error) {
      console.error('Error removing defense:', error);
      onToast?.('Erreur lors de la suppression de la défense', 'error');
    }
  };

  const handleFillTower = async () => {
    if (!canEdit || towerDefenses.length === 0 || isTowerFull) return;

    const firstDefense = towerDefenses[0];

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/towers/${guild._id}/${tower.id}/fill`,
        { defenseId: firstDefense._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refetch tower defenses to get the updated list
      await fetchTowerDefenses();
      onToast?.(`Tour remplie avec ${response.data.addedCount} défenses`, 'success');
      onDefenseUpdate?.();
    } catch (error) {
      console.error('Error filling tower:', error);
      onToast?.(error.response?.data?.error || 'Erreur lors du remplissage de la tour', 'error');
    }
  };

  const handleSaveMemo = async () => {
    if (!canEdit) return;

    setSavingMemo(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/towers/${guild._id}/${tower.id}/memo`,
        { memo: memoInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMemo(memoInput);
      setEditingMemo(false);
      onToast?.('Mémo mis à jour', 'success');
    } catch (error) {
      console.error('Error saving memo:', error);
      onToast?.(error.response?.data?.error || 'Erreur lors de la sauvegarde du mémo', 'error');
    } finally {
      setSavingMemo(false);
    }
  };

  const startEditingMemo = () => {
    setMemoInput(memo);
    setEditingMemo(true);
  };

  const cancelEditingMemo = () => {
    setMemoInput('');
    setEditingMemo(false);
  };

  // Monster search
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
      let results = response.data.results || [];
      // Filter by 4-star max if tower has restriction
      if (is4StarRestricted) {
        results = results.filter(m => m.natural_stars <= 4);
      }
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching monsters:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [is4StarRestricted]);

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

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setDefenseName('');
    setSelectedMonsters([null, null, null]);
    setActiveSlot(null);
    setMonsterSearch('');
    setSearchResults([]);
  };

  const saveDefense = async () => {
    if (!defenseName.trim()) {
      onToast?.('Veuillez entrer un nom pour la défense', 'error');
      return;
    }

    if (selectedMonsters.some(m => m === null)) {
      onToast?.('Veuillez sélectionner 3 monstres', 'error');
      return;
    }

    if (isTowerFull) {
      onToast?.(`Maximum ${MAX_DEFENSES_PER_TOWER} défenses par tour`, 'error');
      return;
    }

    // Check 4-star restriction
    if (is4StarRestricted && selectedMonsters.some(m => m && m.natural_stars > 4)) {
      onToast?.('Cette tour n\'accepte que des monstres 4★ maximum', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Create the defense
      const response = await axios.post(`${API_URL}/defenses`, {
        name: defenseName,
        guildId: guild._id,
        monsters: selectedMonsters
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newDefense = response.data.defense;

      // Add it to the tower
      await axios.post(`${API_URL}/towers/${guild._id}/${tower.id}/defense`,
        { defenseId: newDefense._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setDefenses(prev => [...prev, newDefense]);
      setTowerDefenses(prev => [...prev, newDefense]);

      onToast?.('Défense créée et ajoutée à la tour', 'success');
      onDefenseUpdate?.();
      resetCreateForm();
    } catch (error) {
      console.error('Error saving defense:', error);
      onToast?.(error.response?.data?.error || 'Erreur lors de la création', 'error');
    } finally {
      setSaving(false);
    }
  };

  const towerName = useMemo(() => getTowerDisplayName(tower?.id), [tower?.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={towerName}
      size="wide"
    >
      <div className={styles.container}>
        {is4StarRestricted && (
          <div className={styles.restrictionWarning}>
            ⚠️ Cette tour n'accepte que des monstres 4★ maximum
          </div>
        )}

        {/* Memo section */}
        <div className={styles.memoSection}>
          <div className={styles.memoHeader}>
            <span className={styles.memoLabel}>📝 Mémo</span>
            {canEdit && !editingMemo && (
              <button
                className={styles.memoEditBtn}
                onClick={startEditingMemo}
              >
                Modifier
              </button>
            )}
          </div>
          {editingMemo ? (
            <div className={styles.memoEditForm}>
              <textarea
                className={styles.memoTextarea}
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="Ajouter un mémo pour cette tour..."
                rows={3}
              />
              <div className={styles.memoActions}>
                <button
                  className={styles.memoCancelBtn}
                  onClick={cancelEditingMemo}
                  disabled={savingMemo}
                >
                  Annuler
                </button>
                <button
                  className={styles.memoSaveBtn}
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                >
                  {savingMemo ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.memoContent}>
              {memo ? memo : <span className={styles.memoEmpty}>Aucun mémo</span>}
            </div>
          )}
        </div>

        <div className={styles.splitLayout}>
          {/* Left side: Current defenses in tower */}
          <div className={styles.leftPanel}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>
                Défenses assignées ({towerDefenses.length}/{MAX_DEFENSES_PER_TOWER})
              </h4>
              {canEdit && towerDefenses.length > 0 && !isTowerFull && (
                <button
                  className={styles.btnFillTower}
                  onClick={handleFillTower}
                  title="Remplir les emplacements restants avec la première défense"
                >
                  Remplir la tour
                </button>
              )}
            </div>

            {loading ? (
              <div className={styles.loading}>Chargement...</div>
            ) : towerDefenses.length === 0 ? (
              <div className={styles.emptyState}>
                Aucune défense assignée
              </div>
            ) : (
              <div className={styles.defenseList}>
                {towerDefenses.map((defense, index) => (
                  <div key={`${defense._id}-${index}`} className={styles.defenseCard}>
                    <div className={styles.defenseInfo}>
                      <span className={styles.defenseName}>{defense.name}</span>
                      <MonsterList monsters={defense.monsters} />
                    </div>
                    {canEdit && (
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveDefense(defense, index)}
                        title="Retirer de la tour"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side: Available defenses to add */}
          <div className={styles.rightPanel}>
            {canEdit ? (
              <>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>Défenses disponibles</h4>
                  <button
                    className={styles.btnCreateNew}
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    disabled={isTowerFull}
                  >
                    {showCreateForm ? 'Annuler' : '+ Créer'}
                  </button>
                </div>

                {isTowerFull && !showCreateForm && (
                  <div className={styles.towerFullWarning}>
                    Tour complète (max {MAX_DEFENSES_PER_TOWER})
                  </div>
                )}

                {showCreateForm ? (
                  <div className={styles.createForm}>
                    <div className={styles.formGroup}>
                      <label>Nom de la défense</label>
                      <input
                        type="text"
                        value={defenseName}
                        onChange={(e) => setDefenseName(e.target.value)}
                        placeholder="Ex: Defense Tower 1"
                        className={styles.input}
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
                                  className={styles.slotImage}
                                  style={{ borderColor: getElementColor(monster.element) }}
                                />
                                <button
                                  className={styles.slotRemoveBtn}
                                  onClick={(e) => { e.stopPropagation(); removeMonster(idx); }}
                                >
                                  ×
                                </button>
                                <span className={styles.slotName}>{monster.name}</span>
                                {monster.leader_skill && (
                                  <span className={styles.slotLeader}>L</span>
                                )}
                              </>
                            ) : (
                              <span className={styles.slotPlaceholder}>
                                {activeSlot === idx ? '...' : `${idx + 1}`}
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

                    <div className={styles.formActions}>
                      <button
                        className={styles.btnCancel}
                        onClick={resetCreateForm}
                      >
                        Annuler
                      </button>
                      <button
                        className={styles.btnSave}
                        onClick={saveDefense}
                        disabled={saving || !defenseName.trim() || selectedMonsters.some(m => m === null) || isTowerFull}
                      >
                        {saving ? 'Création...' : 'Créer et ajouter'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isTowerFull}
                    />

                    {availableDefenses.length === 0 ? (
                      <div className={styles.emptyState}>
                        {defenses.length === 0
                          ? 'Aucune défense créée'
                          : 'Aucune défense disponible'}
                      </div>
                    ) : (
                      <div className={styles.availableList}>
                        {availableDefenses.map(defense => (
                          <div
                            key={defense._id}
                            className={`${styles.availableCard} ${isTowerFull ? styles.disabled : ''}`}
                            onClick={() => !isTowerFull && handleAddDefense(defense)}
                          >
                            <div className={styles.defenseInfo}>
                              <span className={styles.defenseName}>{defense.name}</span>
                              <MonsterList monsters={defense.monsters} />
                            </div>
                            {!isTowerFull && <span className={styles.addIcon}>+</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className={styles.noPermission}>
                Seuls le leader, les sous-chefs et les admins peuvent modifier les défenses
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TowerDefenseModal;
