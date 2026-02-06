import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

import sequelize from '../config/database.js';
import Monster from '../models/Monster.js';

const BESTIARY_PATH = join(__dirname, '..', 'data', 'swarfarm', 'bestiary.json');

const seedMonsters = async () => {
  try {
    await sequelize.authenticate();
    await Monster.sync();
    console.log('Connected to database');

    const raw = readFileSync(BESTIARY_PATH, 'utf-8');
    const monsters = JSON.parse(raw);
    console.log(`Loaded ${monsters.length} monsters from bestiary.json`);

    let inserted = 0;
    for (const monster of monsters) {
      await Monster.upsert(monster, { conflictFields: ['com2us_id'] });
      inserted++;
      if (inserted % 500 === 0) {
        console.log(`  ${inserted}/${monsters.length}...`);
      }
    }

    console.log(`\nDone! ${inserted} monsters seeded from local data.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding monsters:', error.message);
    process.exit(1);
  }
};

seedMonsters();
