import sequelize from '../config/database.js';

async function checkIndexes() {
  try {
    await sequelize.authenticate();

    console.log('=== Index actuels sur weekly_siege_availabilities ===\n');

    const [indexes] = await sequelize.query(`
      SELECT name, sql FROM sqlite_master
      WHERE type='index' AND tbl_name='weekly_siege_availabilities';
    `);

    console.log('Indexes trouvés:');
    indexes.forEach(idx => {
      console.log(`- ${idx.name}`);
      console.log(`  SQL: ${idx.sql || 'auto-créé'}\n`);
    });

    console.log('\n=== Données dans la table ===');
    const [rows] = await sequelize.query(`
      SELECT COUNT(*) as count FROM weekly_siege_availabilities;
    `);
    console.log(`Nombre de lignes: ${rows[0].count}\n`);

    await sequelize.close();
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

checkIndexes();
