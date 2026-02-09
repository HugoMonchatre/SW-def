import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNotificationStore } from '../store/notificationStore';
import styles from './NotificationList.module.css';

function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { decrementUnreadCount, resetUnreadCount } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/my-notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      decrementUnreadCount(); // Update navbar badge
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetUnreadCount(); // Reset navbar badge to 0
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'siege_selection':
        return '🗡️';
      case 'invitation':
        return '📨';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className={styles.container}>
        <h2>🔔 Notifications</h2>
        <p className={styles.loading}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🔔 Notifications</h2>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className={styles.markAllBtn}>
            Tout marquer comme lu ({unreadCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className={styles.emptyMessage}>Aucune notification</p>
      ) : (
        <div className={styles.notificationsList}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`${styles.notificationItem} ${notification.isRead ? styles.read : styles.unread}`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className={styles.icon}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className={styles.content}>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.timestamp}>
                  {formatTimestamp(notification.createdAt)}
                </span>
              </div>
              {!notification.isRead && <div className={styles.unreadDot}></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationList;
