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
import axios from 'axios';
import styles from './GuildPage.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  const [showAllGuilds, setShowAllGuilds] = useState(false);
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

  const canManageGuild = myGuild && (
    myGuild.leader._id === user?._id || user?.role === 'admin'
  );

  const isGuildLeader = myGuild && myGuild.leader._id === user?._id;

  const canPromoteMembers = myGuild && (
    myGuild.leader._id === user?._id ||
    myGuild.subLeaders?.some(s => s._id === user?._id) ||
    user?.role === 'admin'
  );

  const canViewJoinRequests = myGuild && (
    myGuild.leader._id === user?._id ||
    myGuild.subLeaders?.some(s => s._id === user?._id) ||
    user?.role === 'admin'
  );

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
        .filter(g => g.joinRequests?.some(r => r.user === user?._id || r.user?._id === user?._id))
        .map(g => g._id);
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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/guilds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuilds(response.data.guilds);
      const userGuild = response.data.guilds.find(g =>
        g.members.some(m => m._id === user?._id)
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
      const token = localStorage.getItem('token');
      const endpoint = user?.role === 'admin' ? `${API_URL}/users` : `${API_URL}/users/available-for-guild`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchJoinRequests = async () => {
    if (!myGuild) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/guilds/${myGuild._id}/join-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJoinRequests(response.data.joinRequests || []);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const requestToJoinGuild = async (guildId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/guilds/${guildId}/join-request`,
        { message: joinMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/guilds/${guildId}/join-request`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(prev => prev.filter(id => id !== guildId));
      showToast('Demande annulée', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de l\'annulation', 'error');
    }
  };

  const acceptJoinRequest = async (userId) => {
    if (!myGuild) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/guilds/${myGuild._id}/join-requests/${userId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/guilds/${myGuild._id}/join-requests/${userId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/guilds`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/guilds/${myGuild._id}/invite`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/guilds/${myGuild._id}/members/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
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
          const token = localStorage.getItem('token');
          await axios.post(`${API_URL}/guilds/${myGuild._id}/sub-leaders/${userId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
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
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/guilds/${myGuild._id}/sub-leaders/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
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
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/guilds/${myGuild._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
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
          const token = localStorage.getItem('token');
          await axios.post(`${API_URL}/guilds/${myGuild._id}/leave`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
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
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/guilds/${myGuild._id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
                className={`${styles.btnTab} ${showAllGuilds ? '' : styles.active}`}
                onClick={() => setShowAllGuilds(false)}
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
        </div>

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

        {/* Collapse Button for Guild */}
        {!showAllGuilds && myGuild && (
          <button
            className={`${styles.btnCollapse} ${isGuildCollapsed ? styles.collapsed : ''}`}
            onClick={() => setIsGuildCollapsed(!isGuildCollapsed)}
            title={isGuildCollapsed ? 'Afficher la guilde' : 'Réduire la guilde'}
          >
            {isGuildCollapsed && myGuild.logo ? (
              <img src={myGuild.logo} alt={myGuild.name} className={styles.btnCollapseImg} />
            ) : (
              isGuildCollapsed ? '↓' : '↑'
            )}
          </button>
        )}

        {/* My Guild Section */}
        {!showAllGuilds && myGuild && (
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
                        key={request.user._id}
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
        )}

        {/* Collapse Button for Defense */}
        {!showAllGuilds && myGuild && (
          <button
            className={`${styles.btnCollapse} ${styles.btnCollapseDefense} ${isDefenseCollapsed ? styles.collapsed : ''}`}
            onClick={() => setIsDefenseCollapsed(!isDefenseCollapsed)}
            title={isDefenseCollapsed ? 'Afficher les défenses' : 'Réduire les défenses'}
          >
            {isDefenseCollapsed ? '🛡️' : '↑'}
          </button>
        )}

        {/* Defense Builder */}
        {!showAllGuilds && myGuild && (
          <div className={`${styles.defenseWrapper} ${isDefenseCollapsed ? styles.defenseCollapsed : ''}`}>
            <DefenseBuilder guildId={myGuild._id} guild={myGuild} user={user} onToast={showToast} />
          </div>
        )}

        {/* Collapse Button for Map */}
        {!showAllGuilds && myGuild && (
          <button
            className={`${styles.btnCollapse} ${styles.btnCollapseMap} ${isMapCollapsed ? styles.collapsed : ''}`}
            onClick={() => setIsMapCollapsed(!isMapCollapsed)}
            title={isMapCollapsed ? 'Afficher la carte' : 'Réduire la carte'}
          >
            {isMapCollapsed ? '🗺️' : '↑'}
          </button>
        )}

        {/* Guild War Map */}
        {!showAllGuilds && myGuild && (
          <div className={`${styles.mapWrapper} ${isMapCollapsed ? styles.mapCollapsed : ''}`}>
            <GuildWarMap guild={myGuild} members={myGuild.members} />
          </div>
        )}

        {/* All Guilds Section */}
        {showAllGuilds && (
          <div className={styles.allGuilds}>
            <h2>Toutes les Guildes</h2>
            {guilds.filter(g => g._id !== myGuild?._id).length === 0 ? (
              <p className={styles.noGuilds}>Aucune autre guilde disponible.</p>
            ) : (
              <div className={styles.guildsGrid}>
                {guilds
                  .filter(guild => guild._id !== myGuild?._id)
                  .map(guild => (
                    <GuildCard
                      key={guild._id}
                      guild={guild}
                      isPending={pendingRequests.includes(guild._id)}
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
                onClick={() => requestToJoinGuild(selectedGuildForJoin?._id)}
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
