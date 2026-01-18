import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Modal, Toast, ConfirmDialog } from '../components/Modal';
import DefenseBuilder from '../components/DefenseBuilder';
import axios from 'axios';
import styles from './GuildPage.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function GuildPage() {
  const { user } = useAuthStore();
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

  // Add member modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 30;

  useEffect(() => {
    fetchGuilds();
    if (user?.role === 'guild_leader' || user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  // Fetch join requests for leaders/sub-leaders
  useEffect(() => {
    if (myGuild && canViewJoinRequests) {
      fetchJoinRequests();
    }
  }, [myGuild]);

  // Check which guilds user has pending requests for
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

      // Find user's guild
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
      // Guild leaders use available-for-guild route, admins use all users
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

  const availableUsers = users.filter(u =>
    !u.guild && !myGuild?.members.some(m => m._id === u._id)
  );

  // Filter users by search query
  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // Reset pagination when search changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Reset search and pagination when modal opens
  const openAddMemberModal = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setShowAddMemberModal(true);
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
        {!showAllGuilds && myGuild && (
          <div className={styles.myGuildWrapper}>
            <div className={`${styles.myGuild} ${isGuildCollapsed ? styles.guildCollapsed : ''}`}>
              <div className={styles.guildHeader}>
              <div className={styles.guildHeaderMain}>
                {myGuild.logo && (
                  <div className={styles.guildLogo}>
                    <img src={myGuild.logo} alt={myGuild.name} />
                  </div>
                )}
                <div>
                  <h2>{myGuild.name}</h2>
                  <p className={styles.guildDescription}>{myGuild.description || 'Aucune description'}</p>
                  <div className={styles.guildInfo}>
                    <span>👑 Leader: {myGuild.leader.name}</span>
                    <span>⭐ Sous-chefs: {myGuild.subLeaders?.length || 0}/4</span>
                    <span>👥 Membres: {myGuild.members.length}/{myGuild.maxMembers}</span>
                  </div>
                </div>
              </div>
              {canManageGuild && (
                <div className={styles.guildActions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={openAddMemberModal}
                  >
                    Ajouter un Membre
                  </button>
                  {isGuildLeader && (
                    <button
                      className={styles.btnSecondary}
                      onClick={openEditGuildModal}
                    >
                      Modifier la Guilde
                    </button>
                  )}
                  <button
                    className={styles.btnDanger}
                    onClick={deleteGuild}
                  >
                    Supprimer la Guilde
                  </button>
                </div>
              )}
            </div>

            {/* Join Requests Section for Leaders/Sub-Leaders */}
            {canViewJoinRequests && joinRequests.length > 0 && (
              <div className={styles.joinRequestsSection}>
                <h3>Demandes d'adhésion ({joinRequests.length})</h3>
                <div className={styles.joinRequestsList}>
                  {joinRequests.map(request => (
                    <div key={request.user._id} className={styles.joinRequestCard}>
                      <div className={styles.joinRequestInfo}>
                        {request.user.avatar ? (
                          <img src={request.user.avatar} alt={request.user.name} className={styles.avatar} />
                        ) : (
                          <div className={styles.avatar}>
                            {request.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className={styles.memberName}>{request.user.name}</div>
                          <div className={styles.memberEmail}>@{request.user.username || request.user.name}</div>
                          {request.message && (
                            <div className={styles.joinRequestMessage}>"{request.message}"</div>
                          )}
                          <div className={styles.joinRequestDate}>
                            {new Date(request.requestedAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <div className={styles.joinRequestActions}>
                        <button
                          className={styles.btnAccept}
                          onClick={() => acceptJoinRequest(request.user._id)}
                        >
                          Accepter
                        </button>
                        <button
                          className={styles.btnReject}
                          onClick={() => rejectJoinRequest(request.user._id)}
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.membersSection}>
              <h3>Membres de la Guilde</h3>

              {/* Hierarchy Layout */}
              <div className={styles.hierarchy}>
                {/* Top Row: Leader + Sub-Leaders */}
                <div className={styles.leadershipRow}>
                  {/* Leader */}
                  <div className={styles.leaderCard}>
                    <div className={styles.memberInfo}>
                      {myGuild.leader.avatar ? (
                        <img src={myGuild.leader.avatar} alt={myGuild.leader.name} className={styles.avatarLarge} />
                      ) : (
                        <div className={styles.avatarLarge}>
                          {myGuild.leader.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className={styles.memberName}>
                          {myGuild.leader.name}
                          <span className={styles.crownBadge}>👑</span>
                        </div>
                        <div className={styles.memberEmail}>@{myGuild.leader.username || myGuild.leader.name}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Leaders */}
                  {myGuild.subLeaders?.map(subLeader => (
                    <div key={subLeader._id} className={styles.subLeaderCard}>
                      <div className={styles.memberInfo}>
                        {subLeader.avatar ? (
                          <img src={subLeader.avatar} alt={subLeader.name} className={styles.avatar} />
                        ) : (
                          <div className={styles.avatar}>
                            {subLeader.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className={styles.memberName}>
                            {subLeader.name}
                            <span className={styles.subLeaderBadge}>⭐</span>
                          </div>
                          <div className={styles.memberEmail}>@{subLeader.username || subLeader.name}</div>
                        </div>
                      </div>
                      {canManageGuild && (
                        <div className={styles.memberActions}>
                          <button
                            className={styles.btnDemote}
                            onClick={() => demoteSubLeader(subLeader._id)}
                            title="Rétrograder"
                          >
                            ↓
                          </button>
                          <button
                            className={styles.btnRemove}
                            onClick={() => removeMember(subLeader._id)}
                            title="Retirer de la guilde"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <hr className={styles.divider} />

                {/* Bottom Row: Regular Members */}
                <div className={styles.membersList}>
                  {myGuild.members
                    .filter(member =>
                      member._id !== myGuild.leader._id &&
                      !myGuild.subLeaders?.some(s => s._id === member._id)
                    )
                    .map(member => {
                      const canPromoteThisMember = canPromoteMembers && (myGuild.subLeaders?.length || 0) < 4;

                      return (
                        <div key={member._id} className={styles.memberCard}>
                          <div className={styles.memberInfo}>
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className={styles.avatar} />
                            ) : (
                              <div className={styles.avatar}>
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className={styles.memberName}>{member.name}</div>
                              <div className={styles.memberEmail}>@{member.username || member.name}</div>
                            </div>
                          </div>
                          {canManageGuild && (
                            <div className={styles.memberActions}>
                              {canPromoteThisMember && (
                                <button
                                  className={styles.btnPromote}
                                  onClick={() => promoteToSubLeader(member._id)}
                                  title="Promouvoir en sous-chef"
                                >
                                  ⭐
                                </button>
                              )}
                              <button
                                className={styles.btnRemove}
                                onClick={() => removeMember(member._id)}
                                title="Retirer de la guilde"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {!showAllGuilds && myGuild && (
          <DefenseBuilder guildId={myGuild._id} guild={myGuild} user={user} onToast={showToast} />
        )}

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
                    <div key={guild._id} className={styles.guildCard}>
                      {guild.logo && (
                        <div className={styles.guildCardLogo}>
                          <img src={guild.logo} alt={guild.name} />
                        </div>
                      )}
                      <div className={styles.guildCardHeader}>
                        <h3>{guild.name}</h3>
                        <div className={styles.memberCount}>
                          {guild.members.length}/{guild.maxMembers}
                        </div>
                      </div>
                      <p className={styles.guildCardDescription}>
                        {guild.description || 'Aucune description'}
                      </p>
                      <div className={styles.guildCardFooter}>
                        <span className={styles.leaderBadge}>
                          👑 {guild.leader.name}
                        </span>
                      </div>
                      {!myGuild && guild.members.length < guild.maxMembers && (
                        <div className={styles.guildCardActions}>
                          {pendingRequests.includes(guild._id) ? (
                            <button
                              className={styles.btnPending}
                              onClick={() => cancelJoinRequest(guild._id)}
                            >
                              Demande en attente ✕
                            </button>
                          ) : (
                            <button
                              className={styles.btnJoin}
                              onClick={() => openJoinRequestModal(guild)}
                            >
                              Demander à rejoindre
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
        <Modal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          title="Ajouter un Membre"
        >
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Rechercher par nom ou pseudo..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Results count */}
          <div className={styles.resultsInfo}>
            {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''} disponible{filteredUsers.length !== 1 ? 's' : ''}
            {searchQuery && ` pour "${searchQuery}"`}
          </div>

          {/* Users List */}
          <div className={styles.usersList}>
            {paginatedUsers.length === 0 ? (
              <p className={styles.noUsers}>
                {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
              </p>
            ) : (
              paginatedUsers.map(u => (
                <div key={u._id} className={styles.userItem}>
                  <div className={styles.userInfo}>
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className={styles.avatarSmall} />
                    ) : (
                      <div className={styles.avatarSmall}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className={styles.userName}>{u.name}</div>
                      <div className={styles.userEmail}>@{u.username || u.name}</div>
                    </div>
                  </div>
                  <button
                    className={styles.btnAdd}
                    onClick={() => addMember(u._id)}
                  >
                    Ajouter
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} / {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}
        </Modal>

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
