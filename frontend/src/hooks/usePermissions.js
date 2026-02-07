export function usePermissions(guild, user) {
  const isLeader = guild?.leader?.id === user?.id;
  const isSubLeader = guild?.subLeaders?.some(s => s.id === user?.id) || false;
  const isAdmin = user?.role === 'admin';

  const canManage = isLeader || isSubLeader || isAdmin;
  const canManageGuild = isLeader || isAdmin;

  const canManageItem = (item) => {
    if (!user || !guild) return false;
    if (item?.createdBy?.id === user.id) return true;
    return canManage;
  };

  return {
    isLeader,
    isSubLeader,
    isAdmin,
    canManage,
    canManageGuild,
    canManageItem,
  };
}
