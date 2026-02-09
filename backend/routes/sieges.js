import express from 'express';
import { Guild, User, WeeklySiegeAvailability, GuildMember, GuildSubLeader, Notification } from '../models/index.js';
import { authenticate, parseId } from '../middleware/auth.js';

const router = express.Router();

// ── Helpers ──

// Get Saturday of the current week (week starts on Saturday)
function getSaturdayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Calculate how many days to go back to reach Saturday
  const daysToGoBack = day === 6 ? 0 : (day + 1);
  const saturday = new Date(d);
  saturday.setDate(d.getDate() - daysToGoBack);
  saturday.setHours(0, 0, 0, 0);
  return saturday.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// Get next Saturday (for showing upcoming week)
function getNextSaturday() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilSaturday = day === 6 ? 7 : (6 - day);
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(0, 0, 0, 0);
  return nextSaturday.toISOString().split('T')[0];
}

async function isGuildMember(guild, userId) {
  if (!guild) return false;
  if (guild.leaderId === userId) return true;
  const isSub = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId } });
  if (isSub) return true;
  const isMember = await GuildMember.findOne({ where: { guildId: guild.id, userId } });
  return !!isMember;
}

async function canManage(guild, user) {
  if (!guild) return false;
  if (user.role === 'admin') return true;
  if (guild.leaderId === user.id) return true;
  const isSub = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: user.id } });
  return !!isSub;
}

// ── Routes ──

// Get my weekly availability for current and next week
router.get('/my-weekly-availability', authenticate, async (req, res) => {
  try {
    if (!req.user.guildId) {
      return res.json({ currentWeek: null, nextWeek: null });
    }

    const currentSaturday = getSaturdayOfWeek();
    const nextSaturday = getNextSaturday();

    const [currentWeek, nextWeek] = await Promise.all([
      WeeklySiegeAvailability.findOne({
        where: { guildId: req.user.guildId, userId: req.user.id, weekStartDate: currentSaturday }
      }),
      WeeklySiegeAvailability.findOne({
        where: { guildId: req.user.guildId, userId: req.user.id, weekStartDate: nextSaturday }
      })
    ]);

    // Calculate Monday and Thursday dates for current week
    const saturdayDate = new Date(currentSaturday);
    const mondayDate = new Date(saturdayDate);
    mondayDate.setDate(saturdayDate.getDate() + 2); // Saturday + 2 = Monday
    const thursdayDate = new Date(saturdayDate);
    thursdayDate.setDate(saturdayDate.getDate() + 5); // Saturday + 5 = Thursday

    // Check if we can still answer (12h before siege = noon of previous day)
    const now = new Date();
    const sundayNoon = new Date(mondayDate);
    sundayNoon.setDate(mondayDate.getDate() - 1);
    sundayNoon.setHours(12, 0, 0, 0);
    const wednesdayNoon = new Date(thursdayDate);
    wednesdayNoon.setDate(thursdayDate.getDate() - 1);
    wednesdayNoon.setHours(12, 0, 0, 0);

    const canAnswerMonday = now < sundayNoon;
    const canAnswerThursday = now < wednesdayNoon;

    res.json({
      currentWeek: currentWeek || { weekStartDate: currentSaturday, mondayAvailable: null, thursdayAvailable: null },
      nextWeek: nextWeek || { weekStartDate: nextSaturday, mondayAvailable: null, thursdayAvailable: null },
      mondayDate: mondayDate.toISOString().split('T')[0],
      thursdayDate: thursdayDate.toISOString().split('T')[0],
      canAnswerMonday,
      canAnswerThursday
    });
  } catch (error) {
    console.error('Error fetching weekly availability:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités' });
  }
});

// Set weekly availability
router.post('/weekly-availability', authenticate, async (req, res) => {
  try {
    if (!req.user.guildId) {
      return res.status(400).json({ error: 'Vous devez appartenir à une guilde' });
    }

    const { weekStartDate, mondayAvailable, thursdayAvailable } = req.body;

    // Validate boolean or null values
    if (mondayAvailable !== null && typeof mondayAvailable !== 'boolean') {
      return res.status(400).json({ error: 'mondayAvailable doit être true, false ou null' });
    }
    if (thursdayAvailable !== null && typeof thursdayAvailable !== 'boolean') {
      return res.status(400).json({ error: 'thursdayAvailable doit être true, false ou null' });
    }

    // Calculate Monday and Thursday dates
    const saturdayDate = new Date(weekStartDate);
    const mondayDate = new Date(saturdayDate);
    mondayDate.setDate(saturdayDate.getDate() + 2);
    const thursdayDate = new Date(saturdayDate);
    thursdayDate.setDate(saturdayDate.getDate() + 5);

    // Check if deadlines passed (12h before = noon of previous day)
    const now = new Date();
    const sundayNoon = new Date(mondayDate);
    sundayNoon.setDate(mondayDate.getDate() - 1);
    sundayNoon.setHours(12, 0, 0, 0);
    const wednesdayNoon = new Date(thursdayDate);
    wednesdayNoon.setDate(thursdayDate.getDate() - 1);
    wednesdayNoon.setHours(12, 0, 0, 0);

    const [availability] = await WeeklySiegeAvailability.findOrCreate({
      where: {
        guildId: req.user.guildId,
        userId: req.user.id,
        weekStartDate
      },
      defaults: { mondayAvailable, thursdayAvailable }
    });

    // Prevent changes after deadline (only if value is actually changing)
    if (mondayAvailable !== null && mondayAvailable !== availability.mondayAvailable && now >= sundayNoon) {
      return res.status(400).json({ error: 'Délai dépassé pour le siège de lundi (limite: dimanche 12h)' });
    }
    if (thursdayAvailable !== null && thursdayAvailable !== availability.thursdayAvailable && now >= wednesdayNoon) {
      return res.status(400).json({ error: 'Délai dépassé pour le siège de jeudi (limite: mercredi 12h)' });
    }

    // Update if allowed
    availability.mondayAvailable = mondayAvailable;
    availability.thursdayAvailable = thursdayAvailable;
    await availability.save();

    res.json({ message: 'Disponibilité enregistrée', availability });
  } catch (error) {
    console.error('Error setting weekly availability:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la disponibilité' });
  }
});

// Get all weekly availabilities for a guild (for leaders/sub-leaders)
router.get('/guild/:guildId/weekly-availabilities', authenticate, async (req, res) => {
  try {
    const guildId = parseId(req.params.guildId);
    if (guildId === null) return res.status(400).json({ error: 'Invalid guild ID' });

    const guild = await Guild.findByPk(guildId);
    if (!guild) return res.status(404).json({ error: 'Guilde non trouvée' });

    if (!(await canManage(guild, req.user))) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { weekStartDate } = req.query;
    const targetWeek = weekStartDate || getSaturdayOfWeek();

    const availabilities = await WeeklySiegeAvailability.findAll({
      where: { guildId, weekStartDate: targetWeek },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'avatar'] }],
      order: [['userId', 'ASC']]
    });

    // Get all guild members using the guild association
    const guildWithMembers = await Guild.findByPk(guildId, {
      include: [{
        model: User,
        as: 'members',
        attributes: ['id', 'name', 'username', 'avatar'],
        through: { attributes: [] }
      }]
    });

    // Also include leader
    const leader = await User.findByPk(guild.leaderId, {
      attributes: ['id', 'name', 'username', 'avatar']
    });

    // Merge members who haven't responded yet (filter out leader if already in members)
    const members = (guildWithMembers?.members || []).filter(m => m.id !== guild.leaderId);
    const allMembers = [leader, ...members];

    const allAvailabilities = allMembers.map(member => {
      const existing = availabilities.find(a => a.userId === member.id);
      return existing || {
        id: null,
        guildId,
        userId: member.id,
        weekStartDate: targetWeek,
        mondayAvailable: null,
        thursdayAvailable: null,
        mondaySelected: false,
        thursdaySelected: false,
        user: member
      };
    });

    res.json({ weekStartDate: targetWeek, availabilities: allAvailabilities });
  } catch (error) {
    console.error('Error fetching guild availabilities:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités' });
  }
});

// Update selection status (for leaders/sub-leaders)
router.patch('/weekly-availabilities/:id/select', authenticate, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid ID' });

    const availability = await WeeklySiegeAvailability.findByPk(id);
    if (!availability) return res.status(404).json({ error: 'Disponibilité non trouvée' });

    const guild = await Guild.findByPk(availability.guildId);
    if (!(await canManage(guild, req.user))) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { mondaySelected, thursdaySelected } = req.body;

    if (typeof mondaySelected === 'boolean') {
      availability.mondaySelected = mondaySelected;
    }
    if (typeof thursdaySelected === 'boolean') {
      availability.thursdaySelected = thursdaySelected;
    }

    await availability.save();

    res.json({ message: 'Sélection mise à jour', availability });
  } catch (error) {
    console.error('Error updating selection:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la sélection' });
  }
});

// Finalize selections and send notifications
router.post('/guild/:guildId/finalize-selections', authenticate, async (req, res) => {
  try {
    const guildId = parseId(req.params.guildId);
    if (guildId === null) return res.status(400).json({ error: 'Invalid guild ID' });

    const guild = await Guild.findByPk(guildId);
    if (!guild) return res.status(404).json({ error: 'Guilde non trouvée' });

    if (!(await canManage(guild, req.user))) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { weekStartDate } = req.body;
    const targetWeek = weekStartDate || getSaturdayOfWeek();

    // Get all availabilities for the week
    const availabilities = await WeeklySiegeAvailability.findAll({
      where: { guildId, weekStartDate: targetWeek }
    });

    // Calculate Monday and Thursday dates for messages
    const saturdayDate = new Date(targetWeek);
    const mondayDate = new Date(saturdayDate);
    mondayDate.setDate(saturdayDate.getDate() + 2);
    const thursdayDate = new Date(saturdayDate);
    thursdayDate.setDate(saturdayDate.getDate() + 5);

    const formatDate = (d) => d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const mondayStr = formatDate(mondayDate);
    const thursdayStr = formatDate(thursdayDate);

    // Create notifications for each user
    const notifications = [];
    for (const availability of availabilities) {
      // Monday notification
      if (availability.mondayAvailable === true) {
        const message = availability.mondaySelected
          ? `🎉 Vous avez été sélectionné(e) pour le siège de ${mondayStr} !`
          : `Vous n'avez pas été sélectionné(e) pour le siège de ${mondayStr}.`;

        notifications.push({
          userId: availability.userId,
          type: 'siege_selection',
          message,
          relatedId: availability.id,
          isRead: false
        });
      }

      // Thursday notification
      if (availability.thursdayAvailable === true) {
        const message = availability.thursdaySelected
          ? `🎉 Vous avez été sélectionné(e) pour le siège de ${thursdayStr} !`
          : `Vous n'avez pas été sélectionné(e) pour le siège de ${thursdayStr}.`;

        notifications.push({
          userId: availability.userId,
          type: 'siege_selection',
          message,
          relatedId: availability.id,
          isRead: false
        });
      }
    }

    // Bulk create notifications
    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }

    res.json({
      message: 'Sélections finalisées et notifications envoyées',
      notificationsSent: notifications.length
    });
  } catch (error) {
    console.error('Error finalizing selections:', error);
    res.status(500).json({ error: 'Erreur lors de la finalisation des sélections' });
  }
});

export default router;
