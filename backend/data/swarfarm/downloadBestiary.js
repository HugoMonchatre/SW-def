/**
 * One-time script to download the full SWARFarm bestiary to a local JSON file.
 * Run: node data/swarfarm/downloadBestiary.js
 *
 * After running, the data is stored in bestiary.json and the app
 * no longer depends on the SWARFarm API at runtime.
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SWARFARM_API = 'https://swarfarm.com/api/v2/monsters/';
const PAGE_SIZE = 100;
const OUTPUT_FILE = join(__dirname, 'bestiary.json');

const download = async () => {
  const allMonsters = [];
  let url = `${SWARFARM_API}?page_size=${PAGE_SIZE}&format=json`;
  let page = 1;

  while (url) {
    console.log(`Fetching page ${page}...`);
    const response = await axios.get(url);
    const { results, next, count } = response.data;

    if (page === 1) console.log(`Total on SWARFarm: ${count}`);

    for (const m of results) {
      allMonsters.push({
        com2us_id: m.com2us_id,
        name: m.name,
        element: m.element,
        natural_stars: m.natural_stars,
        image_filename: m.image_filename,
        obtainable: m.obtainable,
        awaken_level: m.awaken_level || 0,
        leader_skill: m.leader_skill ? {
          attribute: m.leader_skill.attribute,
          amount: m.leader_skill.amount,
          area: m.leader_skill.area,
          element: m.leader_skill.element
        } : null
      });
    }

    console.log(`  ${allMonsters.length} monsters collected`);
    url = next;
    page++;
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(allMonsters, null, 2));
  console.log(`\nDone! ${allMonsters.length} monsters saved to bestiary.json`);
};

download().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
