import sequelize from '../config/database.js';

const COLUMNS = [
  { name: 'rep_unit_image',  sql: 'VARCHAR(255)' },
  { name: 'efficiency_stats', sql: 'TEXT' },
];

async function migrate() {
  try {
    await sequelize.authenticate();
    for (const col of COLUMNS) {
      try {
        await sequelize.query(`ALTER TABLE sw_data ADD COLUMN ${col.name} ${col.sql};`);
        console.log(`Colonne ${col.name} ajoutée.`);
      } catch (err) {
        if (err.message?.includes('duplicate column name')) {
          console.log(`Colonne ${col.name} déjà présente.`);
        } else {
          throw err;
        }
      }
    }
    console.log('Migration terminée.');
  } catch (error) {
    console.error('Erreur :', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
