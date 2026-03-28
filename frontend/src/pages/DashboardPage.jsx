import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import InvitationCard from '../components/InvitationCard';
import WeeklySiegeWidget from '../components/WeeklySiegeWidget';
import NotificationList from '../components/NotificationList';
import { Modal } from '../components/Modal';
import styles from './DashboardPage.module.css';

function Sparkline({ values, color = '#a855f7' }) {
  if (!values || values.length < 2) {
    return <div className={styles.sparklineFlatLine} style={{ background: color }} />;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 120, h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.sparkline} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MonsterCard({ monster }) {
  return (
    <div className={styles.monsterCard} title={monster.name}>
      {monster.image ? (
        <img src={monster.image} alt={monster.name} />
      ) : (
        <div className={styles.monsterPlaceholder}>{monster.name?.slice(0, 2)}</div>
      )}
      {monster.count > 1 && <span className={styles.monsterCount}>×{monster.count}</span>}
    </div>
  );
}

const ELEMENT_ORDER = { Fire: 0, Water: 1, Wind: 2, Light: 3, Dark: 4 };
const sortMonsters = (list) => [...list].sort((a, b) => {
  const eA = ELEMENT_ORDER[a.element] ?? 99;
  const eB = ELEMENT_ORDER[b.element] ?? 99;
  if (eA !== eB) return eA - eB;
  if ((b.natural_stars || 0) !== (a.natural_stars || 0)) return (b.natural_stars || 0) - (a.natural_stars || 0);
  return (b.count || 1) - (a.count || 1);
});

const SET_META = {
  swift:   { label: 'swift',  color: '#3b82f6' },
  violent: { label: 'vio',    color: '#7c3aed' },
  despair: { label: 'desper', color: '#a855f7' },
};

const BASE_SPEED = 100;

const SOURCE_LABEL = { main: 'main', prefix: 'innate', sub: 'sub' };

function RuneDetailModal({ runes, setName, color, onClose }) {
  const sorted = [...runes].sort((a, b) => a.slot - b.slot);
  return (
    <div className={styles.runeModalOverlay} onClick={onClose}>
      <div className={styles.runeModal} onClick={e => e.stopPropagation()}>
        <div className={styles.runeModalHeader}>
          <span className={styles.swiftBadge} style={{ borderColor: color, color }}>{setName}</span>
          <button className={styles.runeModalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.runeModalList}>
          {sorted.map(rune => (
            <div key={rune.id} className={styles.runeModalRow}>
              <div className={styles.runeModalSlot}>
                <span className={styles.runeSlotNum}>S{rune.slot}</span>
                {rune.ancient && <span className={styles.runeAncient}>A</span>}
                <span className={styles.runeSetBadgeSmall} style={{ borderColor: color, color }}>{rune.set}</span>
              </div>
              <div className={styles.runeModalStats}>
                {rune.speedBreakdown.map((s, i) => (
                  <span key={i} className={styles.runeStatChip}>
                    <span className={styles.runeStatSource}>{SOURCE_LABEL[s.source]}</span>
                    <span className={styles.runeStatVal}>+{s.value}</span>
                    {s.source === 'sub' && s.maxGrind > 0 && (
                      <span className={styles.runeStatMax}>(max +{s.value - s.grind + s.maxGrind})</span>
                    )}
                  </span>
                ))}
                {rune.speedBreakdown.length === 0 && <span className={styles.runeStatEmpty}>0 spd</span>}
              </div>
              <div className={styles.runeModalTotal}>+{rune.speed}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuneSetRows({ bestRuneSets }) {
  if (!bestRuneSets) return null;
  const [openSet, setOpenSet] = useState(null);

  const speedCards = [
    { key: 'swift',       total: bestRuneSets.swift       > 0 ? BASE_SPEED + bestRuneSets.swift       : null, max: bestRuneSets.swiftMax       > 0 ? BASE_SPEED + bestRuneSets.swiftMax       : null, runes: bestRuneSets.swiftRunes       || [], ...SET_META.swift },
    { key: 'violent',     total: bestRuneSets.violent     > 0 ? BASE_SPEED + bestRuneSets.violent     : null, max: bestRuneSets.violentMax     > 0 ? BASE_SPEED + bestRuneSets.violentMax     : null, runes: bestRuneSets.violentRunes     || [], ...SET_META.violent },
    { key: 'despair',     total: bestRuneSets.despair     > 0 ? BASE_SPEED + bestRuneSets.despair     : null, max: bestRuneSets.despairMax     > 0 ? BASE_SPEED + bestRuneSets.despairMax     : null, runes: bestRuneSets.despairRunes     || [], ...SET_META.despair },
  ];
  const willCards = [
    { key: 'swiftWill',   total: bestRuneSets.swiftWill   > 0 ? BASE_SPEED + bestRuneSets.swiftWill   : null, max: bestRuneSets.swiftWillMax   > 0 ? BASE_SPEED + bestRuneSets.swiftWillMax   : null, runes: bestRuneSets.swiftWillRunes   || [], ...SET_META.swift,   suffix: '+will' },
    { key: 'violentWill', total: bestRuneSets.violentWill > 0 ? BASE_SPEED + bestRuneSets.violentWill : null, max: bestRuneSets.violentWillMax > 0 ? BASE_SPEED + bestRuneSets.violentWillMax : null, runes: bestRuneSets.violentWillRunes || [], ...SET_META.violent, suffix: '+will' },
    { key: 'despairWill', total: bestRuneSets.despairWill > 0 ? BASE_SPEED + bestRuneSets.despairWill : null, max: bestRuneSets.despairWillMax > 0 ? BASE_SPEED + bestRuneSets.despairWillMax : null, runes: bestRuneSets.despairWillRunes || [], ...SET_META.despair, suffix: '+will' },
  ];

  const activeCard = [...speedCards, ...willCards].find(s => s.key === openSet);

  const renderCard = (s) => (
    <div key={s.key} className={`${styles.swiftCard} ${s.runes.length > 0 ? styles.swiftCardClickable : ''}`}
      onClick={() => s.runes.length > 0 && setOpenSet(openSet === s.key ? null : s.key)}>
      <div className={styles.swiftBadgeRow}>
        <span className={styles.swiftBadge} style={{ borderColor: s.color, color: s.color }}>{s.label}</span>
        {s.suffix && <span className={styles.swiftBadgeWill}>+will</span>}
      </div>
      {s.total !== null ? (
        <div className={styles.swiftNumbers}>
          <span className={styles.swiftTotal}>{s.total}</span>
          {s.max !== null && <span className={styles.swiftMax}>({s.max})</span>}
        </div>
      ) : (
        <span className={styles.swiftEmpty}>—</span>
      )}
    </div>
  );

  return (
    <div className={styles.runeSetsSection}>
      <p className={styles.runeSetsLabel}>sets les plus rapides b100 :</p>
      <div className={styles.speedCardsRow}>{speedCards.map(renderCard)}</div>
      <div className={styles.speedCardsRow}>{willCards.map(renderCard)}</div>
      {openSet && activeCard && (
        <RuneDetailModal
          runes={activeCard.runes}
          setName={activeCard.label + (activeCard.suffix ? ' +will' : '')}
          color={activeCard.color}
          onClose={() => setOpenSet(null)}
        />
      )}
    </div>
  );
}

// ── Event countdown helpers ──
const EVENTS_CONFIG = [
  { key: 'siege',       label: 'Siège',       icon: '⚔️',  days: [1, 4], hour: 18, color: '#6366f1' },
  { key: 'labyrinthe',  label: 'Labyrinthe',  icon: '🌀',  days: [3, 6], hour: 10, color: '#14b8a6' },
  { key: 'gvworld',     label: 'GvWorld',     icon: '🌍',  days: [5],    hour: 10, color: '#f97316' },
  { key: 'subjugation', label: 'Subjugation', icon: '👹',  days: [0],    hour: 10, color: '#a855f7' },
];

function getNextEventDate(days, hour) {
  const now = new Date();
  let best = null;
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hour, 0, 0, 0);
    if (days.includes(candidate.getDay()) && candidate > now) {
      if (!best || candidate < best) best = candidate;
    }
  }
  return best;
}

function formatCountdown(target) {
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) return 'en cours';
  const totalH = Math.floor(diff / 3600000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  if (d > 0) return `dans ${d}j ${h}h`;
  return `dans ${h}h`;
}

function formatEventDate(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function EventCard({ event }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const next = getNextEventDate(event.days, event.hour);
  return (
    <div className={styles.eventCard} style={{ '--event-color': event.color }}>
      <div className={styles.eventIcon}>{event.icon}</div>
      <div className={styles.eventInfo}>
        <div className={styles.eventLabel}>{event.label}</div>
        {next ? (
          <>
            <div className={styles.eventDate}>{formatEventDate(next)}</div>
            <div className={styles.eventCountdown}>{formatCountdown(next)}</div>
          </>
        ) : (
          <div className={styles.eventDate}>—</div>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const [userGuild, setUserGuild] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', avatar: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [swData, setSwData] = useState(null);
  const [monsters, setMonsters] = useState({ fiveStarLD: [], fourStarLD: [], fourStarElemDupes: [] });
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.guildId) fetchUserGuild();
    fetchInvitations();
    fetchSwData();
  }, [user]);

  const fetchSwData = async () => {
    try {
      const res = await api.get('/users/me/sw-data');
      setSwData(res.data.swData);
      if (res.data.swData) fetchMonsters();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMonsters = async () => {
    try {
      const res = await api.get('/users/me/monsters');
      setMonsters(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserGuild = async () => {
    try {
      const res = await api.get(`/guilds/${user.guildId}`);
      setUserGuild(res.data.guild);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/invitations/my-invitations');
      setInvitations(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvitationResponse = (id, status) => {
    setInvitations(invitations.filter(inv => inv.id !== id));
    if (status === 'accepted') window.location.reload();
  };

  const openProfileModal = () => {
    const avatar = user?.avatar && !user.avatar.includes('@') ? user.avatar : '';
    setProfileForm({ username: user?.username || user?.name || '', avatar, currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowProfileModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const res = await api.patch('/users/me/profile', { username: profileForm.username, avatar: profileForm.avatar });
      setUser(res.data.user);
      if (profileForm.newPassword) {
        await api.patch('/users/me/password', { currentPassword: profileForm.currentPassword, newPassword: profileForm.newPassword });
      }
      setShowProfileModal(false);
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setUploadStatus({ type: 'error', message: 'Le fichier doit être au format JSON' });
      return;
    }
    setLoading(true);
    setUploadStatus({ type: '', message: '' });
    try {
      const text = await file.text();
      let jsonData;
      try { jsonData = JSON.parse(text); } catch {
        setUploadStatus({ type: 'error', message: 'Le fichier JSON est invalide' });
        setLoading(false);
        return;
      }
      const res = await api.post('/users/me/sw-data', { jsonData });
      setSwData(res.data.swData);
      await fetchMonsters();
      setUploadStatus({ type: 'success', message: 'Données importées avec succès !' });
    } catch (e) {
      setUploadStatus({ type: 'error', message: e.response?.data?.error || 'Erreur lors de l\'import' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSwData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer vos données SW ?')) return;
    try {
      await api.delete('/users/me/sw-data');
      setSwData(null);
      setMonsters({ fiveStarLD: [], fourStarLD: [], fourStarElemDupes: [] });
    } catch (e) {
      setUploadStatus({ type: 'error', message: 'Erreur lors de la suppression' });
    }
  };

  const runeHistory = swData?.history?.map(h => h.runeCount) || [];
  const arteHistory = swData?.history?.map(h => h.artefactCount) || [];
  const uploadCount = swData?.history?.length || 0;

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.container}>

        {invitations.length > 0 && (
          <div className={styles.invitationsSection}>
            <h2>📨 Invitations en attente ({invitations.length})</h2>
            <div className={styles.invitationsList}>
              {invitations.map(inv => (
                <InvitationCard key={inv.id} invitation={inv} onResponse={handleInvitationResponse} />
              ))}
            </div>
          </div>
        )}

        {/* Main two-column card */}
        <div className={styles.mainCard}>

          {/* ── LEFT PANEL ── */}
          <div className={styles.leftPanel}>

            {/* Name + edit */}
            <div className={styles.nameRow}>
              <span className={styles.profileName}>{swData?.wizardName || user?.name}</span>
              <button className={styles.btnEdit} onClick={openProfileModal} title="Modifier le profil">✏️</button>
            </div>

            {/* Meta info */}
            <div className={styles.metaRow}>
              {swData?.server && <span>serveur : <strong>{swData.server}</strong></span>}
              <span>discord : <strong>{user?.username || user?.name}</strong></span>
            </div>

            {/* Three mini cards */}
            <div className={styles.miniCards}>
              <div className={styles.miniCard}>
                <div className={styles.avatarInner}>
                  {swData?.repUnitImage ? (
                    <img src={swData.repUnitImage} alt="rep" />
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <span>{user?.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div className={styles.miniCard}>
                <span className={styles.levelArrow}>↗</span>
                <span className={styles.levelValue}>{swData?.wizardLevel || '—'}</span>
                <span className={styles.levelLabel}>level</span>
              </div>
              <div className={styles.miniCard}>
                {userGuild?.logo ? (
                  <img src={userGuild.logo} alt={userGuild.name} className={styles.guildLogoImg} />
                ) : (
                  <span className={styles.guildIcon}>🏰</span>
                )}
              </div>
            </div>

            {/* Upload JSON button */}
            <label className={`${styles.uploadBtn} ${isDragging ? styles.dragging : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
            >
              <span>{loading ? 'Chargement...' : 'depot json'}</span>
              <span className={styles.uploadCount}>{uploadCount}/10</span>
              <input type="file" accept=".json" onChange={(e) => handleFileSelect(e.target.files[0])} style={{ display: 'none' }} ref={fileInputRef} disabled={loading} />
            </label>

            {uploadStatus.message && (
              <div className={`${styles.uploadStatus} ${styles[uploadStatus.type]}`}>{uploadStatus.message}</div>
            )}

            {/* Mini charts */}
            <div className={styles.chartsRow}>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <span className={styles.chartLabel}>runes</span>
                  <span className={styles.chartValue}>{swData?.runeCount || 0}</span>
                </div>
                <Sparkline values={runeHistory} color="#a855f7" />
              </div>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <span className={styles.chartLabel}>arte</span>
                  <span className={styles.chartValue}>{swData?.history?.[swData.history.length - 1]?.artefactCount || 0}</span>
                </div>
                <Sparkline values={arteHistory} color="#14b8a6" />
              </div>
            </div>

            {/* Rune sets */}
            <RuneSetRows bestRuneSets={swData?.bestRuneSets} />

            {/* Rune efficiency */}
            {swData?.efficiencyStats && (
              <div className={styles.efficiencySection}>
                <p className={styles.runeSetsLabel}>efficience des runes :</p>
                <div className={styles.efficiencyCards}>
                  {[
                    { label: '≥ 120%', value: swData.efficiencyStats.above120, color: '#a855f7' },
                    { label: '≥ 115%', value: swData.efficiencyStats.above115, color: '#6366f1' },
                    { label: '≥ 110%', value: swData.efficiencyStats.above110, color: '#3b82f6' },
                    { label: '≥ 105%', value: swData.efficiencyStats.above105, color: '#14b8a6' },
                    { label: '≥ 100%', value: swData.efficiencyStats.above100, color: '#38a169' },
                    { label: 'total',  value: swData.efficiencyStats.total,    color: 'var(--text-secondary)' },
                  ].map(s => (
                    <div key={s.label} className={styles.efficiencyCard}>
                      <span className={styles.efficiencyValue} style={{ color: s.color }}>{s.value}</span>
                      <span className={styles.efficiencyLabel}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {swData && (
              <button onClick={handleDeleteSwData} className={styles.btnDeleteData}>Supprimer les données</button>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className={styles.rightPanel}>

            <div className={styles.eventsGrid}>
              {EVENTS_CONFIG.map(ev => <EventCard key={ev.key} event={ev} />)}
            </div>

            <div className={styles.monsterSection}>
              <div className={styles.monsterSectionTitle}>5* ld</div>
              <div className={styles.monsterGrid}>
                {monsters.fiveStarLD.length > 0
                  ? sortMonsters(monsters.fiveStarLD).map((m, i) => <MonsterCard key={i} monster={m} />)
                  : <span className={styles.emptyMonsters}>—</span>}
              </div>
            </div>

            <div className={styles.monsterSection}>
              <div className={styles.monsterSectionTitle}>4* ld</div>
              <div className={styles.monsterGrid}>
                {monsters.fourStarLD.length > 0
                  ? sortMonsters(monsters.fourStarLD).map((m, i) => <MonsterCard key={i} monster={m} />)
                  : <span className={styles.emptyMonsters}>—</span>}
              </div>
            </div>

            <div className={styles.monsterSection}>
              <div className={styles.monsterSectionTitle}>dupe<br />elem</div>
              <div className={styles.monsterGrid}>
                {monsters.fourStarElemDupes.length > 0
                  ? sortMonsters(monsters.fourStarElemDupes).map((m, i) => <MonsterCard key={i} monster={m} />)
                  : <span className={styles.emptyMonsters}>—</span>}
              </div>
            </div>

          </div>
        </div>

        {user?.guildId && <WeeklySiegeWidget />}

        <NotificationList />

      </div>

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Modifier le profil"
        actions={
          <>
            <button type="button" onClick={() => setShowProfileModal(false)} className={styles.btnCancel} disabled={loading}>Annuler</button>
            <button type="submit" form="profileForm" className={styles.btnSubmit} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </>
        }
      >
        <form id="profileForm" onSubmit={handleProfileSubmit}>
          <div className={styles.formGroup}>
            <label>Pseudo</label>
            <input type="text" value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} required minLength="3" maxLength="30" />
          </div>
          <div className={styles.formGroup}>
            <label>URL de l'avatar</label>
            <input type="url" value={profileForm.avatar} onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder="https://exemple.com/avatar.jpg" />
          </div>
          {user?.provider === 'email' && (
            <>
              <div className={styles.formSeparator}>Changer le mot de passe (optionnel)</div>
              <div className={styles.formGroup}>
                <label>Mot de passe actuel</label>
                <input type="password" value={profileForm.currentPassword} onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Nouveau mot de passe</label>
                <input type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })} minLength="6" />
              </div>
              <div className={styles.formGroup}>
                <label>Confirmer le nouveau mot de passe</label>
                <input type="password" value={profileForm.confirmPassword} onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} minLength="6" />
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}

export default DashboardPage;
