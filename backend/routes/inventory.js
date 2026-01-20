import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import GuildInventory from '../models/GuildInventory.js';
import Guild from '../models/Guild.js';
import Defense from '../models/Defense.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) et CSV sont acceptés'), false);
    }
  }
});

const normalizeMonsterName = (name) => {
  if (!name) return '';
  return name
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\(2a\)\s*/gi, '')
    .replace(/\s*2a\s*/gi, '')
    .trim();
};

// Upload Excel file and parse inventory
router.post(
  '/upload/:guildId',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    try {
      const { guildId } = req.params;

      const guild = await Guild.findById(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guilde non trouvée' });
      }

      const isLeader = guild.leader.toString() === req.user._id.toString();
      const isSubLeader = guild.subLeaders?.some(s => s.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'admin';

      if (!isLeader && !isSubLeader && !isAdmin) {
        return res.status(403).json({ error: 'Seuls les chefs et sous-chefs peuvent uploader l\'inventaire' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

      if (workbook.SheetNames.length === 0) {
        return res.status(400).json({ error: 'Le fichier Excel est vide' });
      }

      const allPlayers = new Map();
      const allMonsterColumns = new Set();

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length < 5) continue;

        const monsterRow = data[3];
        if (!monsterRow) continue;

        const monsterColumns = {};
        for (let col = 1; col < monsterRow.length; col++) {
          const monsterName = monsterRow[col];
          if (monsterName && typeof monsterName === 'string' && monsterName.trim()) {
            monsterColumns[col] = monsterName.trim();
            allMonsterColumns.add(monsterName.trim());
          }
        }

        for (let row = 4; row < data.length; row++) {
          const rowData = data[row];
          if (!rowData || !rowData[0]) continue;

          const playerName = rowData[0].toString().trim();
          if (!playerName) continue;

          const normalizedPlayerName = playerName.toLowerCase();

          if (!allPlayers.has(normalizedPlayerName)) {
            allPlayers.set(normalizedPlayerName, {
              playerName: normalizedPlayerName,
              visibleName: playerName,
              monsters: new Set()
            });
          }

          const player = allPlayers.get(normalizedPlayerName);

          for (const [col, monsterName] of Object.entries(monsterColumns)) {
            const cellValue = rowData[parseInt(col)];
            if (cellValue && (cellValue === 'x' || cellValue === 'X' || cellValue >= 1)) {
              player.monsters.add(normalizeMonsterName(monsterName));
            }
          }
        }
      }

      const playersArray = Array.from(allPlayers.values()).map(player => ({
        playerName: player.playerName,
        visibleName: player.visibleName,
        monsters: Array.from(player.monsters)
      }));

      let inventory = await GuildInventory.findOne({ guild: guildId });

      if (inventory) {
        inventory.players = playersArray;
        inventory.uploadedBy = req.user._id;
        inventory.fileName = req.file.originalname;
        inventory.monsterColumns = Array.from(allMonsterColumns);
        await inventory.save();
      } else {
        inventory = await GuildInventory.create({
          guild: guildId,
          players: playersArray,
          uploadedBy: req.user._id,
          fileName: req.file.originalname,
          monsterColumns: Array.from(allMonsterColumns)
        });
      }

      res.json({
        message: 'Inventaire importé avec succès',
        playersCount: playersArray.length,
        monstersCount: allMonsterColumns.size,
        fileName: req.file.originalname
      });
    } catch (error) {
      console.error('Error uploading inventory:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({ error: error.message || 'Erreur lors de l\'import de l\'inventaire' });
    }
  }
);

// Get inventory info for a guild
router.get(
  '/:guildId',
  authenticate,
  async (req, res) => {
    try {
      const { guildId } = req.params;

      const guild = await Guild.findById(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guilde non trouvée' });
      }

      const isMember = guild.members.some(m => m.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'admin';

      if (!isMember && !isAdmin) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const inventory = await GuildInventory.findOne({ guild: guildId })
        .populate('uploadedBy', 'name');

      if (!inventory) {
        return res.json({ inventory: null });
      }

      res.json({
        inventory: {
          playersCount: inventory.players.length,
          monstersCount: inventory.monsterColumns.length,
          fileName: inventory.fileName,
          uploadedBy: inventory.uploadedBy?.name,
          updatedAt: inventory.updatedAt
        }
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'inventaire' });
    }
  }
);

// Get players who can make a specific defense
router.get(
  '/:guildId/compatible/:defenseId',
  authenticate,
  async (req, res) => {
    try {
      const { guildId, defenseId } = req.params;

      const guild = await Guild.findById(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guilde non trouvée' });
      }

      const isMember = guild.members.some(m => m.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'admin';

      if (!isMember && !isAdmin) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const defense = await Defense.findById(defenseId);

      if (!defense) {
        return res.status(404).json({ error: 'Défense non trouvée' });
      }

      const inventory = await GuildInventory.findOne({ guild: guildId });

      if (!inventory) {
        return res.json({
          compatiblePlayers: [],
          message: 'Aucun inventaire importé pour cette guilde'
        });
      }

      const defenseMonsters = defense.monsters.map(m => normalizeMonsterName(m.name));

      const compatiblePlayers = [];
      const partialPlayers = [];

      for (const player of inventory.players) {
        const playerMonsters = new Set(player.monsters);
        const hasMonsters = defenseMonsters.map(m => playerMonsters.has(m));
        const matchCount = hasMonsters.filter(Boolean).length;

        if (matchCount === defenseMonsters.length) {
          compatiblePlayers.push({
            name: player.visibleName,
            hasAll: true
          });
        } else if (matchCount > 0) {
          const missingMonsters = defense.monsters
            .filter((m, i) => !hasMonsters[i])
            .map(m => m.name);

          partialPlayers.push({
            name: player.visibleName,
            hasAll: false,
            matchCount,
            missingMonsters
          });
        }
      }

      partialPlayers.sort((a, b) => b.matchCount - a.matchCount);

      res.json({
        compatiblePlayers,
        partialPlayers: partialPlayers.slice(0, 10),
        defenseMonsters: defense.monsters.map(m => m.name)
      });
    } catch (error) {
      console.error('Error finding compatible players:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche des joueurs compatibles' });
    }
  }
);

// Get players who can make a defense (by monster names, not defense ID)
router.post(
  '/:guildId/check-monsters',
  authenticate,
  async (req, res) => {
    try {
      const { guildId } = req.params;
      const { monsters } = req.body;

      if (!monsters || !Array.isArray(monsters) || monsters.length === 0) {
        return res.status(400).json({ error: 'Liste de monstres requise' });
      }

      const guild = await Guild.findById(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guilde non trouvée' });
      }

      const isMember = guild.members.some(m => m.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'admin';

      if (!isMember && !isAdmin) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const inventory = await GuildInventory.findOne({ guild: guildId });

      if (!inventory) {
        return res.json({
          compatiblePlayers: [],
          message: 'Aucun inventaire importé pour cette guilde'
        });
      }

      const normalizedMonsters = monsters.map(m => normalizeMonsterName(m));

      const compatiblePlayers = [];
      const partialPlayers = [];

      for (const player of inventory.players) {
        const playerMonsters = new Set(player.monsters);
        const hasMonsters = normalizedMonsters.map(m => playerMonsters.has(m));
        const matchCount = hasMonsters.filter(Boolean).length;

        if (matchCount === normalizedMonsters.length) {
          compatiblePlayers.push({
            name: player.visibleName,
            hasAll: true
          });
        } else if (matchCount > 0) {
          const missingMonsters = monsters.filter((m, i) => !hasMonsters[i]);

          partialPlayers.push({
            name: player.visibleName,
            hasAll: false,
            matchCount,
            missingMonsters
          });
        }
      }

      partialPlayers.sort((a, b) => b.matchCount - a.matchCount);

      res.json({
        compatiblePlayers,
        partialPlayers: partialPlayers.slice(0, 10)
      });
    } catch (error) {
      console.error('Error checking monsters:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification des monstres' });
    }
  }
);

// Delete inventory
router.delete(
  '/:guildId',
  authenticate,
  async (req, res) => {
    try {
      const { guildId } = req.params;

      const guild = await Guild.findById(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guilde non trouvée' });
      }

      const isLeader = guild.leader.toString() === req.user._id.toString();
      const isSubLeader = guild.subLeaders?.some(s => s.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'admin';

      if (!isLeader && !isSubLeader && !isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
      }

      await GuildInventory.findOneAndDelete({ guild: guildId });

      res.json({ message: 'Inventaire supprimé' });
    } catch (error) {
      console.error('Error deleting inventory:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression de l\'inventaire' });
    }
  }
);

export default router;
