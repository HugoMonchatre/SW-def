import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Defense = sequelize.define('Defense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guildId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  monsters: {
    type: DataTypes.JSON,
    allowNull: false
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() { return this.id; }
  }
}, {
  tableName: 'defenses',
  underscored: true
});

Defense.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

export default Defense;
