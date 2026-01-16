import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import InvitationCard from '../components/InvitationCard';
import styles from './DashboardPage.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const [userGuild, setUserGuild] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    avatar: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.guild) {
      fetchUserGuild();
    }
    fetchInvitations();
  }, [user]);

  const fetchUserGuild = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/guilds/${user.guild}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserGuild(response.data.guild);
    } catch (error) {
      console.error('Erreur lors du chargement de la guilde:', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/invitations/my-invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvitations(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
  };

  const handleInvitationResponse = (invitationId, status) => {
    setInvitations(invitations.filter(inv => inv._id !== invitationId));
    if (status === 'accepted') {
      // Reload user data to update guild info
      window.location.reload();
    }
  };

  const openProfileModal = () => {
    setProfileForm({
      username: user?.username || user?.name || '',
      avatar: user?.avatar || ''
    });
    setShowProfileModal(true);
  };

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/users/me/profile`,
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(response.data.user);
      setShowProfileModal(false);
      alert('Profil mis à jour avec succès');
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/users/me/password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      alert('Mot de passe mis à jour avec succès');
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2>{user?.name}</h2>
              <span className={`${styles.badge} ${styles[user?.role]}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Pseudo</span>
              <span className={styles.statValue}>{user?.username || user?.name}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Provider</span>
              <span className={styles.statValue}>{user?.provider}</span>
            </div>
            {userGuild && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Guilde</span>
                <div className={styles.guildInfo}>
                  {userGuild.logo && (
                    <img src={userGuild.logo} alt={userGuild.name} className={styles.guildLogo} />
                  )}
                  <span className={styles.statValue}>{userGuild.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {invitations.length > 0 && (
          <div className={styles.invitationsSection}>
            <h2>Invitations en attente ({invitations.length})</h2>
            <div className={styles.invitationsList}>
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation._id}
                  invitation={invitation}
                  onResponse={handleInvitationResponse}
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.profileSection}>
          <h2>Paramètres du profil</h2>
          <div className={styles.profileActions}>
            <button onClick={openProfileModal} className={styles.btnPrimary}>
              Modifier le profil
            </button>
            {user?.provider === 'email' && (
              <button onClick={openPasswordModal} className={styles.btnSecondary}>
                Changer le mot de passe
              </button>
            )}
          </div>
        </div>

        <div className={styles.welcomeMessage}>
          <h3>Bienvenue sur votre dashboard !</h3>
          <p>Consultez vos invitations de guilde ci-dessus et gérez votre profil.</p>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Modifier le profil</h2>
            <form onSubmit={handleProfileSubmit}>
              <div className={styles.formGroup}>
                <label>Pseudo</label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  required
                  minLength="3"
                  maxLength="30"
                />
              </div>
              <div className={styles.formGroup}>
                <label>URL de l'avatar</label>
                <input
                  type="url"
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                  placeholder="https://exemple.com/avatar.jpg"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className={styles.btnCancel}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Changer le mot de passe</h2>
            <form onSubmit={handlePasswordSubmit}>
              <div className={styles.formGroup}>
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength="6"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength="6"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={styles.btnCancel}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
