import type { GameMessage } from "../../domain/tiles/types";

type SoundKind = "computer" | "notice" | "pass" | "success";

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
  if (message.text.startsWith("Mot accepté") || message.text.startsWith("Mots acceptés")) {
    return "success";
  }

  if (message.text.startsWith("L'ordinateur pose")) {
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

function playSound(kind: SoundKind, volumeScale: number): void {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }

  const now = context.currentTime;

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
