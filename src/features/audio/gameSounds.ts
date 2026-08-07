import type { GameMessage } from "../../domain/tiles/types";

type SoundKind = "computer" | "draw" | "lose" | "notice" | "pass" | "success" | "win";

type WebAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;

export function playGameMessageSound(message: GameMessage, volumePercent = 45): void {
  const kind = getSoundKind(message);

  if (!kind || volumePercent <= 0) {
    return;
  }

  playSound(kind, normalizeVolume(volumePercent));
}

function getSoundKind(message: GameMessage): SoundKind | null {
  if (message.text.startsWith("La partie est terminée. Vous gagnez.")) {
    return "win";
  }

  if (message.text.startsWith("La partie est terminée. Le robot gagne.")) {
    return "lose";
  }

  if (message.text.startsWith("La partie est terminée sur une égalité.")) {
    return "draw";
  }

  if (message.text.startsWith("Mot accepté") || message.text.startsWith("Mots acceptés")) {
    return "success";
  }

  if (message.text.startsWith("Le robot pose")) {
    return "computer";
  }

  if (message.text.includes("passe")) {
    return "pass";
  }

  if (message.tone === "notice") {
    return "notice";
  }

  return null;
}

export function getGameMessageSoundKindForTest(message: GameMessage): SoundKind | null {
  return getSoundKind(message);
}

function playSound(kind: SoundKind, volumeScale: number): void {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }

  const now = context.currentTime;

  if (kind === "win") {
    playHarpChord(context, now, [261.63, 329.63, 392], 1.8, 0.07 * volumeScale);
    playHarpChord(context, now + 1, [329.63, 392, 523.25], 1.8, 0.07 * volumeScale);
    playHarpChord(context, now + 1.72, [523.25, 659.25, 783.99], 1.75, 0.07 * volumeScale);
    playHarpNote(context, now, 523.25, 0.72, 0.27 * volumeScale);
    playHarpNote(context, now + 0.28, 659.25, 0.72, 0.29 * volumeScale);
    playHarpNote(context, now + 0.58, 783.99, 0.78, 0.3 * volumeScale);
    playHarpNote(context, now + 1, 1046.5, 1.18, 0.28 * volumeScale);
    return;
  }

  if (kind === "lose") {
    playHarpChord(context, now, [220, 261.63, 329.63], 1.8, 0.06 * volumeScale);
    playHarpChord(context, now + 1.1, [196, 246.94, 293.66], 1.8, 0.06 * volumeScale);
    playHarpChord(context, now + 1.9, [174.61, 220, 261.63], 1.75, 0.06 * volumeScale);
    playHarpNote(context, now, 440, 0.72, 0.25 * volumeScale);
    playHarpNote(context, now + 0.34, 392, 0.76, 0.24 * volumeScale);
    playHarpNote(context, now + 0.76, 329.63, 0.82, 0.23 * volumeScale);
    playHarpNote(context, now + 1.26, 261.63, 1.05, 0.22 * volumeScale);
    playHarpNote(context, now + 1.88, 220, 1.22, 0.2 * volumeScale);
    return;
  }

  if (kind === "draw") {
    playTone(context, now, 392, 0.09, 0.11 * volumeScale);
    playTone(context, now + 0.12, 392, 0.12, 0.1 * volumeScale);
    return;
  }

  if (kind === "success") {
    playTone(context, now, 523.25, 0.06, 0.12 * volumeScale);
    playTone(context, now + 0.08, 659.25, 0.08, 0.14 * volumeScale);
    playTone(context, now + 0.17, 783.99, 0.11, 0.16 * volumeScale);
    return;
  }

  if (kind === "computer") {
    playTone(context, now, 392, 0.05, 0.1 * volumeScale);
    playTone(context, now + 0.07, 493.88, 0.08, 0.12 * volumeScale);
    return;
  }

  if (kind === "notice") {
    playTone(context, now, 220, 0.07, 0.12 * volumeScale);
    playTone(context, now + 0.08, 174.61, 0.1, 0.1 * volumeScale);
    return;
  }

  playTone(context, now, 329.63, 0.06, 0.1 * volumeScale);
}

function normalizeVolume(volumePercent: number): number {
  return Math.min(1, Math.max(0, volumePercent / 100));
}

function playTone(context: AudioContext, startAt: number, frequency: number, duration: number, volume: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playHarpChord(
  context: AudioContext,
  startAt: number,
  frequencies: number[],
  duration: number,
  volume: number
): void {
  frequencies.forEach((frequency, index) => {
    playHarpNote(context, startAt + index * 0.018, frequency, duration, volume);
  });
}

function playHarpNote(
  context: AudioContext,
  startAt: number,
  frequency: number,
  duration: number,
  volume: number
): void {
  const partials = [
    { ratio: 1, gain: 1 },
    { ratio: 2, gain: 0.26 },
    { ratio: 4, gain: 0.18 },
    { ratio: 6, gain: 0.1 }
  ];

  partials.forEach(({ ratio, gain: partialGain }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * ratio, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * partialGain), startAt + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  });
}

function getAudioContext(): AudioContext | null {
  if (audioContext) {
    return audioContext;
  }

  const AudioContextConstructor = window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor();
  return audioContext;
}
