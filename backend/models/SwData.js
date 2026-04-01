import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// TEXT column with automatic JSON parse on read / stringify on write
function jsonCol(field, allowNull = true) {
  return {
    type: DataTypes.TEXT,
    allowNull,
    get() {
      const raw = this.getDataValue(field);
      if (raw == null) return null;
      if (typeof raw === 'object') return raw;
      try { return JSON.parse(raw); } catch { return null; }
    },
    set(val) {
      this.setDataValue(field, val == null ? null : JSON.stringify(val));
    },
  };
}

const SwData = sequelize.define('SwData', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:       { type: DataTypes.INTEGER, allowNull: false, unique: true },
  wizardId:     { type: DataTypes.INTEGER, allowNull: true },
  wizardName:   { type: DataTypes.STRING,  allowNull: true },
  wizardLevel:  { type: DataTypes.INTEGER, defaultValue: 0 },
  server:       { type: DataTypes.STRING,  allowNull: true },
  lastUpload:   { type: DataTypes.DATE,    allowNull: true },
  unitCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
  runeCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
  repUnitImage: { type: DataTypes.STRING,  allowNull: true },

  bestRuneSets:      jsonCol('bestRuneSets'),
  units:             jsonCol('units'),
  fiveStarLD:        jsonCol('fiveStarLD'),
  fourStarElemDupes: jsonCol('fourStarElemDupes'),
  history:           jsonCol('history'),
  efficiencyStats:   jsonCol('efficiencyStats'),
}, {
  tableName: 'sw_data',
  underscored: true,
  timestamps: false,
});

export default SwData;
