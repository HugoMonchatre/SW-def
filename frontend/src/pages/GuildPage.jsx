import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Modal, Toast, ConfirmDialog } from '../components/Modal';
import DefenseBuilder from '../components/DefenseBuilder';
import GuildCard from '../components/GuildCard';
import GuildHeader from '../components/GuildHeader';
import JoinRequestCard from '../components/JoinRequestCard';
import MembersList from '../components/MembersList';
import AddMemberModal from '../components/AddMemberModal';
import GuildWarMap from '../components/GuildWarMap';
import GuildRuneStats from '../components/GuildRuneStats';
import SiegeManagement from '../components/SiegeManagement';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import styles from './GuildPage.module.css';

function GuildPage() {
  const { user, checkAuth } = useAuthStore();
  const [guilds, setGuilds] = useState([]);
  const [myGuild, setMyGuild] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGuildModal, setShowEditGuildModal] = useState(false);
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [selectedGuildForJoin, setSelectedGuildForJoin] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', logo: '' });
  const [editFormData, setEditFormData] = useState({ description: '', logo: '' });
  const [isGuildCollapsed, setIsGuildCollapsed] = useState(false);
  const [isDefenseCollapsed, setIsDefenseCollapsed] = useState(false);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const [isRuneCollapsed, setIsRuneCollapsed] = useState(false);
  const [showAllGuilds, setShowAllGuilds] = useState(false);
  const [viewMode, setViewMode] = useState('guild');
  const [joinRequests, setJoinRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Toast state
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const { isLeader: isGuildLeader, canManageGuild, canManage: canPromoteMembers } = usePermissions(myGuild, user);
  const canViewJoinRequests = canPromoteMembers;

  useEffect(() => {
    fetchGuilds();
    if (user?.role === 'guild_leader' || user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (myGuild && canViewJoinRequests) {
      fetchJoinRequests();
    }
  }, [myGuild]);

  useEffect(() => {
    if (!myGuild && guilds.length > 0) {
      const pending = guilds
        .filter(g => g.joinRequests?.some(r => r.user === user?.id || r.user?.id === user?.id))
        .map(g => g.id);
      setPendingRequests(pending);
    }
  }, [guilds, myGuild, user]);

  const showToast = (message, type = 'success') => {
    setToast({ isVisible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const showConfirm = (title, message, onConfirm, variant = 'danger') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
  };

  const fetchGuilds = async () => {
    try {
      const response = await api.get('/guilds');
      setGuilds(response.data.guilds);
      const userGuild = response.data.guilds.find(g =>
        g.members.some(m => m.id === user?.id)
      );
      setMyGuild(userGuild || null);
    } catch (error) {
      console.error('Error fetching guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const endpoint = user?.role === 'admin' ? '/users' : '/users/available-for-guild';
      const response = await api.get(endpoint);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchJoinRequests = async () => {
    if (!myGuild) return;
    try {
      const response = await api.get(`/guilds/${myGuild.id}/join-requests`);
      setJoinRequests(response.data.joinRequests || []);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const requestToJoinGuild = async (guildId) => {
    try {
      await api.post(`/guilds/${guildId}/join-request`, { message: joinMessage });
      setShowJoinRequestModal(false);
      setJoinMessage('');
      setSelectedGuildForJoin(null);
      setPendingRequests(prev => [...prev, guildId]);
      showToast('Demande d\'adhésion envoyée !', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de l\'envoi de la demande', 'error');
    }
  };

  const cancelJoinRequest = async (guildId) => {
    try {
      await api.delete(`/guilds/${guildId}/join-request`);
      setPendingRequests(prev => prev.filter(id => id !== guildId));
      showToast('Demande annulée', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de l\'annulation', 'error');
    }
  };

  const acceptJoinRequest = async (userId) => {
    if (!myGuild) return;
    try {
      await api.post(`/guilds/${myGuild.id}/join-requests/${userId}/accept`);
      fetchGuilds();
      fetchJoinRequests();
      showToast('Membre accepté !', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de l\'acceptation', 'error');
    }
  };

  const rejectJoinRequest = async (userId) => {
    if (!myGuild) return;
    try {
      await api.post(`/guilds/${myGuild.id}/join-requests/${userId}/reject`);
      fetchJoinRequests();
      showToast('Demande refusée', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors du refus', 'error');
    }
  };

  const openJoinRequestModal = (guild) => {
    setSelectedGuildForJoin(guild);
    setJoinMessage('');
    setShowJoinRequestModal(true);
  };

  const createGuild = async (e) => {
    e.preventDefault();
    try {
      await api.post('/guilds', formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', logo: '' });
      fetchGuilds();
      showToast('Guilde créée avec succès !', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de la création de la guilde', 'error');
    }
  };

  const addMember = async (userId) => {
    if (!myGuild) return;
    try {
      await api.post(`/guilds/${myGuild.id}/invite`, { userId });
      fetchGuilds();
      fetchUsers();
      setShowAddMemberModal(false);
      showToast('Invitation envoyée avec succès !', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de l\'envoi de l\'invitation', 'error');
    }
  };

  const removeMember = async (userId) => {
    if (!myGuild) return;
    showConfirm(
      'Retirer le membre',
      'Êtes-vous sûr de vouloir retirer ce membre de la guilde ?',
      async () => {
        try {
          await api.delete(`/guilds/${myGuild.id}/members/${userId}`);
          fetchGuilds();
          fetchUsers();
          showToast('Membre retiré avec succès !', 'success');
        } catch (error) {
          showToast(error.response?.data?.error || 'Erreur lors du retrait du membre', 'error');
        }
      },
      'danger'
    );
  };

  const promoteToSubLeader = async (userId) => {
    if (!myGuild) return;
    showConfirm(
      'Promouvoir en sous-chef',
      'Voulez-vous promouvoir ce membre en sous-chef ?',
      async () => {
        try {
          await api.post(`/guilds/${myGuild.id}/sub-leaders/${userId}`);
          fetchGuilds();
          showToast('Membre promu sous-chef avec succès !', 'success');
        } catch (error) {
          showToast(error.response?.data?.error || 'Erreur lors de la promotion', 'error');
        }
      },
      'info'
    );
  };

  const demoteSubLeader = async (userId) => {
    if (!myGuild) return;
    showConfirm(
      'Rétrograder le sous-chef',
      'Voulez-vous rétrograder ce sous-chef en membre régulier ?',
      async () => {
        try {
          await api.delete(`/guilds/${myGuild.id}/sub-leaders/${userId}`);
          fetchGuilds();
          showToast('Sous-chef rétrogradé avec succès !', 'success');
        } catch (error) {
          showToast(error.response?.data?.error || 'Erreur lors de la rétrogradation', 'error');
        }
      },
      'danger'
    );
  };

  const deleteGuild = async () => {
    if (!myGuild) return;
    showConfirm(
      'Supprimer la guilde',
      'Êtes-vous sûr de vouloir supprimer cette guilde ? Cette action est irréversible et tous les membres seront retirés.',
      async () => {
        try {
          await api.delete(`/guilds/${myGuild.id}`);
          fetchGuilds();
          showToast('Guilde supprimée avec succès !', 'success');
        } catch (error) {
          showToast(error.response?.data?.error || 'Erreur lors de la suppression de la guilde', 'error');
        }
      },
      'danger'
    );
  };

  const leaveGuild = async () => {
    if (!myGuild) return;
    showConfirm(
      'Quitter la guilde',
      'Êtes-vous sûr de vouloir quitter cette guilde ? Vous devrez demander à rejoindre à nouveau si vous changez d\'avis.',
      async () => {
        try {
          await api.post(`/guilds/${myGuild.id}/leave`);
          await checkAuth();
          fetchGuilds();
          showToast('Vous avez quitté la guilde', 'success');
        } catch (error) {
          showToast(error.response?.data?.error || 'Erreur lors de la sortie de la guilde', 'error');
        }
      },
      'danger'
    );
  };

  const openEditGuildModal = () => {
    setEditFormData({
      description: myGuild?.description || '',
      logo: myGuild?.logo || ''
    });
    setShowEditGuildModal(true);
  };

  const updateGuild = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/guilds/${myGuild.id}`, editFormData);
      setShowEditGuildModal(false);
      fetchGuilds();
      showToast('Guilde mise à jour avec succès !', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de la mise à jour de la guilde', 'error');
    }
  };

  if (loading) {
    return (
      <div className={styles.guildPage}>
        <div className={styles.container}>
          <div className={styles.loading}>Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.guildPage}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Guilde</h1>
          <div className={styles.headerActions}>
            {myGuild && (
              <button
                className={`${styles.btnTab} ${!showAllGuilds && viewMode === 'guild' ? styles.active : ''}`}
                onClick={() => { setShowAllGuilds(false); setViewMode('guild'); }}
              >
                Ma Guilde
              </button>
            )}
            <button
              className={`${styles.btnTab} ${showAllGuilds ? styles.active : ''}`}
              onClick={() => setShowAllGuilds(true)}
            >
              Toutes les guildes
            </button>
            {(user?.role === 'guild_leader' || user?.role === 'admin') && !myGuild && (
              <button
                className={styles.btnPrimary}
                onClick={() => setShowCreateModal(true)}
              >
                Créer une Guilde
              </button>
            )}
          </div>
          {/* View Mode Toggle - Right side (only for leaders/sub-leaders) */}
          {myGuild && !showAllGuilds && canPromoteMembers && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewToggleBtn} ${viewMode === 'guild' ? styles.active : ''}`}
                onClick={() => setViewMode('guild')}
                title="Vue Guilde"
              >
                <span className={styles.viewIcon}>🏰</span>
              </button>
              <button
                className={`${styles.viewToggleBtn} ${viewMode === 'runeStats' ? styles.active : ''}`}
                onClick={() => setViewMode('runeStats')}
                title="Gestion des Inscriptions au Siège"
              >
                <span className={styles.viewIcon}>⚔️</span>
              </button>
            </div>
          )}
        </div>

        {/* Siege Management View (for leaders/sub-leaders) */}
        {!showAllGuilds && myGuild && viewMode === 'runeStats' && canPromoteMembers && (
          <SiegeManagement guildId={myGuild.id} onToast={showToast} />
        )}

        {/* No Guild Message */}
        {!myGuild && !showAllGuilds && (
          <div className={styles.noGuildMessage}>
            <div className={styles.noGuildIcon}>🏰</div>
            <h2>Vous n'avez pas encore de guilde</h2>
            <p>
              {user?.role === 'guild_leader' || user?.role === 'admin'
                ? 'Créez votre propre guilde ou consultez les guildes existantes pour en rejoindre une.'
                : 'Consultez les guildes existantes et attendez une invitation pour rejoindre une guilde.'}
            </p>
            <div className={styles.noGuildActions}>
              {(user?.role === 'guild_leader' || user?.role === 'admin') && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => setShowCreateModal(true)}
                >
                  Créer une Guilde
                </button>
              )}
              <button
                className={styles.btnSecondary}
                onClick={() => setShowAllGuilds(true)}
              >
                Voir les Guildes
              </button>
            </div>
          </div>
        )}

        {/* Sidebar + Content */}
        {!showAllGuilds && myGuild && viewMode === 'guild' && (
          <>
            {/* Sidebar with collapse buttons */}
            <div className={styles.sidebar}>
              <button
                className={`${styles.sidebarBtn} ${!isGuildCollapsed ? styles.sidebarBtnActive : ''}`}
                onClick={() => setIsGuildCollapsed(!isGuildCollapsed)}
                title={isGuildCollapsed ? 'Afficher la guilde' : 'Réduire la guilde'}
              >
                {myGuild.logo ? (
                  <img src={myGuild.logo} alt={myGuild.name} className={styles.sidebarBtnImg} />
                ) : (
                  <span className={styles.sidebarBtnIcon}>🏰</span>
                )}
              </button>
              <button
                className={`${styles.sidebarBtn} ${!isDefenseCollapsed ? styles.sidebarBtnActive : ''}`}
                onClick={() => setIsDefenseCollapsed(!isDefenseCollapsed)}
                title={isDefenseCollapsed ? 'Afficher les défenses' : 'Réduire les défenses'}
              >
                <span className={styles.sidebarBtnIcon}>🛡️</span>
              </button>
              <button
                className={`${styles.sidebarBtn} ${!isMapCollapsed ? styles.sidebarBtnActive : ''}`}
                onClick={() => setIsMapCollapsed(!isMapCollapsed)}
                title={isMapCollapsed ? 'Afficher la carte' : 'Réduire la carte'}
              >
                <span className={styles.sidebarBtnIcon}>🗺️</span>
              </button>
              <button
                className={`${styles.sidebarBtn} ${!isRuneCollapsed ? styles.sidebarBtnActive : ''}`}
                onClick={() => setIsRuneCollapsed(!isRuneCollapsed)}
                title={isRuneCollapsed ? 'Afficher les statistiques de runes' : 'Réduire les statistiques de runes'}
              >
                <span className={styles.sidebarBtnIcon}>📊</span>
              </button>
            </div>

            {/* My Guild Section */}
            <div className={styles.myGuildWrapper}>
              <div className={`${styles.myGuild} ${isGuildCollapsed ? styles.guildCollapsed : ''}`}>
                <GuildHeader
                  guild={myGuild}
                  canManage={canManageGuild}
                  isLeader={isGuildLeader}
                  onAddMember={() => setShowAddMemberModal(true)}
                  onEditGuild={openEditGuildModal}
                  onDeleteGuild={deleteGuild}
                  onLeaveGuild={leaveGuild}
                />

                {/* Join Requests Section */}
                {canViewJoinRequests && joinRequests.length > 0 && (
                  <div className={styles.joinRequestsSection}>
                    <h3>Demandes d'adhésion ({joinRequests.length})</h3>
                    <div className={styles.joinRequestsList}>
                      {joinRequests.map(request => (
                        <JoinRequestCard
                          key={request.user.id}
                          request={request}
                          onAccept={acceptJoinRequest}
                          onReject={rejectJoinRequest}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <MembersList
                  guild={myGuild}
                  canManage={canManageGuild}
                  canPromote={canPromoteMembers}
                  onPromote={promoteToSubLeader}
                  onDemote={demoteSubLeader}
                  onRemove={removeMember}
                />
              </div>
            </div>

            {/* Defense Builder */}
            <div className={`${styles.defenseWrapper} ${isDefenseCollapsed ? styles.defenseCollapsed : ''}`}>
              <DefenseBuilder guildId={myGuild.id} guild={myGuild} user={user} onToast={showToast} />
            </div>

            {/* Guild War Map */}
            <div className={`${styles.mapWrapper} ${isMapCollapsed ? styles.mapCollapsed : ''}`}>
              <GuildWarMap guild={myGuild} user={user} members={myGuild.members} onToast={showToast} />
            </div>

            {/* Guild Rune Stats */}
            <div className={`${styles.runeWrapper} ${isRuneCollapsed ? styles.runeCollapsed : ''}`}>
              <GuildRuneStats guildId={myGuild.id} />
            </div>
          </>
        )}

        {/* All Guilds Section */}
        {showAllGuilds && (
          <div className={styles.allGuilds}>
            <h2>Toutes les Guildes</h2>
            {guilds.filter(g => g.id !== myGuild?.id).length === 0 ? (
              <p className={styles.noGuilds}>Aucune autre guilde disponible.</p>
            ) : (
              <div className={styles.guildsGrid}>
                {guilds
                  .filter(guild => guild.id !== myGuild?.id)
                  .map(guild => (
                    <GuildCard
                      key={guild.id}
                      guild={guild}
                      isPending={pendingRequests.includes(guild.id)}
                      canJoin={!myGuild}
                      onJoinRequest={openJoinRequestModal}
                      onCancelRequest={cancelJoinRequest}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Create Guild Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Créer une Guilde"
        >
          <form onSubmit={createGuild}>
            <div className={styles.formGroup}>
              <label>Nom de la Guilde</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom de la guilde"
              />
            </div>
            <div className={styles.formGroup}>
              <label>URL du Logo (optionnel)</label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="https://exemple.com/logo.png"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la guilde"
                rows={4}
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowCreateModal(false)}>
                Annuler
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Créer
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Guild Modal */}
        <Modal
          isOpen={showEditGuildModal}
          onClose={() => setShowEditGuildModal(false)}
          title="Modifier la Guilde"
        >
          <form onSubmit={updateGuild}>
            <div className={styles.formGroup}>
              <label>URL du Logo</label>
              <input
                type="url"
                value={editFormData.logo}
                onChange={(e) => setEditFormData({ ...editFormData, logo: e.target.value })}
                placeholder="https://exemple.com/logo.png"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Description de la guilde"
                rows={4}
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowEditGuildModal(false)}>
                Annuler
              </button>
              <button type="submit" className={styles.btnPrimary}>
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          users={users}
          guildMembers={myGuild?.members}
          onAddMember={addMember}
        />

        {/* Join Request Modal */}
        <Modal
          isOpen={showJoinRequestModal}
          onClose={() => setShowJoinRequestModal(false)}
          title={`Rejoindre ${selectedGuildForJoin?.name || 'la guilde'}`}
        >
          <div className={styles.joinRequestForm}>
            <p className={styles.joinRequestInfo}>
              Vous êtes sur le point de demander à rejoindre cette guilde.
              Le chef et les sous-chefs seront notifiés de votre demande.
            </p>
            <div className={styles.formGroup}>
              <label>Message (optionnel)</label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Présentez-vous brièvement..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowJoinRequestModal(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => requestToJoinGuild(selectedGuildForJoin?.id)}
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </Modal>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
        />

        {/* Toast Notification */}
        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      </div>
    </div>
  );
}

export default GuildPage;
