import sequelize from '../config/database.js';
import { User, GuildMember } from '../models/index.js';

async function fixUserGuildIds() {
  try {
    console.log('🔧 Fixing user guildId fields...\n');

    // Find all guild members
    const guildMembers = await GuildMember.findAll();

    let fixed = 0;
    let alreadyOk = 0;

    for (const membership of guildMembers) {
      const user = await User.findByPk(membership.userId);

      if (user) {
        if (user.guildId !== membership.guildId) {
          console.log(`  Fixing user ${user.id} (${user.name || user.email}): guildId ${user.guildId} -> ${membership.guildId}`);
          user.guildId = membership.guildId;
          await user.save();
          fixed++;
        } else {
          alreadyOk++;
        }
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Fixed: ${fixed} users`);
    console.log(`   Already OK: ${alreadyOk} users`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUserGuildIds();
