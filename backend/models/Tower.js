import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Tower = sequelize.define('Tower', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  towerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guildId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  memo: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  tableName: 'towers',
  underscored: true,
  indexes: [
    { unique: true, fields: ['tower_id', 'guild_id'] }
  ]
});

Tower.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

export default Tower;
