import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import styles from './Navbar.module.css';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          SW-def
        </Link>

        <div className={styles.navLinks}>
          {!isAuthenticated ? (
            <>
              <Link to="/" className={styles.link}>Accueil</Link>
              <button
                onClick={toggleTheme}
                className={styles.themeToggle}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <Link to="/login" className={styles.btnPrimary}>Connexion</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className={styles.link}>Dashboard</Link>
              <Link to="/guilds" className={styles.link}>Guilde</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className={styles.link}>Admin</Link>
              )}
              <button
                onClick={toggleTheme}
                className={styles.themeToggle}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <span className={styles.userName}>{user?.name}</span>
              <button onClick={handleLogout} className={styles.btnOutline}>
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
