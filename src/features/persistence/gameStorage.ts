import { GameState } from "../../domain/tiles/types";

const DB_NAME = "serenimot";
const DB_VERSION = 1;
const STORE_NAME = "saved-games";
const CURRENT_SAVE_KEY = "current";
const CURRENT_SCHEMA_VERSION = 1;

export type SavedGame = {
  schemaVersion: number;
  savedAt: string;
  gameId: string;
  state: GameState;
};

export async function saveGame(state: GameState): Promise<void> {
  const db = await openDatabase();
  const savedGame: SavedGame = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    gameId: state.gameId,
    state
  };

  await runStoreRequest(db, "readwrite", (store) => store.put(savedGame, CURRENT_SAVE_KEY));
  db.close();
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  const db = await openDatabase();
  const savedGame = await runStoreRequest<SavedGame | undefined>(db, "readonly", (store) =>
    store.get(CURRENT_SAVE_KEY)
  );
  db.close();

  if (!savedGame || savedGame.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return null;
  }

  return savedGame;
}

export async function deleteSavedGame(): Promise<void> {
  const db = await openDatabase();
  await runStoreRequest(db, "readwrite", (store) => store.delete(CURRENT_SAVE_KEY));
  db.close();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = createRequest(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
