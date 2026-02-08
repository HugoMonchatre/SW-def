import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GuildInventory = sequelize.define('GuildInventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guildId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  players: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  uploadedById: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  monsterColumns: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'guild_inventories',
  underscored: true
});

GuildInventory.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  return values;
};

export default GuildInventory;
