import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SwData = sequelize.define('SwData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  wizardId: { type: DataTypes.INTEGER, allowNull: true },
  wizardName: { type: DataTypes.STRING, allowNull: true },
  wizardLevel: { type: DataTypes.INTEGER, defaultValue: 0 },
  server: { type: DataTypes.STRING, allowNull: true },
  lastUpload: { type: DataTypes.DATE, allowNull: true },
  unitCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  runeCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  bestRuneSets: { type: DataTypes.JSON, allowNull: true },
  units: { type: DataTypes.JSON, allowNull: true },
  fiveStarLD: { type: DataTypes.JSON, allowNull: true },
  fourStarElemDupes: { type: DataTypes.JSON, allowNull: true },
  history: { type: DataTypes.JSON, allowNull: true },
  repUnitImage: { type: DataTypes.STRING, allowNull: true },
  efficiencyStats: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'sw_data',
  underscored: true,
  timestamps: false
});

export default SwData;
