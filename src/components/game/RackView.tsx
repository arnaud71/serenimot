import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Rack } from "../../domain/tiles/types";

type RackViewProps = {
  rack: Rack;
  preparedTileIds: string[];
  exchangeTileIds: string[];
  isExchangeMode: boolean;
  selectedBoardCell: { row: number; col: number } | null;
  selectedPreparedSlotIndex: number | null;
  onAddTile: (tileId: string) => void;
  onToggleExchangeTile: (tileId: string) => void;
  onBoardDrop: (tileId: string, row: number, col: number) => void;
  onPreparedDrop: (tileId: string, targetIndex: number | null) => void;
  onDropTile: (tileId: string) => void;
};

const TILE_DRAG_MIME = "text/serenimot-tile-id";

type TouchDragState = {
  tileId: string;
  letter: string;
  value: number;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
};

const TOUCH_DRAG_THRESHOLD_PX = 8;

export function RackView({
  rack,
  preparedTileIds,
  exchangeTileIds,
  isExchangeMode,
  selectedBoardCell,
  selectedPreparedSlotIndex,
  onAddTile,
  onToggleExchangeTile,
  onBoardDrop,
  onPreparedDrop,
  onDropTile
}: RackViewProps) {
  const availableTiles = rack.filter((tile) => !preparedTileIds.includes(tile.id));
  const exchangeTileIdSet = new Set(exchangeTileIds);
  const [touchDrag, setTouchDrag] = useState<TouchDragState | null>(null);
  const touchDragRef = useRef<TouchDragState | null>(null);
  const ignoreNextClickRef = useRef(false);

  function handleTilePointerDown(event: PointerEvent<HTMLButtonElement>, tileId: string, letter: string, value: number) {
    if (isExchangeMode) {
      return;
    }

    if (event.pointerType === "mouse") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag = {
      tileId,
      letter,
      value,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false
    };
    touchDragRef.current = nextDrag;
    setTouchDrag(nextDrag);
  }

  function handleTilePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const currentDrag = touchDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY);
    const active = currentDrag.active || distance >= TOUCH_DRAG_THRESHOLD_PX;

    if (active) {
      event.preventDefault();
      ignoreNextClickRef.current = true;
    }

    const nextDrag = {
      ...currentDrag,
      x: event.clientX,
      y: event.clientY,
      active
    };
    touchDragRef.current = nextDrag;
    setTouchDrag(nextDrag);
  }

  function handleTilePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const currentDrag = touchDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    touchDragRef.current = null;
    setTouchDrag(null);

    if (!currentDrag.active) {
      return;
    }

    event.preventDefault();
    ignoreNextClickRef.current = true;
    const boardCell = document.elementFromPoint(event.clientX, event.clientY)?.closest(".board-cell");
    const row = Number((boardCell as HTMLElement | null)?.dataset.row);
    const col = Number((boardCell as HTMLElement | null)?.dataset.col);

    if (Number.isInteger(row) && Number.isInteger(col)) {
      onBoardDrop(currentDrag.tileId, row, col);
      return;
    }

    const preparedTarget = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".prepared-word-slot, .prepared-word-tile, .prepared-word");
    const targetIndex = Number((preparedTarget as HTMLElement | null)?.dataset.slotIndex);

    if (Number.isInteger(targetIndex)) {
      onPreparedDrop(currentDrag.tileId, targetIndex);
      return;
    }

    if (preparedTarget?.classList.contains("prepared-word")) {
      onPreparedDrop(currentDrag.tileId, null);
    }
  }

  return (
    <div className="preparation-subsection">
      <h3 id="rack-title" className="visually-hidden">
        Vos lettres
      </h3>
      <div
        className="rack"
        role="list"
        aria-label={isExchangeMode ? "Lettres à choisir pour échange" : "Chevalet"}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const tileId = event.dataTransfer.getData(TILE_DRAG_MIME) || event.dataTransfer.getData("text/plain");

          if (tileId) {
            onDropTile(tileId);
          }
        }}
      >
        {availableTiles.length > 0 ? (
          availableTiles.map((tile) => {
            const isExchangeSelected = exchangeTileIdSet.has(tile.id);

            return (
              <button
                className={`rack-tile${isExchangeSelected ? " exchange-selected" : ""}`}
                draggable={!isExchangeMode}
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
                onDragStart={(event) => {
                  if (isExchangeMode) {
                    event.preventDefault();
                    return;
                  }

                  event.dataTransfer.setData(TILE_DRAG_MIME, tile.id);
                  event.dataTransfer.setData("text/plain", tile.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onPointerDown={(event) => handleTilePointerDown(event, tile.id, tile.letter, tile.value)}
                onPointerMove={handleTilePointerMove}
                onPointerCancel={() => {
                  touchDragRef.current = null;
                  setTouchDrag(null);
                }}
                onPointerUp={handleTilePointerUp}
              >
                <span>{tile.letter}</span>
                <small>{tile.value}</small>
              </button>
            );
          })
        ) : (
          <p className="rack-empty">Toutes vos lettres sont dans le chevalet.</p>
        )}
      </div>
      {isExchangeMode ? (
        <div className="exchange-help" role="status" aria-live="polite">
          <strong>Touchez les lettres à remplacer, puis appuyez sur Échanger.</strong>
          <span>Échanger passe votre tour. Vous pouvez encore annuler avant de confirmer.</span>
        </div>
      ) : null}
      {touchDrag?.active ? (
        <span
          className="touch-drag-tile"
          style={{ left: `${touchDrag.x}px`, top: `${touchDrag.y}px` }}
          aria-hidden="true"
        >
          <span>{touchDrag.letter}</span>
          <small>{touchDrag.value}</small>
        </span>
      ) : null}
    </div>
  );
}
