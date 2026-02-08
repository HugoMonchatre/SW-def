import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Siege = sequelize.define('Siege', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guildId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'open',
    validate: { isIn: [['open', 'closed', 'archived']] }
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  tableName: 'sieges',
  underscored: true
});

export default Siege;
