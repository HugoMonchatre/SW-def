import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import InvitationCard from '../components/InvitationCard';
import WeeklySiegeWidget from '../components/WeeklySiegeWidget';
import { Modal } from '../components/Modal';
import styles from './DashboardPage.module.css';

function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const [userGuild, setUserGuild] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [swData, setSwData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.guildId) {
      fetchUserGuild();
    }
    fetchInvitations();
    fetchSwData();
  }, [user]);

  const fetchSwData = async () => {
    try {
      const response = await api.get('/users/me/sw-data');
      setSwData(response.data.swData);
    } catch (error) {
      console.error('Erreur lors du chargement des données SW:', error);
    }
  };

  const fetchUserGuild = async () => {
    try {
      const response = await api.get(`/guilds/${user.guildId}`);
      setUserGuild(response.data.guild);
    } catch (error) {
      console.error('Erreur lors du chargement de la guilde:', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/invitations/my-invitations');
      setInvitations(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
  };

  const handleInvitationResponse = (invitationId, status) => {
    setInvitations(invitations.filter(inv => inv.id !== invitationId));
    if (status === 'accepted') {
      window.location.reload();
    }
  };

  const openProfileModal = () => {
    const avatar = user?.avatar && user.avatar !== user.email && !user.avatar.includes('@') ? user.avatar : '';
    setProfileForm({
      username: user?.username || user?.name || '',
      avatar,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowProfileModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
      }
      if (profileForm.newPassword.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
    }
    setLoading(true);
    try {
      const response = await api.patch('/users/me/profile', {
        username: profileForm.username,
        avatar: profileForm.avatar
      });
      setUser(response.data.user);
      if (profileForm.newPassword) {
        await api.patch('/users/me/password', {
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword
        });
      }
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

    if (!file.name.endsWith('.json')) {
      setUploadStatus({ type: 'error', message: 'Le fichier doit être au format JSON' });
      return;
    }

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

      const response = await api.post('/users/me/sw-data', { jsonData });
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
      await api.delete('/users/me/sw-data');
      setSwData(null);
      setUploadStatus({ type: 'success', message: 'Données supprimées' });
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erreur lors de la suppression' });
    }
  };


  return (
    <div className={styles.dashboardPage}>
      <div className={styles.container}>

        {/* Full-width: invitations */}
        {invitations.length > 0 && (
          <div className={styles.invitationsSection}>
            <h2>Invitations en attente ({invitations.length})</h2>
            <div className={styles.invitationsList}>
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResponse={handleInvitationResponse}
                />
              ))}
            </div>
          </div>
        )}

        {/* Weekly siege availability widget */}
        {user?.guildId && <WeeklySiegeWidget />}

        {/* Side by side: profil (30%) + données SW (70%) */}
        <div className={styles.mainRow}>
          <div className={styles.profileSection}>
            <button onClick={openProfileModal} className={styles.btnGear} title="Modifier le profil">
              ⚙️
            </button>
            <div className={styles.avatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={styles.profileInfo}>
              <h2>{user?.name}</h2>
              <span className={`${styles.badge} ${styles[user?.role]}`}>
                {user?.role}
              </span>
            </div>
            {userGuild && (
              <div className={styles.guildInfo}>
                {userGuild.logo && (
                  <img src={userGuild.logo} alt={userGuild.name} className={styles.guildLogo} />
                )}
                <span className={styles.statValue}>{userGuild.name}</span>
              </div>
            )}
          </div>

          <div className={styles.swDataSection}>

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
              </div>
            ) : (
              <div
                className={`${styles.uploadZone} ${isDragging ? styles.dragging : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className={styles.uploadIcon}>📁</div>
                <p className={styles.uploadText}>Glissez-déposez votre fichier JSON ici</p>
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
                <p className={styles.uploadHint}>Fichier d'export Summoners War (HubUserLogin)</p>
              </div>
            )}

            {loading && (
              <div className={styles.uploadLoading}>
                <div className={styles.spinner}></div>
                <span>Analyse en cours...</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Modifier le profil"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className={styles.btnCancel}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="profileForm"
              className={styles.btnSubmit}
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form id="profileForm" onSubmit={handleProfileSubmit}>
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
          {user?.provider === 'email' && (
            <>
              <div className={styles.formSeparator}>Changer le mot de passe (optionnel)</div>
              <div className={styles.formGroup}>
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  minLength="6"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  minLength="6"
                />
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}

export default DashboardPage;
