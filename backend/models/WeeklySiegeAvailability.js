import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WeeklySiegeAvailability = sequelize.define('WeeklySiegeAvailability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guildId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  weekStartDate: {
    type: DataTypes.DATEONLY, // Format: YYYY-MM-DD (Saturday of the week)
    allowNull: false
  },
  mondayAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: null // null = not answered, true = available, false = unavailable
  },
  thursdayAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: null
  },
  mondaySelected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // For leaders to mark who's selected
  },
  thursdaySelected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'weekly_siege_availabilities',
  underscored: true,
  indexes: [
    { unique: true, fields: ['guild_id', 'user_id', 'week_start_date'] }
  ]
});

export default WeeklySiegeAvailability;
