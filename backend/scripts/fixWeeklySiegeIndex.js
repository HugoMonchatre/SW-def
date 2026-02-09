import sequelize from '../config/database.js';

async function fixIndex() {
  try {
    console.log('Connexion à la base de données...');
    await sequelize.authenticate();

    console.log('Suppression de l\'ancien index unique sur week_start_date...');

    // Drop the incorrect unique index on week_start_date
    await sequelize.query(`
      DROP INDEX IF EXISTS weekly_siege_availabilities_week_start_date;
    `);

    console.log('Création du nouvel index composite unique...');

    // Create the correct composite unique index
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS weekly_siege_availabilities_unique_composite
      ON weekly_siege_availabilities (guild_id, user_id, week_start_date);
    `);

    console.log('✅ Index corrigé avec succès !');
    console.log('L\'index unique est maintenant sur (guild_id, user_id, week_start_date)');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Erreur lors de la correction de l\'index:', error);
    process.exit(1);
  }
}

fixIndex();
