import { RACK_SIZE, Rack } from "../../domain/tiles/types";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, MutableRefObject, PointerEvent } from "react";

const TILE_DRAG_MIME = "text/serenimot-tile-id";

type TouchTileDrag = {
  tileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
};

type RackViewProps = {
  gameId: string;
  rack: Rack;
  preparedTileIds: string[];
  pendingBoardTileIds: string[];
  exchangeTileIds: string[];
  isExchangeMode: boolean;
  selectedBoardCell: { row: number; col: number } | null;
  selectedPreparedSlotIndex: number | null;
  canRotateBoardWord: boolean;
  rotateBoardWordDirection: "row" | "col";
  onAddTile: (tileId: string) => void;
  onRotateBoardWord: () => void;
  onTileDropInPrepared: (tileId: string, targetIndex: number | null) => void;
  onTileDropOnBoard: (tileId: string, row: number, col: number) => void;
  onToggleExchangeTile: (tileId: string) => void;
};

export function RackView({
  gameId,
  rack,
  preparedTileIds,
  pendingBoardTileIds,
  exchangeTileIds,
  isExchangeMode,
  selectedBoardCell,
  selectedPreparedSlotIndex,
  canRotateBoardWord,
  rotateBoardWordDirection,
  onAddTile,
  onRotateBoardWord,
  onTileDropInPrepared,
  onTileDropOnBoard,
  onToggleExchangeTile
}: RackViewProps) {
  const tileById = useMemo(() => new Map(rack.map((tile) => [tile.id, tile])), [rack]);
  const preparedRackTileIds = useMemo(() => preparedTileIds.filter((tileId) => !tileId.startsWith("board:")), [preparedTileIds]);
  const unavailableTileIds = useMemo(
    () => new Set([...preparedRackTileIds, ...pendingBoardTileIds]),
    [pendingBoardTileIds, preparedRackTileIds]
  );
  const [slotIds, setSlotIds] = useState<(string | null)[]>(() => rack.map((tile) => tile.id));
  const exchangeTileIdSet = new Set(exchangeTileIds);
  const touchDragRef = useRef<TouchTileDrag | null>(null);
  const ignoreNextClickRef = useRef(false);
  const slotGameIdRef = useRef(gameId);
  const rotateLabel =
    rotateBoardWordDirection === "row"
      ? "Direction actuelle : vers la droite. Changer vers le bas."
      : "Direction actuelle : vers le bas. Changer vers la droite.";
  const directionIcon = rotateBoardWordDirection === "row" ? "→" : "↓";
  const knownTileIds = useMemo(
    () => uniqueIds([...rack.map((tile) => tile.id), ...preparedRackTileIds, ...pendingBoardTileIds]),
    [pendingBoardTileIds, preparedRackTileIds, rack]
  );

  useEffect(() => {
    setSlotIds((currentSlots) => {
      if (slotGameIdRef.current !== gameId) {
        slotGameIdRef.current = gameId;
        return rack.map((tile) => tile.id);
      }

      const knownTileIdSet = new Set(knownTileIds);
      const nextSlots = currentSlots.map((tileId) => (tileId && knownTileIdSet.has(tileId) ? tileId : null));
      const displayedTileIds = new Set(nextSlots.filter((tileId): tileId is string => Boolean(tileId)));

      for (const tileId of knownTileIds) {
        if (displayedTileIds.has(tileId)) {
          continue;
        }

        const emptyIndex = nextSlots.findIndex((slotId) => slotId === null);

        if (emptyIndex >= 0) {
          nextSlots[emptyIndex] = tileId;
        } else {
          nextSlots.push(tileId);
        }
        displayedTileIds.add(tileId);
      }

      while (nextSlots.length < Math.min(RACK_SIZE, knownTileIds.length)) {
        nextSlots.push(null);
      }

      return nextSlots;
    });
  }, [gameId, knownTileIds, rack]);

  return (
    <div className="preparation-subsection">
      <h3 id="rack-title" className="visually-hidden">
        Vos lettres
      </h3>
      <div className="rack-row">
        <div
          className="rack"
          role="list"
          aria-label={isExchangeMode ? "Lettres à choisir pour échange" : "Chevalet"}
        >
          {slotIds.length > 0 ? (
            slotIds.map((tileId, slotIndex) => {
              const tile = tileId ? tileById.get(tileId) : null;

              if (!tile || unavailableTileIds.has(tile.id)) {
                return <span className="rack-slot-placeholder" key={tileId ?? `empty-${slotIndex}`} aria-hidden="true" />;
              }

              const isExchangeSelected = exchangeTileIdSet.has(tile.id);

              return (
                <button
                  className={`rack-tile${isExchangeSelected ? " exchange-selected" : ""}`}
                  key={tile.id}
                  type="button"
                  aria-pressed={isExchangeMode ? isExchangeSelected : undefined}
                  aria-label={
                    isExchangeMode
                      ? `${isExchangeSelected ? "Retirer" : "Choisir"} la lettre ${tile.letter}, valeur ${tile.value}, pour l'échange`
                      : selectedBoardCell
                        ? `Poser la lettre ${tile.letter}, valeur ${tile.value}, ligne ${selectedBoardCell.row + 1}, colonne ${selectedBoardCell.col + 1}`
                        : selectedPreparedSlotIndex === null
                          ? `Ajouter la lettre ${tile.letter}, valeur ${tile.value}`
                          : `Placer la lettre ${tile.letter}, valeur ${tile.value}, dans l'emplacement ${selectedPreparedSlotIndex + 1}`
                  }
                  onClick={() => {
                    if (ignoreNextClickRef.current) {
                      ignoreNextClickRef.current = false;
                      return;
                    }

                    if (isExchangeMode) {
                      onToggleExchangeTile(tile.id);
                      return;
                    }

                    onAddTile(tile.id);
                  }}
                  draggable={!isExchangeMode}
                  onDragStart={(event) => {
                    if (isExchangeMode) {
                      return;
                    }

                    setDraggedTileId(event, tile.id);
                  }}
                  onPointerDown={(event) => {
                    if (isExchangeMode) {
                      return;
                    }

                    handleTilePointerDown(event, tile.id, touchDragRef);
                  }}
                  onPointerMove={(event) => handleTilePointerMove(event, touchDragRef)}
                  onPointerUp={(event) => {
                    const dropped = handleTilePointerUp(event, touchDragRef, onTileDropOnBoard, onTileDropInPrepared);

                    if (dropped) {
                      ignoreNextClickRef.current = true;
                    }
                  }}
                  onPointerCancel={() => {
                    touchDragRef.current = null;
                  }}
                >
                  <span>{tile.letter}</span>
                  <small>{tile.value}</small>
                </button>
              );
            })
          ) : (
            <p className="rack-empty">Aucune lettre en réserve.</p>
          )}
        </div>
        <button
          className="secondary-button rack-direction-button"
          type="button"
          aria-label={rotateLabel}
          onClick={onRotateBoardWord}
          disabled={isExchangeMode || !canRotateBoardWord}
          title="Change le sens de pose"
        >
          <span>Sens</span>
          <strong aria-hidden="true">{directionIcon}</strong>
        </button>
      </div>
      {isExchangeMode ? (
        <div className="exchange-help" role="status" aria-live="polite">
          <strong>Touchez les lettres à remplacer, puis appuyez sur Échanger.</strong>
          <span>Échanger passe votre tour. Vous pouvez encore annuler avant de confirmer.</span>
        </div>
      ) : null}
    </div>
  );
}

function setDraggedTileId(event: DragEvent<HTMLElement>, tileId: string) {
  event.dataTransfer.setData(TILE_DRAG_MIME, tileId);
  event.dataTransfer.setData("text/plain", tileId);
  event.dataTransfer.effectAllowed = "move";
}

function uniqueIds(tileIds: string[]): string[] {
  return Array.from(new Set(tileIds));
}

function handleTilePointerDown(
  event: PointerEvent<HTMLElement>,
  tileId: string,
  touchDragRef: MutableRefObject<TouchTileDrag | null>
) {
  if (event.pointerType === "mouse") {
    return;
  }

  touchDragRef.current = {
    tileId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    dragging: false
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleTilePointerMove(
  event: PointerEvent<HTMLElement>,
  touchDragRef: MutableRefObject<TouchTileDrag | null>
) {
  const drag = touchDragRef.current;

  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);

  if (distance > 8) {
    drag.dragging = true;
    event.preventDefault();
  }
}

function handleTilePointerUp(
  event: PointerEvent<HTMLElement>,
  touchDragRef: MutableRefObject<TouchTileDrag | null>,
  onTileDropOnBoard: (tileId: string, row: number, col: number) => void,
  onTileDropInPrepared: (tileId: string, targetIndex: number | null) => void
): boolean {
  const drag = touchDragRef.current;

  if (!drag || drag.pointerId !== event.pointerId) {
    return false;
  }

  touchDragRef.current = null;
  event.currentTarget.releasePointerCapture(event.pointerId);

  if (!drag.dragging) {
    return false;
  }

  event.preventDefault();

  const targetCell = getBoardCellFromPoint(event.clientX, event.clientY);

  if (!targetCell) {
    const preparedTargetIndex = getPreparedSlotIndexFromPoint(event.clientX, event.clientY);

    if (preparedTargetIndex !== null) {
      onTileDropInPrepared(drag.tileId, preparedTargetIndex);
      return true;
    }

    if (isInsidePreparedWord(event.clientX, event.clientY)) {
      onTileDropInPrepared(drag.tileId, null);
      return true;
    }

    return false;
  }

  onTileDropOnBoard(drag.tileId, targetCell.row, targetCell.col);

  return true;
}

function getPreparedSlotIndexFromPoint(clientX: number, clientY: number): number | null {
  const element = document.elementFromPoint(clientX, clientY);
  const slot = element?.closest<HTMLElement>("[data-slot-index]");

  if (!slot) {
    return null;
  }

  const slotIndex = Number(slot.dataset.slotIndex);

  return Number.isInteger(slotIndex) ? slotIndex : null;
}

function isInsidePreparedWord(clientX: number, clientY: number): boolean {
  return Boolean(document.elementFromPoint(clientX, clientY)?.closest(".prepared-word-tiles"));
}

function getBoardCellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
  const element = document.elementFromPoint(clientX, clientY);
  const cell = element?.closest<HTMLElement>(".board-cell[data-row][data-col]");

  if (!cell) {
    return null;
  }

  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }

  return { row, col };
}
