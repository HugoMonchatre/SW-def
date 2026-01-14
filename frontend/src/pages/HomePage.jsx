import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './HomePage.module.css';

function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Bienvenue sur SW-def</h1>
          <p className={styles.subtitle}>
            Votre plateforme de gestion sécurisée et moderne
          </p>
          <div className={styles.heroButtons}>
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className={styles.btnPrimary}
            >
              {isAuthenticated ? 'Dashboard' : 'Commencer'}
            </Link>
            <a href="#features" className={styles.btnOutline}>
              En savoir plus
            </a>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Nos Fonctionnalités</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔐</div>
              <h3>Connexion Sécurisée</h3>
              <p>Connectez-vous facilement avec Discord, Google ou votre email</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👥</div>
              <h3>Gestion des Utilisateurs</h3>
              <p>Administration complète des droits et rôles utilisateurs</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <h3>Performance</h3>
              <p>Interface rapide et réactive pour une expérience optimale</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
