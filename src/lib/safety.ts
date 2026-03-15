const BLOCK_PATTERNS = [
  /\b(kill yourself|go die|self-harm instructions|racial slur|nazi|hate\s+\w+)\b/i,
  /\b(bully|harass|nobody cares about you)\b/i,
];

const CRISIS_PATTERNS = [
  /\b(i want to disappear|i can't go on|cant go on|end my life|want to die|suicidal|hurt myself|self harm)\b/i,
];

export const isBlockedForSafety = (text: string) =>
  BLOCK_PATTERNS.some((pattern) => pattern.test(text));

export const hasCrisisSignal = (text: string) =>
  CRISIS_PATTERNS.some((pattern) => pattern.test(text));
