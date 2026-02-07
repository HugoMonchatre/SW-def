import { useState } from 'react';
import { Modal } from './Modal';
import styles from './AddMemberModal.module.css';

const USERS_PER_PAGE = 30;

function AddMemberModal({ isOpen, onClose, users, guildMembers, onAddMember }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter available users (not already in guild)
  const availableUsers = users.filter(u =>
    !u.guild && !guildMembers?.some(m => m.id === u.id)
  );

  // Filter by search query
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClose = () => {
    setSearchQuery('');
    setCurrentPage(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter un Membre">
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
            <div key={u.id} className={styles.userItem}>
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
                onClick={() => onAddMember(u.id)}
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
  );
}

export default AddMemberModal;
