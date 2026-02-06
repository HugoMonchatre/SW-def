import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let sequelize;

if (process.env.DATABASE_URL) {
  // Production: PostgreSQL on OVH
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  });
} else {
  // Development: SQLite local file
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: join(__dirname, '..', 'database.sqlite'),
    logging: false
  });
}

export default sequelize;
