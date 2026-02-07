import { useState, useEffect, useRef } from 'react';
import { Modal, ConfirmDialog } from './Modal';
import DefenseDetail from './DefenseDetail';
import api from '../services/api';
import { useMonsterSearch } from '../hooks/useMonsterSearch';
import { usePermissions } from '../hooks/usePermissions';
import { getElementColor, formatLeaderSkill } from '../utils/monsters';
import styles from './DefenseBuilder.module.css';

function DefenseBuilder({ guildId, guild, user, onToast }) {
  const [defenses, setDefenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defenseName, setDefenseName] = useState('');
  const [selectedMonsters, setSelectedMonsters] = useState([null, null, null]);
  const [editingDefense, setEditingDefense] = useState(null);
  const [selectedDefense, setSelectedDefense] = useState(null);
  const [defenseSearchQuery, setDefenseSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    defenseId: null,
    defenseName: ''
  });

  // Inventory states
  const [inventory, setInventory] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [compatiblePlayers, setCompatiblePlayers] = useState([]);
  const [partialPlayers, setPartialPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const fileInputRef = useRef(null);

  const { canManage: canManageInventory, canManageItem: canManageDefense } = usePermissions(guild, user);

  const {
    monsterSearch, setMonsterSearch,
    searchResults, searchLoading,
    activeSlot, setActiveSlot,
    clearSearch,
  } = useMonsterSearch();

  useEffect(() => {
    if (guildId) {
      fetchDefenses();
      fetchInventory();
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

  // Check compatible players when monsters change
  useEffect(() => {
    const monsterNames = selectedMonsters.filter(m => m !== null).map(m => m.name);
    if (monsterNames.length === 3 && inventory) {
      checkCompatiblePlayers(monsterNames);
    } else {
      setCompatiblePlayers([]);
      setPartialPlayers([]);
    }
  }, [selectedMonsters, inventory]);

  const fetchInventory = async () => {
    try {
      const response = await api.get(`/inventory/${guildId}`);
      setInventory(response.data.inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/inventory/upload/${guildId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onToast(`${response.data.message} (${response.data.playersCount} joueurs, ${response.data.monstersCount} monstres)`, 'success');
      fetchInventory();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de l\'upload', 'error');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteInventory = async () => {
    try {
      await api.delete(`/inventory/${guildId}`);
      onToast('Inventaire supprimé', 'success');
      setInventory(null);
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
  };

  const checkCompatiblePlayers = async (monsterNames) => {
    setLoadingPlayers(true);
    try {
      const response = await api.post(`/inventory/${guildId}/check-monsters`, {
        monsters: monsterNames
      });
      setCompatiblePlayers(response.data.compatiblePlayers || []);
      setPartialPlayers(response.data.partialPlayers || []);
    } catch (error) {
      console.error('Error checking compatible players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchDefenses = async () => {
    try {
      const response = await api.get(`/defenses/guild/${guildId}`);
      setDefenses(response.data.defenses);
    } catch (error) {
      console.error('Error fetching defenses:', error);
    } finally {
      setLoading(false);
    }
  };

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

    clearSearch();
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
      if (editingDefense) {
        await api.patch(`/defenses/${editingDefense.id}`, {
          name: defenseName,
          monsters: selectedMonsters
        });
        onToast('Défense mise à jour avec succès !', 'success');
      } else {
        await api.post('/defenses', {
          name: defenseName,
          guildId,
          monsters: selectedMonsters
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
      defenseId: defense.id,
      defenseName: defense.name
    });
  };

  const deleteDefense = async () => {
    try {
      await api.delete(`/defenses/${confirmDialog.defenseId}`);
      onToast('Défense supprimée avec succès !', 'success');
      setConfirmDialog({ isOpen: false, defenseId: null, defenseName: '' });
      fetchDefenses();
    } catch (error) {
      onToast(error.response?.data?.error || 'Erreur lors de la suppression', 'error');
    }
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

      {/* Inventory Upload Section */}
      <div className={styles.inventorySection}>
        <div className={styles.inventoryHeader}>
          <h4>Inventaire des Monstres</h4>
          {canManageInventory && (
            <div className={styles.uploadArea}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className={styles.fileInput}
                id="inventory-upload"
              />
              <label htmlFor="inventory-upload">
                <button
                  className={styles.btnUpload}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? 'Upload en cours...' : (inventory ? 'Mettre a jour' : 'Importer Excel')}
                </button>
              </label>
              {inventory && (
                <button className={styles.btnDelete} onClick={deleteInventory}>
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
        {inventory ? (
          <div className={styles.inventoryInfo}>
            <span>{inventory.playersCount} joueurs</span>
            <span>{inventory.monstersCount} monstres</span>
            <span>Fichier: {inventory.fileName}</span>
            <span>Par: {inventory.uploadedBy}</span>
          </div>
        ) : (
          <p className={styles.noInventory}>
            Aucun inventaire importe. {canManageInventory ? 'Uploadez un fichier Excel pour voir qui peut faire chaque defense.' : 'Un chef ou sous-chef doit uploader le fichier Excel.'}
          </p>
        )}
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
              key={defense.id}
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
                      onClick={() => setOpenMenuId(openMenuId === defense.id ? null : defense.id)}
                    >
                      Gérer
                    </button>
                    {openMenuId === defense.id && (
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

          {/* Compatible Players Section */}
          {selectedMonsters.every(m => m !== null) && (
            <div className={styles.compatiblePlayersSection}>
              <h5>Joueurs pouvant faire cette defense</h5>
              {!inventory ? (
                <p className={styles.noInventory}>Aucun inventaire importe</p>
              ) : loadingPlayers ? (
                <p className={styles.loadingPlayers}>Recherche des joueurs...</p>
              ) : (
                <>
                  {compatiblePlayers.length > 0 ? (
                    <div className={styles.compatiblePlayersList}>
                      {compatiblePlayers.map((player, idx) => (
                        <span key={idx} className={styles.playerTag}>
                          {player.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noInventory}>Aucun joueur ne possede les 3 monstres</p>
                  )}

                  {partialPlayers.length > 0 && (
                    <div className={styles.partialPlayersList}>
                      <h6>Joueurs partiels ({partialPlayers[0].matchCount}/3 monstres)</h6>
                      {partialPlayers.map((player, idx) => (
                        <div key={idx} className={styles.partialPlayer}>
                          <span className={styles.partialPlayerName}>{player.name}</span>
                          <span className={styles.partialPlayerMissing}>
                            Manque: {player.missingMonsters.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
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
