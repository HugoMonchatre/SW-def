import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Monster = sequelize.define('Monster', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  com2us_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  element: {
    type: DataTypes.STRING,
    allowNull: false
  },
  natural_stars: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  image_filename: {
    type: DataTypes.STRING,
    allowNull: true
  },
  obtainable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  awaken_level: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  leader_skill: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'monsters',
  underscored: true,
  timestamps: false
});

Monster.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.image = values.image_filename
    ? `https://swarfarm.com/static/herders/images/monsters/${values.image_filename}`
    : null;
  return values;
};

export default Monster;
