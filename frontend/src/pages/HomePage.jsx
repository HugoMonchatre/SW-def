import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './HomePage.module.css';

function HomePage() {
  const { isAuthenticated, logout } = useAuthStore();
  const [isLightMode, setIsLightMode] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
  };

  return (
    <div className={`${styles.homePage} ${isLightMode ? styles.lightMode : ''}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>SW-DEF</div>
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>Fonctionnalités</a>
          <a href="#about" className={styles.navLink}>À propos</a>
          <Link to="/contact" className={styles.navLink}>Contact</Link>
        </nav>
        <div className={styles.headerActions}>
          <button onClick={toggleTheme} className={styles.themeBtn} title={isLightMode ? 'Mode sombre' : 'Mode clair'}>
            {isLightMode ? '🌙' : '☀️'}
          </button>
          {isAuthenticated ? (
            <button onClick={handleLogout} className={styles.loginBtn}>
              Se déconnecter
            </button>
          ) : (
            <Link to="/login" className={styles.loginBtn}>
              Se connecter
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroLabel}>Summoners War Defense Manager</span>
          <h1 className={styles.heroTitle}>
            Gérez vos défenses de guerre de guilde comme un pro
          </h1>
          <p className={styles.heroDescription}>
            Organisez vos défenses, coordonnez votre équipe et dominez le champ de bataille.
            SW-DEF est l'outil ultime pour les leaders de guilde.
          </p>
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className={styles.heroButton}
          >
            {isAuthenticated ? 'Accéder au Dashboard' : 'Commencer gratuitement'}
          </Link>
        </div>
        <div className={styles.heroImage}>
          <img src={isLightMode ? '/IndraLight.png' : '/IndraDark.png'} alt="Indra" />
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Fonctionnalités</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🏰</div>
              <h3>Gestion des Tours</h3>
              <p>Assignez jusqu'à 5 défenses par tour et visualisez votre stratégie en temps réel</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👥</div>
              <h3>Collaboration</h3>
              <p>Leaders et sous-chefs peuvent gérer les défenses, les membres consultent</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📝</div>
              <h3>Mémos par Tour</h3>
              <p>Ajoutez des notes stratégiques visibles par toute la guilde</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
