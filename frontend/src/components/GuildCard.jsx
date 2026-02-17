import styles from './GuildCard.module.css';

function GuildCard({
  guild,
  isPending = false,
  canJoin = false,
  onJoinRequest,
  onCancelRequest,
  onClick
}) {
  return (
    <div className={styles.guildCard} onClick={() => onClick?.(guild.id)} style={onClick ? { cursor: 'pointer' } : {}}>
      {guild.logo && (
        <div className={styles.guildCardLogo}>
          <img src={guild.logo} alt={guild.name} />
        </div>
      )}
      <div className={styles.guildCardHeader}>
        <h3>{guild.name}</h3>
        <div className={styles.memberCount}>
          {guild.members.length}/{guild.maxMembers}
        </div>
      </div>
      <p className={styles.guildCardDescription}>
        {guild.description || 'Aucune description'}
      </p>
      <div className={styles.guildCardFooter}>
        <span className={styles.leaderBadge}>
          👑 {guild.leader.name}
        </span>
      </div>
      {canJoin && guild.members.length < guild.maxMembers && (
        <div className={styles.guildCardActions} onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <button
              className={styles.btnPending}
              onClick={() => onCancelRequest?.(guild.id)}
            >
              Demande en attente ✕
            </button>
          ) : (
            <button
              className={styles.btnJoin}
              onClick={() => onJoinRequest?.(guild)}
            >
              Demander à rejoindre
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default GuildCard;
