import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './AdminPage.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers(users.map(u =>
        u._id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/users/${userId}/status`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers(users.map(u =>
        u._id === userId ? { ...u, isActive: !currentStatus } : u
      ));
    } catch (error) {
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(users.filter(u => u._id !== userId));
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Administration</h1>
          <p className={styles.subtitle}>Gestion des utilisateurs et du système</p>
        </div>

        <div className={styles.usersSection}>
          <h2>Gestion des Utilisateurs</h2>

          {loading ? (
            <div className={styles.loading}>Chargement...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Provider</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className={styles.userCell}>
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className={styles.avatarSmall} />
                          ) : (
                            <div className={styles.avatarSmall}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {u.name}
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td style={{ textTransform: 'capitalize' }}>{u.provider}</td>
                      <td>
                        {user._id === u._id ? (
                          <span className={`${styles.badge} ${styles[u.role]}`}>
                            {u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRole(u._id, e.target.value)}
                            className={styles.select}
                          >
                            <option value="user">User</option>
                            <option value="guild_leader">Guild Leader</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${u.isActive ? styles.active : styles.inactive}`}>
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        {user._id !== u._id && (
                          <div className={styles.actions}>
                            <button
                              onClick={() => toggleUserStatus(u._id, u.isActive)}
                              className={styles.btnAction}
                              title={u.isActive ? 'Désactiver' : 'Activer'}
                            >
                              {u.isActive ? '🔒' : '🔓'}
                            </button>
                            <button
                              onClick={() => deleteUser(u._id)}
                              className={`${styles.btnAction} ${styles.danger}`}
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
