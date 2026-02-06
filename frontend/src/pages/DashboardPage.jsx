import { useEffect, useState, useRef } from 'react';
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
  const [swData, setSwData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [isSwDataCollapsed, setIsSwDataCollapsed] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.guild) {
      fetchUserGuild();
    }
    fetchInvitations();
    fetchSwData();
  }, [user]);

  const fetchSwData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/me/sw-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSwData(response.data.swData);
    } catch (error) {
      console.error('Erreur lors du chargement des données SW:', error);
    }
  };

  const fetchUserGuild = async () => {
    try {
      const token = localStorage.getItem('token');
      const guildId = typeof user.guild === 'object' ? user.guild._id : user.guild;
      const response = await axios.get(`${API_URL}/guilds/${guildId}`, {
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

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Check file extension
    if (!file.name.endsWith('.json')) {
      setUploadStatus({ type: 'error', message: 'Le fichier doit être au format JSON' });
      return;
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'Le fichier est trop volumineux (max 20MB)' });
      return;
    }

    setLoading(true);
    setUploadStatus({ type: '', message: '' });

    try {
      const text = await file.text();
      let jsonData;

      try {
        jsonData = JSON.parse(text);
      } catch {
        setUploadStatus({ type: 'error', message: 'Le fichier JSON est invalide' });
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/users/me/sw-data`,
        { jsonData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSwData(response.data.swData);
      setUploadStatus({ type: 'success', message: 'Données importées avec succès !' });
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.error || 'Erreur lors de l\'import'
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDeleteSwData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer vos données SW ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/me/sw-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSwData(null);
      setUploadStatus({ type: 'success', message: 'Données supprimées' });
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erreur lors de la suppression' });
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
          <div className={styles.headerActions}>
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

        <button
          className={`${styles.btnCollapse} ${isSwDataCollapsed ? styles.collapsed : ''}`}
          onClick={() => setIsSwDataCollapsed(!isSwDataCollapsed)}
          title={isSwDataCollapsed ? 'Afficher les données SW' : 'Réduire les données SW'}
        >
          {isSwDataCollapsed ? '📊' : '↑'}
        </button>

        <div className={`${styles.swDataSection} ${isSwDataCollapsed ? styles.swDataCollapsed : ''}`}>
          <h2>Données Summoners War</h2>

          {uploadStatus.message && (
            <div className={`${styles.uploadStatus} ${styles[uploadStatus.type]}`}>
              {uploadStatus.message}
            </div>
          )}

          {swData ? (
            <div className={styles.swDataCard}>
              <div className={styles.swDataInfo}>
                <div className={styles.swDataMain}>
                  <span className={styles.wizardName}>{swData.wizardName}</span>
                  <span className={styles.wizardLevel}>Niveau {swData.wizardLevel}</span>
                </div>
                <div className={styles.swDataStats}>
                  <div className={styles.swStat}>
                    <span className={styles.swStatValue}>{swData.unitCount || 0}</span>
                    <span className={styles.swStatLabel}>Monstres</span>
                  </div>
                  <div className={styles.swStat}>
                    <span className={styles.swStatValue}>{swData.runeCount || 0}</span>
                    <span className={styles.swStatLabel}>Runes</span>
                  </div>
                </div>
                <p className={styles.swDataDate}>
                  Dernière mise à jour : {new Date(swData.lastUpload).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className={styles.swDataActions}>
                <label className={styles.btnPrimary}>
                  Mettre à jour
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                  />
                </label>
                <button onClick={handleDeleteSwData} className={styles.btnDanger}>
                  Supprimer
                </button>
              </div>

              {swData.bestRuneSets && (
                <div className={styles.bestRuneSets}>
                  <h3>Set le plus rapide sur base 100</h3>
                  <div className={styles.runeSetsGrid}>
                    <div className={styles.runeSetItem}>
                      <span className={styles.runeSetName}>Swift</span>
                      <span className={styles.runeSetSpeed}>{swData.bestRuneSets.swift > 0 ? `+${swData.bestRuneSets.swift} SPD` : '-'}</span>
                    </div>
                    <div className={styles.runeSetItem}>
                      <span className={styles.runeSetName}>Swift + Will</span>
                      <span className={styles.runeSetSpeed}>{swData.bestRuneSets.swiftWill > 0 ? `+${swData.bestRuneSets.swiftWill} SPD` : '-'}</span>
                    </div>
                    <div className={styles.runeSetItem}>
                      <span className={styles.runeSetName}>Violent</span>
                      <span className={styles.runeSetSpeed}>{swData.bestRuneSets.violent > 0 ? `+${swData.bestRuneSets.violent} SPD` : '-'}</span>
                    </div>
                    <div className={styles.runeSetItem}>
                      <span className={styles.runeSetName}>Violent + Will</span>
                      <span className={styles.runeSetSpeed}>{swData.bestRuneSets.violentWill > 0 ? `+${swData.bestRuneSets.violentWill} SPD` : '-'}</span>
                    </div>
                    <div className={styles.runeSetItem}>
                      <span className={styles.runeSetName}>Despair</span>
                      <span className={styles.runeSetSpeed}>{swData.bestRuneSets.despair > 0 ? `+${swData.bestRuneSets.despair} SPD` : '-'}</span>
                    </div>
                    <div className={styles.runeSetItem}>
                      <span className={styles.runeSetName}>Despair + Will</span>
                      <span className={styles.runeSetSpeed}>{swData.bestRuneSets.despairWill > 0 ? `+${swData.bestRuneSets.despairWill} SPD` : '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`${styles.uploadZone} ${isDragging ? styles.dragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className={styles.uploadIcon}>📁</div>
              <p className={styles.uploadText}>
                Glissez-déposez votre fichier JSON ici
              </p>
              <p className={styles.uploadSubtext}>ou</p>
              <label className={styles.btnPrimary}>
                Parcourir
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
              </label>
              <p className={styles.uploadHint}>
                Fichier d'export Summoners War (HubUserLogin)
              </p>
            </div>
          )}

          {loading && (
            <div className={styles.uploadLoading}>
              <div className={styles.spinner}></div>
              <span>Analyse en cours...</span>
            </div>
          )}
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
