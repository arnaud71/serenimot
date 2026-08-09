import { Rack } from "../../domain/tiles/types";
import type { DragEvent } from "react";

const TILE_DRAG_MIME = "text/serenimot-tile-id";

type RackViewProps = {
  rack: Rack;
  preparedTileIds: string[];
  exchangeTileIds: string[];
  isExchangeMode: boolean;
  selectedBoardCell: { row: number; col: number } | null;
  selectedPreparedSlotIndex: number | null;
  canRotateBoardWord: boolean;
  rotateBoardWordDirection: "row" | "col";
  onAddTile: (tileId: string) => void;
  onRotateBoardWord: () => void;
  onToggleExchangeTile: (tileId: string) => void;
};

export function RackView({
  rack,
  preparedTileIds,
  exchangeTileIds,
  isExchangeMode,
  selectedBoardCell,
  selectedPreparedSlotIndex,
  canRotateBoardWord,
  rotateBoardWordDirection,
  onAddTile,
  onRotateBoardWord,
  onToggleExchangeTile
}: RackViewProps) {
  const availableTiles = rack.filter((tile) => !preparedTileIds.includes(tile.id));
  const exchangeTileIdSet = new Set(exchangeTileIds);
  const rotateLabel =
    rotateBoardWordDirection === "row"
      ? "Direction actuelle : horizontal. Changer en vertical."
      : "Direction actuelle : vertical. Changer en horizontal.";

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
          {availableTiles.length > 0 ? (
            availableTiles.map((tile) => {
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
        <button
          className="secondary-button rack-direction-button"
          type="button"
          aria-label={rotateLabel}
          onClick={onRotateBoardWord}
          disabled={isExchangeMode || !canRotateBoardWord}
          title="Change la direction du mot en cours"
        >
          <span aria-hidden="true">{rotateBoardWordDirection === "row" ? "↔" : "↕"}</span>
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
