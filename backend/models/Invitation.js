import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Invitation = sequelize.define('Invitation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guildId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  invitedUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  invitedById: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'member',
    validate: { isIn: [['member', 'subLeader']] }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'accepted', 'declined']] }
  },
  message: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  expiresAt: {
    type: DataTypes.DATE,
    defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  tableName: 'invitations',
  underscored: true
});

Invitation.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

export default Invitation;
