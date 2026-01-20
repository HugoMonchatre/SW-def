import MemberCard from './MemberCard';
import styles from './MembersList.module.css';

function MembersList({
  guild,
  canManage = false,
  canPromote = false,
  onPromote,
  onDemote,
  onRemove
}) {
  const regularMembers = guild.members.filter(member =>
    member._id !== guild.leader._id &&
    !guild.subLeaders?.some(s => s._id === member._id)
  );

  const canPromoteMore = (guild.subLeaders?.length || 0) < 4;

  return (
    <div className={styles.membersSection}>
      <h3>Membres de la Guilde</h3>

      <div className={styles.hierarchy}>
        {/* Top Row: Leader + Sub-Leaders */}
        <div className={styles.leadershipRow}>
          <MemberCard
            member={guild.leader}
            role="leader"
          />

          {guild.subLeaders?.map(subLeader => (
            <MemberCard
              key={subLeader._id}
              member={subLeader}
              role="subLeader"
              canManage={canManage}
              onDemote={onDemote}
              onRemove={onRemove}
            />
          ))}
        </div>

        <hr className={styles.divider} />

        {/* Bottom Row: Regular Members */}
        <div className={styles.membersList}>
          {regularMembers.map(member => (
            <MemberCard
              key={member._id}
              member={member}
              role="member"
              canManage={canManage}
              canPromote={canPromote && canPromoteMore}
              onPromote={onPromote}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default MembersList;
