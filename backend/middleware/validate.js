import Joi from 'joi';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: true, stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// ── Schemas ──────────────────────────────────────────────

export const swDataSchema = Joi.object({
  jsonData: Joi.object({
    command: Joi.string().valid('HubUserLogin').required(),
    wizard_info: Joi.object({
      wizard_id: Joi.number().required(),
      wizard_name: Joi.string().required(),
      wizard_level: Joi.number().optional(),
    }).required().unknown(true),
  }).required().unknown(true),
});

export const profileSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  avatar: Joi.string().uri().allow('').optional(),
});

export const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

export const themeSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark').required(),
});
