import { loadDictionaryFromUrl } from "../rules/dictionary";
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

type SearchWorkerMetrics = {
  task: SearchWorkerRequest["type"];
  durationMs: number;
  dictionaryLoadMs: number;
};

let dictionaryLoadPromise: Promise<number> | null = null;
let dictionaryLoaded = false;

async function ensureDictionaryLoaded(): Promise<number> {
  if (dictionaryLoaded) {
    return 0;
  }

  const startedAt = performance.now();
  dictionaryLoadPromise ??= loadDictionaryFromUrl();
  await dictionaryLoadPromise;
  dictionaryLoaded = true;

  return performance.now() - startedAt;
}

globalThis.addEventListener("message", (event: MessageEvent<SearchWorkerRequest>) => {
  const request = event.data;

  handleSearchRequest(request)
    .then((response) => globalThis.postMessage(response))
    .catch((error: unknown) => {
      const response: SearchWorkerResponse = {
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : "La recherche a échoué."
        ,
        metrics: {
          task: request.type,
          durationMs: 0,
          dictionaryLoadMs: 0
        }
      };

      globalThis.postMessage(response);
    });
});

async function handleSearchRequest(request: SearchWorkerRequest): Promise<SearchWorkerResponse> {
  const startedAt = performance.now();
  const dictionaryLoadMs = await ensureDictionaryLoaded();
  const createMetrics = (): SearchWorkerMetrics => ({
    task: request.type,
    durationMs: performance.now() - startedAt,
    dictionaryLoadMs
  });

  if (request.type === "warm-up") {
    return {
      id: request.id,
      ok: true,
      result: null,
      metrics: createMetrics()
    };
  }

  if (request.type === "find-human-hint") {
    return {
      id: request.id,
      ok: true,
      result: findBestHumanMove(request.state),
      metrics: createMetrics()
    };
  }

  return {
    id: request.id,
    ok: true,
    result: playComputerTurn(request.state, request.level, request.options),
    metrics: createMetrics()
  };
}
