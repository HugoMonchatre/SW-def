import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Guild from './Guild.js';
import Defense from './Defense.js';
import Offense from './Offense.js';
import Invitation from './Invitation.js';
import GuildInventory from './GuildInventory.js';
import Tower from './Tower.js';
import Monster from './Monster.js';
import Siege from './Siege.js';
import WeeklySiegeAvailability from './WeeklySiegeAvailability.js';
import Notification from './Notification.js';

// ── Junction Tables ──

const GuildMember = sequelize.define('GuildMember', {
  guildId: { type: DataTypes.INTEGER, primaryKey: true },
  userId: { type: DataTypes.INTEGER, primaryKey: true }
}, { tableName: 'guild_members', underscored: true, timestamps: false });

const GuildSubLeader = sequelize.define('GuildSubLeader', {
  guildId: { type: DataTypes.INTEGER, primaryKey: true },
  userId: { type: DataTypes.INTEGER, primaryKey: true }
}, { tableName: 'guild_sub_leaders', underscored: true, timestamps: false });

const GuildJoinRequest = sequelize.define('GuildJoinRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  guildId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, defaultValue: '' },
  requestedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'guild_join_requests', underscored: true, timestamps: false });

const OffenseDefense = sequelize.define('OffenseDefense', {
  offenseId: { type: DataTypes.INTEGER, primaryKey: true },
  defenseId: { type: DataTypes.INTEGER, primaryKey: true }
}, { tableName: 'offense_defenses', underscored: true, timestamps: false });

const TowerDefense = sequelize.define('TowerDefense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  towerId: { type: DataTypes.INTEGER, allowNull: false },
  defenseId: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'tower_defenses', underscored: true, timestamps: false });

const SiegeRegistration = sequelize.define('SiegeRegistration', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  siegeId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'available', validate: { isIn: [['available', 'unavailable']] } },
  selected: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'siege_registrations',
  underscored: true,
  indexes: [{ unique: true, fields: ['siege_id', 'user_id'] }]
});

// ── Associations ──

// Guild <-> Leader (User)
Guild.belongsTo(User, { as: 'leader', foreignKey: 'leaderId' });

// Guild <-> Members (many-to-many through GuildMember)
Guild.belongsToMany(User, { through: GuildMember, as: 'members', foreignKey: 'guildId', otherKey: 'userId' });
User.belongsToMany(Guild, { through: GuildMember, as: 'memberGuilds', foreignKey: 'userId', otherKey: 'guildId' });

// Guild <-> SubLeaders (many-to-many through GuildSubLeader)
Guild.belongsToMany(User, { through: GuildSubLeader, as: 'subLeaders', foreignKey: 'guildId', otherKey: 'userId' });
User.belongsToMany(Guild, { through: GuildSubLeader, as: 'subLeaderGuilds', foreignKey: 'userId', otherKey: 'guildId' });

// Guild <-> JoinRequests
Guild.hasMany(GuildJoinRequest, { as: 'joinRequests', foreignKey: 'guildId' });
GuildJoinRequest.belongsTo(Guild, { foreignKey: 'guildId' });
GuildJoinRequest.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// User -> Guild (user belongs to a guild)
User.belongsTo(Guild, { as: 'guild', foreignKey: 'guildId' });

// Defense associations
Defense.belongsTo(Guild, { foreignKey: 'guildId' });
Defense.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Guild.hasMany(Defense, { foreignKey: 'guildId' });

// Offense associations
Offense.belongsTo(Guild, { foreignKey: 'guildId' });
Offense.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Offense.belongsToMany(Defense, { through: OffenseDefense, as: 'defenses', foreignKey: 'offenseId', otherKey: 'defenseId' });
Defense.belongsToMany(Offense, { through: OffenseDefense, as: 'offenses', foreignKey: 'defenseId', otherKey: 'offenseId' });

// Invitation associations
Invitation.belongsTo(Guild, { as: 'guild', foreignKey: 'guildId' });
Invitation.belongsTo(User, { as: 'invitedUser', foreignKey: 'invitedUserId' });
Invitation.belongsTo(User, { as: 'invitedBy', foreignKey: 'invitedById' });

// GuildInventory associations
GuildInventory.belongsTo(Guild, { foreignKey: 'guildId' });
GuildInventory.belongsTo(User, { as: 'uploadedBy', foreignKey: 'uploadedById' });

// Tower associations
Tower.belongsTo(Guild, { foreignKey: 'guildId' });
Tower.hasMany(TowerDefense, { as: 'towerDefenses', foreignKey: 'towerId' });
TowerDefense.belongsTo(Tower, { foreignKey: 'towerId' });
TowerDefense.belongsTo(Defense, { as: 'defense', foreignKey: 'defenseId' });

// Siege associations
Siege.belongsTo(Guild, { foreignKey: 'guildId' });
Siege.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Guild.hasMany(Siege, { foreignKey: 'guildId' });
Siege.hasMany(SiegeRegistration, { as: 'registrations', foreignKey: 'siegeId' });
SiegeRegistration.belongsTo(Siege, { foreignKey: 'siegeId' });
SiegeRegistration.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Weekly siege availability associations
WeeklySiegeAvailability.belongsTo(Guild, { foreignKey: 'guildId' });
WeeklySiegeAvailability.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Guild.hasMany(WeeklySiegeAvailability, { as: 'weeklyAvailabilities', foreignKey: 'guildId' });
User.hasMany(WeeklySiegeAvailability, { as: 'weeklyAvailabilities', foreignKey: 'userId' });

// Notification associations
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });

export {
  User,
  Guild,
  Defense,
  Offense,
  Invitation,
  GuildInventory,
  Tower,
  Monster,
  GuildMember,
  GuildSubLeader,
  GuildJoinRequest,
  OffenseDefense,
  TowerDefense,
  Siege,
  SiegeRegistration,
  WeeklySiegeAvailability,
  Notification
};

export default sequelize;
