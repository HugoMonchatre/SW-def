const ELEMENT_COLORS = {
  Fire: '#e74c3c',
  Water: '#3498db',
  Wind: '#f1c40f',
  Light: '#ecf0f1',
  Dark: '#9b59b6',
};

export const getElementColor = (element) => ELEMENT_COLORS[element] || '#95a5a6';

export const formatLeaderSkill = (leaderSkill) => {
  if (!leaderSkill) return null;
  let text = `${leaderSkill.attribute} +${leaderSkill.amount}%`;
  if (leaderSkill.area === 'Element' && leaderSkill.element) {
    text += ` (${leaderSkill.element})`;
  } else if (leaderSkill.area !== 'General') {
    text += ` (${leaderSkill.area})`;
  }
  return text;
};
