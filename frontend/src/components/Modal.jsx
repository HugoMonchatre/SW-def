import styles from './Modal.module.css';

function Modal({ isOpen, onClose, title, children, actions }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
        {actions && (
          <div className={styles.actions}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ message, type = 'success', isVisible, onClose }) {
  if (!isVisible) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.toastIcon}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span className={styles.toastMessage}>{message}</span>
      <button className={styles.toastClose} onClick={onClose}>&times;</button>
    </div>
  );
}

// Confirm dialog component
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmer', cancelText = 'Annuler', variant = 'danger' }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmIcon}>
          {variant === 'danger' ? '⚠️' : variant === 'success' ? '✓' : '?'}
        </div>
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button className={styles.btnCancel} onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`${styles.btnConfirm} ${styles[variant]}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export { Modal, Toast, ConfirmDialog };
