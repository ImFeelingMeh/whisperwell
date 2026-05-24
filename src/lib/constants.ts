export const CATEGORIES = [
  { value: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { value: 'loneliness', label: 'Loneliness', emoji: '🫂' },
  { value: 'school-work', label: 'Stress (school/work)', emoji: '📚' },
  { value: 'relationships', label: 'Relationships', emoji: '💔' },
  { value: 'family', label: 'Family', emoji: '🏠' },
  { value: 'burnout', label: 'Burnout', emoji: '🔥' },
  { value: 'self-doubt', label: 'Self-doubt', emoji: '🪞' },
  { value: 'general-vent', label: 'General vent', emoji: '💨' },
] as const;

export const EMOTIONS = [
  { value: 'anxious', label: 'Anxious', emoji: '😟' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '😵' },
  { value: 'lonely', label: 'Lonely', emoji: '🥺' },
  { value: 'confused', label: 'Confused', emoji: '😕' },
  { value: 'exhausted', label: 'Exhausted', emoji: '😩' },
  { value: 'hopeful', label: 'Hopeful', emoji: '🌤' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
] as const;

export const VENT_MODES = [
  { value: 'advice', label: 'I want advice', emoji: '💡' },
  { value: 'vent', label: 'I just want to vent', emoji: '💨' },
  { value: 'encouragement', label: 'I need encouragement', emoji: '🤗' },
] as const;

export const RESPONSE_PROMPTS = [
  'Share a similar experience',
  'Offer encouragement',
  'Suggest something that helped you',
] as const;

export const MOODS = [
  { value: 'good', label: 'Good', color: 'teal' },
  { value: 'okay', label: 'Okay', color: 'amber' },
  { value: 'struggling', label: 'Struggling', color: 'lavender' },
] as const;

export const REACTION_TYPES = [
  { value: 'helpful', label: 'This helped' },
  { value: 'relatable', label: 'I relate' },
  { value: 'encouraging', label: 'This gave me hope' },
] as const;
