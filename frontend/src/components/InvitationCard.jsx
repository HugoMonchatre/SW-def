import { useState } from 'react';
import api from '../services/api';
import styles from './InvitationCard.module.css';

function InvitationCard({ invitation, onResponse }) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.post(`/invitations/${invitation.id}/accept`);
      onResponse(invitation.id, 'accepted');
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await api.post(`/invitations/${invitation.id}/decline`);
      onResponse(invitation.id, 'declined');
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors du refus de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const daysRemaining = () => {
    const now = new Date();
    const expires = new Date(invitation.expiresAt);
    const diff = expires - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className={styles.invitationCard}>
      <div className={styles.header}>
        {invitation.guild?.logo && (
          <img src={invitation.guild.logo} alt={invitation.guild.name} className={styles.guildLogo} />
        )}
        <div className={styles.guildInfo}>
          <h3>{invitation.guild?.name}</h3>
          {invitation.guild?.description && (
            <p className={styles.description}>{invitation.guild.description}</p>
          )}
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.label}>Invité par:</span>
          <span className={styles.value}>@{invitation.invitedBy?.username || invitation.invitedBy?.name}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.label}>Rôle:</span>
          <span className={`${styles.roleBadge} ${styles[invitation.role]}`}>
            {invitation.role === 'subLeader' ? 'Sous-chef' : 'Membre'}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.label}>Expire dans:</span>
          <span className={styles.value}>
            {daysRemaining()} jour{daysRemaining() > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {invitation.message && (
        <div className={styles.message}>
          <p className={styles.messageLabel}>Message:</p>
          <p className={styles.messageText}>"{invitation.message}"</p>
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={handleDecline}
          disabled={loading}
          className={`${styles.btn} ${styles.btnDecline}`}
        >
          {loading ? 'Chargement...' : 'Refuser'}
        </button>
        <button
          onClick={handleAccept}
          disabled={loading}
          className={`${styles.btn} ${styles.btnAccept}`}
        >
          {loading ? 'Chargement...' : 'Accepter'}
        </button>
      </div>

      <div className={styles.footer}>
        <span className={styles.date}>Reçu le {formatDate(invitation.createdAt)}</span>
      </div>
    </div>
  );
}

export default InvitationCard;
