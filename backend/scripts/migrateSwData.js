// Migration: move User.swData JSON blob → sw_data table
import '../config/env.js';
import sequelize from '../config/database.js';
import '../models/index.js';
import User from '../models/User.js';
import SwData from '../models/SwData.js';

async function migrate() {
  await sequelize.authenticate();
  await sequelize.sync(); // creates sw_data table if not exists

  const users = await User.findAll();
  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.swData) { skipped++; continue; }

    const d = user.swData;
    await SwData.upsert({
      userId:           user.id,
      wizardId:         d.wizardId        ?? null,
      wizardName:       d.wizardName      ?? null,
      wizardLevel:      d.wizardLevel     ?? 0,
      server:           d.server          ?? null,
      lastUpload:       d.lastUpload      ?? null,
      unitCount:        d.unitCount       ?? 0,
      runeCount:        d.runeCount       ?? 0,
      bestRuneSets:     d.bestRuneSets    ?? null,
      units:            d.units           ?? null,
      fiveStarLD:       d.fiveStarLD      ?? null,
      fourStarElemDupes: d.fourStarElemDupes ?? null,
      history:          d.history         ?? null,
    });
    migrated++;
  }

  console.log(`Migration done: ${migrated} migrated, ${skipped} skipped (no swData).`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
