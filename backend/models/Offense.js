import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Offense = sequelize.define('Offense', {
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
  generalInstructions: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  votesUp: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  votesDown: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'offenses',
  underscored: true
});

Offense.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  values.votes = { up: values.votesUp, down: values.votesDown };
  values.voteScore = (values.votesUp || 0) - (values.votesDown || 0);
  return values;
};

export default Offense;
