export type ComfortPreferences = {
  enabled: boolean;
  textScale: "ultra-small" | "extra-small" | "small" | "standard" | "large" | "extra-large";
  boardSize: 9 | 11 | 13 | 15 | 17;
  opponentLevel: "very-easy" | "easy" | "normal" | "hard" | "expert";
  computerSearchProfile: "auto" | "safe" | "balanced" | "quality";
  hintMode: "none" | "progressive" | "complete";
  undoMode: "turn-only" | "all-actions";
  hintsEnabled: boolean;
  developerMode: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  contrast: "standard" | "enhanced";
  reducedMotion: boolean;
  interactionMode: "tap" | "drag-and-drop" | "both";
  guidanceLevel: "concise" | "detailed";
  opponentPace: "immediate" | "calm";
};

export const DEFAULT_PREFERENCES: ComfortPreferences = {
  enabled: false,
  textScale: "small",
  boardSize: 13,
  opponentLevel: "easy",
  computerSearchProfile: "auto",
  hintMode: "complete",
  undoMode: "turn-only",
  hintsEnabled: true,
  developerMode: false,
  soundEnabled: true,
  soundVolume: 70,
  contrast: "standard",
  reducedMotion: false,
  interactionMode: "tap",
  guidanceLevel: "concise",
  opponentPace: "calm"
};

export const PREFERENCES_STORAGE_KEY = "serenimot.preferences.v1";
const BOARD_SIZES: ComfortPreferences["boardSize"][] = [9, 11, 13, 15, 17];
const OPPONENT_LEVELS: ComfortPreferences["opponentLevel"][] = ["very-easy", "easy", "normal", "hard", "expert"];
const COMPUTER_SEARCH_PROFILES: ComfortPreferences["computerSearchProfile"][] = ["auto", "safe", "balanced", "quality"];
const HINT_MODES: ComfortPreferences["hintMode"][] = ["none", "progressive", "complete"];
const UNDO_MODES: ComfortPreferences["undoMode"][] = ["turn-only", "all-actions"];

export function loadPreferences(): ComfortPreferences {
  const storage = getPreferencesStorage();
  const raw = storage?.getItem(PREFERENCES_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as ComfortPreferences;
    return {
      ...preferences,
      boardSize: BOARD_SIZES.includes(preferences.boardSize) ? preferences.boardSize : DEFAULT_PREFERENCES.boardSize,
      opponentLevel: OPPONENT_LEVELS.includes(preferences.opponentLevel)
        ? preferences.opponentLevel
        : DEFAULT_PREFERENCES.opponentLevel,
      computerSearchProfile: COMPUTER_SEARCH_PROFILES.includes(preferences.computerSearchProfile)
        ? preferences.computerSearchProfile
        : DEFAULT_PREFERENCES.computerSearchProfile,
      hintMode: HINT_MODES.includes(preferences.hintMode) ? preferences.hintMode : DEFAULT_PREFERENCES.hintMode,
      undoMode: normalizeUndoMode(preferences.undoMode),
      hintsEnabled:
        typeof preferences.hintsEnabled === "boolean" ? preferences.hintsEnabled : DEFAULT_PREFERENCES.hintsEnabled,
      soundVolume: normalizeSoundVolume(preferences.soundVolume)
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: ComfortPreferences): void {
  getPreferencesStorage()?.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function normalizeUndoMode(mode: unknown): ComfortPreferences["undoMode"] {
  if (mode === "last-turn") {
    return "all-actions";
  }

  if (mode === "off") {
    return "turn-only";
  }

  return UNDO_MODES.includes(mode as ComfortPreferences["undoMode"])
    ? (mode as ComfortPreferences["undoMode"])
    : DEFAULT_PREFERENCES.undoMode;
}

function normalizeSoundVolume(volume: unknown): number {
  return typeof volume === "number" && Number.isFinite(volume)
    ? Math.min(100, Math.max(0, Math.round(volume)))
    : DEFAULT_PREFERENCES.soundVolume;
}

function getPreferencesStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
