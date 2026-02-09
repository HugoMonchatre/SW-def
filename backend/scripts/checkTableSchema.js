import sequelize from '../config/database.js';

async function checkSchema() {
  try {
    await sequelize.authenticate();

    console.log('=== Schéma de la table weekly_siege_availabilities ===\n');

    const [schema] = await sequelize.query(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='weekly_siege_availabilities';
    `);

    console.log(schema[0].sql);
    console.log('\n');

    await sequelize.close();
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

checkSchema();
