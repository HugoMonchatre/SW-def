import sequelize from '../config/database.js';

async function migrate() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`ALTER TABLE sw_data ADD COLUMN rep_unit_image VARCHAR(255);`);
    console.log('Colonne rep_unit_image ajoutée avec succès.');
  } catch (error) {
    if (error.message?.includes('duplicate column name')) {
      console.log('Colonne déjà présente, rien à faire.');
    } else {
      console.error('Erreur :', error.message);
      process.exit(1);
    }
  } finally {
    await sequelize.close();
  }
}

migrate();
