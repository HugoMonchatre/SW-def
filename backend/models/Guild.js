import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Guild = sequelize.define('Guild', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  leaderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  maxMembers: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() { return this.id; }
  }
}, {
  tableName: 'guilds',
  underscored: true
});

Guild.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

export default Guild;
