import type { GameState } from "../tiles/types";
import type { BestMoveHint } from "./hints";
import { findBestHumanMove } from "./hints";
import type { ComputerSearchOptions, OpponentLevel } from "./game";
import { playComputerTurn } from "./game";

type SearchWorkerRequest =
  | {
      id: number;
      type: "warm-up";
    }
  | {
      id: number;
      type: "find-human-hint";
      state: GameState;
    }
  | {
      id: number;
      type: "play-computer-turn";
      state: GameState;
      level: OpponentLevel;
      options: ComputerSearchOptions;
    };

type SearchWorkerResponse =
  | {
      id: number;
      ok: true;
      result: BestMoveHint | GameState | null;
      metrics: SearchWorkerMetrics;
    }
  | {
      id: number;
      ok: false;
      error: string;
      metrics: SearchWorkerMetrics;
    };

export type SearchWorkerMetrics = {
  task: SearchWorkerRequest["type"] | "fallback-find-human-hint" | "fallback-play-computer-turn";
  durationMs: number;
  dictionaryLoadMs: number;
  wallDurationMs: number;
  usedWorker: boolean;
};

type PendingSearchRequest = {
  task: SearchWorkerRequest["type"];
  startedAt: number;
  resolve: (value: BestMoveHint | GameState | null) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextRequestId = 1;
let workerFailed = false;
let lastMetrics: SearchWorkerMetrics | null = null;
const pendingRequests = new Map<number, PendingSearchRequest>();

export async function prewarmSearchWorker(): Promise<void> {
  if (!canUseWorker()) {
    return;
  }

  try {
    await postSearchRequest({
      id: nextRequestId,
      type: "warm-up"
    });
  } catch {
    workerFailed = true;
  }
}

export function getLastSearchWorkerMetrics(): SearchWorkerMetrics | null {
  return lastMetrics;
}

export async function findBestHumanMoveAsync(state: GameState): Promise<BestMoveHint | null> {
  if (!canUseWorker()) {
    return measureFallback("fallback-find-human-hint", () => findBestHumanMove(state));
  }

  try {
    const result = await postSearchRequest({
      id: nextRequestId,
      type: "find-human-hint",
      state
    });

    return result as BestMoveHint | null;
  } catch {
    workerFailed = true;
    return measureFallback("fallback-find-human-hint", () => findBestHumanMove(state));
  }
}

export async function playComputerTurnAsync(
  state: GameState,
  level: OpponentLevel,
  options: ComputerSearchOptions = {}
): Promise<GameState> {
  if (!canUseWorker()) {
    return measureFallback("fallback-play-computer-turn", () => playComputerTurn(state, level, options));
  }

  try {
    const result = await postSearchRequest({
      id: nextRequestId,
      type: "play-computer-turn",
      state,
      level,
      options
    });

    return result as GameState;
  } catch {
    workerFailed = true;
    return measureFallback("fallback-play-computer-turn", () => playComputerTurn(state, level, options));
  }
}

function canUseWorker(): boolean {
  return !workerFailed && typeof Worker !== "undefined";
}

function postSearchRequest(request: SearchWorkerRequest): Promise<BestMoveHint | GameState | null> {
  const searchWorker = getSearchWorker();
  const requestId = nextRequestId;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, {
      task: request.type,
      startedAt: performance.now(),
      resolve,
      reject
    });
    searchWorker.postMessage({ ...request, id: requestId });
  });
}

function getSearchWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL("./searchWorker.ts", import.meta.url), { type: "module" });
  worker.addEventListener("message", handleWorkerMessage);
  worker.addEventListener("error", handleWorkerError);

  return worker;
}

function handleWorkerMessage(event: MessageEvent<SearchWorkerResponse>) {
  const response = event.data;
  const pendingRequest = pendingRequests.get(response.id);

  if (!pendingRequest) {
    return;
  }

  pendingRequests.delete(response.id);
  recordWorkerMetrics(pendingRequest, response.metrics);

  if (!response.ok) {
    pendingRequest.reject(new Error(response.error));
    return;
  }

  pendingRequest.resolve(response.result);
}

function handleWorkerError(event: ErrorEvent) {
  workerFailed = true;
  const error = new Error(event.message || "Le worker de recherche a échoué.");

  pendingRequests.forEach((pendingRequest) => pendingRequest.reject(error));
  pendingRequests.clear();
  worker?.terminate();
  worker = null;
}

function recordWorkerMetrics(pendingRequest: PendingSearchRequest, metrics: SearchWorkerResponse["metrics"]) {
  lastMetrics = {
    ...metrics,
    task: pendingRequest.task,
    wallDurationMs: performance.now() - pendingRequest.startedAt,
    usedWorker: true
  };

  logSearchMetrics(lastMetrics);
}

function measureFallback<T>(task: SearchWorkerMetrics["task"], callback: () => T): T {
  const startedAt = performance.now();
  const result = callback();
  lastMetrics = {
    task,
    durationMs: performance.now() - startedAt,
    dictionaryLoadMs: 0,
    wallDurationMs: performance.now() - startedAt,
    usedWorker: false
  };

  logSearchMetrics(lastMetrics);
  return result;
}

function logSearchMetrics(metrics: SearchWorkerMetrics) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug(
    `[Sérénimot] ${metrics.task} ${Math.round(metrics.wallDurationMs)} ms` +
      (metrics.dictionaryLoadMs > 0 ? `, dictionnaire ${Math.round(metrics.dictionaryLoadMs)} ms` : "") +
      (metrics.usedWorker ? "" : ", fallback sans worker")
  );
}
