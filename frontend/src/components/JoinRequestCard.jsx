import styles from './JoinRequestCard.module.css';

function JoinRequestCard({ request, onAccept, onReject }) {
  return (
    <div className={styles.joinRequestCard}>
      <div className={styles.joinRequestInfo}>
        {request.user.avatar ? (
          <img src={request.user.avatar} alt={request.user.name} className={styles.avatar} />
        ) : (
          <div className={styles.avatar}>
            {request.user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className={styles.memberName}>{request.user.name}</div>
          <div className={styles.memberEmail}>@{request.user.username || request.user.name}</div>
          {request.message && (
            <div className={styles.joinRequestMessage}>"{request.message}"</div>
          )}
          <div className={styles.joinRequestDate}>
            {new Date(request.requestedAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
      <div className={styles.joinRequestActions}>
        <button
          className={styles.btnAccept}
          onClick={() => onAccept?.(request.user._id)}
        >
          Accepter
        </button>
        <button
          className={styles.btnReject}
          onClick={() => onReject?.(request.user._id)}
        >
          Refuser
        </button>
      </div>
    </div>
  );
}

export default JoinRequestCard;
