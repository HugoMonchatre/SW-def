import sequelize from '../config/database.js';

async function recreateTable() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données...\n');

    // 1. Sauvegarder les données existantes
    console.log('1. Sauvegarde des données existantes...');
    const [existingData] = await sequelize.query(`
      SELECT * FROM weekly_siege_availabilities;
    `);
    console.log(`   → ${existingData.length} lignes trouvées\n`);

    // 2. Supprimer l'ancienne table
    console.log('2. Suppression de l\'ancienne table...');
    await sequelize.query('DROP TABLE IF EXISTS weekly_siege_availabilities;');
    console.log('   → Table supprimée\n');

    // 3. Créer la nouvelle table avec le bon schéma
    console.log('3. Création de la nouvelle table...');
    await sequelize.query(`
      CREATE TABLE weekly_siege_availabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL REFERENCES guilds(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        week_start_date DATE NOT NULL,
        monday_available TINYINT(1) DEFAULT NULL,
        thursday_available TINYINT(1) DEFAULT NULL,
        monday_selected TINYINT(1) DEFAULT 0,
        thursday_selected TINYINT(1) DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);
    console.log('   → Table créée\n');

    // 4. Créer l'index composite unique
    console.log('4. Création de l\'index composite unique...');
    await sequelize.query(`
      CREATE UNIQUE INDEX weekly_siege_availabilities_guild_user_week
      ON weekly_siege_availabilities (guild_id, user_id, week_start_date);
    `);
    console.log('   → Index créé\n');

    // 5. Restaurer les données
    if (existingData.length > 0) {
      console.log('5. Restauration des données...');
      for (const row of existingData) {
        await sequelize.query(`
          INSERT INTO weekly_siege_availabilities
          (id, guild_id, user_id, week_start_date, monday_available, thursday_available,
           monday_selected, thursday_selected, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, {
          replacements: [
            row.id, row.guild_id, row.user_id, row.week_start_date,
            row.monday_available, row.thursday_available,
            row.monday_selected, row.thursday_selected,
            row.created_at, row.updated_at
          ]
        });
      }
      console.log(`   → ${existingData.length} lignes restaurées\n`);
    } else {
      console.log('5. Aucune donnée à restaurer\n');
    }

    console.log('✅ Table recréée avec succès !');
    console.log('   La contrainte unique est maintenant sur (guild_id, user_id, week_start_date)');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Erreur lors de la recréation de la table:', error);
    process.exit(1);
  }
}

recreateTable();
