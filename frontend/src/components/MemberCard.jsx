import styles from './MemberCard.module.css';

function MemberCard({
  member,
  role = 'member', // 'leader', 'subLeader', 'member'
  canManage = false,
  canPromote = false,
  onPromote,
  onDemote,
  onRemove
}) {
  const isLeader = role === 'leader';
  const isSubLeader = role === 'subLeader';

  const cardClass = isLeader
    ? styles.leaderCard
    : isSubLeader
      ? styles.subLeaderCard
      : styles.memberCard;

  const avatarClass = isLeader ? styles.avatarLarge : styles.avatar;

  return (
    <div className={cardClass}>
      <div className={styles.memberInfo}>
        {member.avatar ? (
          <img src={member.avatar} alt={member.name} className={avatarClass} />
        ) : (
          <div className={avatarClass}>
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className={styles.memberName}>
            {member.name}
            {isLeader && <span className={styles.crownBadge}>👑</span>}
            {isSubLeader && <span className={styles.subLeaderBadge}>⭐</span>}
          </div>
          <div className={styles.memberEmail}>@{member.username || member.name}</div>
        </div>
      </div>
      {canManage && !isLeader && (
        <div className={styles.memberActions}>
          {isSubLeader && onDemote && (
            <button
              className={styles.btnDemote}
              onClick={() => onDemote(member._id)}
              title="Rétrograder"
            >
              ↓
            </button>
          )}
          {!isSubLeader && canPromote && onPromote && (
            <button
              className={styles.btnPromote}
              onClick={() => onPromote(member._id)}
              title="Promouvoir en sous-chef"
            >
              ⭐
            </button>
          )}
          {onRemove && (
            <button
              className={styles.btnRemove}
              onClick={() => onRemove(member._id)}
              title="Retirer de la guilde"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MemberCard;
