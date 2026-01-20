import styles from './GuildHeader.module.css';

function GuildHeader({
  guild,
  canManage = false,
  isLeader = false,
  onAddMember,
  onEditGuild,
  onDeleteGuild,
  onLeaveGuild
}) {
  return (
    <div className={styles.guildHeader}>
      <div className={styles.guildHeaderMain}>
        {guild.logo && (
          <div className={styles.guildLogo}>
            <img src={guild.logo} alt={guild.name} />
          </div>
        )}
        <div>
          <h2>{guild.name}</h2>
          <p className={styles.guildDescription}>{guild.description || 'Aucune description'}</p>
          <div className={styles.guildInfo}>
            <span>👑 Leader: {guild.leader.name}</span>
            <span>⭐ Sous-chefs: {guild.subLeaders?.length || 0}/4</span>
            <span>👥 Membres: {guild.members.length}/{guild.maxMembers}</span>
          </div>
        </div>
      </div>
      <div className={styles.guildActions}>
        {canManage ? (
          <>
            <button
              className={styles.btnSecondary}
              onClick={onAddMember}
            >
              Ajouter un Membre
            </button>
            {isLeader && (
              <button
                className={styles.btnSecondary}
                onClick={onEditGuild}
              >
                Modifier la Guilde
              </button>
            )}
            <button
              className={styles.btnDanger}
              onClick={onDeleteGuild}
            >
              Supprimer la Guilde
            </button>
          </>
        ) : (
          <button
            className={styles.btnDanger}
            onClick={onLeaveGuild}
          >
            Quitter la Guilde
          </button>
        )}
      </div>
    </div>
  );
}

export default GuildHeader;
