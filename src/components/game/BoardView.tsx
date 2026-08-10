import { Board, getBoardCenter } from "../../domain/tiles/types";
import type { BonusKind } from "../../domain/tiles/types";
import type { BestMoveHint } from "../../domain/turns/hints";
import { useRef } from "react";
import type { DragEvent, PointerEvent } from "react";

const TILE_DRAG_MIME = "text/serenimot-tile-id";

type BoardViewProps = {
  board: Board;
  selectedBoardCellKey: string | null;
  referenceBoardCellKey: string | null;
  hint: BestMoveHint | null;
  hintAreaCellKeys: string[];
  hintAnchorCellKeys: string[];
  hintPositionCellKeys: string[];
  hintPreviewCells: BoardPreviewCell[];
  preparedBoardTileKeys: string[];
  preparedPreviewCells: BoardPreviewCell[];
  errorPreviewCells: BoardPreviewCell[];
  invalidCellKeys: string[];
  newWordCellKeys: string[];
  lastMoveCellKeys: string[];
  animatedCellKeys: string[];
  bonusAnimationCells: BoardBonusAnimationCell[];
  boardScorePreview: BoardScorePreview | null;
  isPendingWordSelected: boolean;
  floatingPreparedWord: BoardFloatingWord | null;
  floatingScorePreview: number | null;
  onCellClick: (row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onTileDrop: (tileId: string, row: number, col: number) => void;
};

export type BoardPreviewCell = {
  row: number;
  col: number;
  letter: string;
};

export type BoardFloatingWord = {
  word: string;
  direction: "row" | "col";
  row?: number;
  col?: number;
};

export type BoardScorePreview = {
  row: number;
  col: number;
  score: number;
};

export type BoardBonusAnimationCell = {
  row: number;
  col: number;
  bonus: Exclude<BonusKind, "plain">;
};

type TouchTileDrag = {
  tileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
};

const BONUS_LABELS: Record<BonusKind, string> = {
  plain: "",
  letter: "Lx2",
  letter3: "Lx3",
  word: "Mx2",
  word3: "Mx3",
  calm: "+1"
};

const BONUS_NAMES: Record<BonusKind, string> = {
  plain: "case simple",
  letter: "case lettre doublée",
  letter3: "case lettre triplée",
  word: "case mot doublé",
  word3: "case mot triplé",
  calm: "case Sérénité, plus 1 point"
};

const BONUS_HINTS: Record<BonusKind, string> = {
  plain: "Case simple",
  letter: "Lettre x2 : la lettre posée ici compte double.",
  letter3: "Lettre x3 : la lettre posée ici compte triple.",
  word: "Mot x2 : le mot formé avec cette case compte double.",
  word3: "Mot x3 : le mot formé avec cette case compte triple.",
  calm: "Sérénité +1 : la lettre posée ici gagne 1 point."
};

export function BoardView({
  board,
  selectedBoardCellKey,
  referenceBoardCellKey,
  hint,
  hintAreaCellKeys,
  hintAnchorCellKeys,
  hintPositionCellKeys,
  hintPreviewCells,
  preparedBoardTileKeys,
  preparedPreviewCells,
  errorPreviewCells,
  invalidCellKeys,
  newWordCellKeys,
  lastMoveCellKeys,
  animatedCellKeys,
  bonusAnimationCells,
  boardScorePreview,
  isPendingWordSelected,
  floatingPreparedWord,
  floatingScorePreview,
  onCellClick,
  onCellDoubleClick,
  onTileDrop
}: BoardViewProps) {
  const center = getBoardCenter(board);
  const touchDragRef = useRef<TouchTileDrag | null>(null);
  const ignoreNextClickRef = useRef(false);

  function handleCellPress(row: number, col: number) {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }

    onCellClick(row, col);
  }

  function handleTilePointerDown(event: PointerEvent<HTMLElement>, tileId: string) {
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

  function handleTilePointerMove(event: PointerEvent<HTMLElement>) {
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

  function handleTilePointerUp(event: PointerEvent<HTMLElement>) {
    const drag = touchDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    touchDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!drag.dragging) {
      return;
    }

    event.preventDefault();
    ignoreNextClickRef.current = true;

    const targetCell = getBoardCellFromPoint(event.clientX, event.clientY);

    if (targetCell) {
      onTileDrop(drag.tileId, targetCell.row, targetCell.col);
    }
  }

  return (
    <div className="board-shell" aria-label="Plateau de jeu">
      <div className="board-stage">
        <div
          className="board"
          role="grid"
          aria-rowcount={board.length}
          aria-colcount={board.length}
          style={{ gridTemplateColumns: `repeat(${board.length}, var(--cell))` }}
        >
          {board.flatMap((row) =>
            row.map((cell) => {
              const tile = cell.tile;
              const hintLetter = getHintLetter(hint, cell.row, cell.col);
              const hintPreviewLetter = getPreparedPreviewLetter(hintPreviewCells, cell.row, cell.col);
              const preparedPreviewLetter = getPreparedPreviewLetter(preparedPreviewCells, cell.row, cell.col);
              const errorPreviewLetter = getPreparedPreviewLetter(errorPreviewCells, cell.row, cell.col);
              const previewLetter = errorPreviewLetter ?? hintLetter ?? hintPreviewLetter ?? preparedPreviewLetter;
              const isPreparedBoardTile = preparedBoardTileKeys.includes(`${cell.row}:${cell.col}`);
              const isInvalidCell = invalidCellKeys.includes(`${cell.row}:${cell.col}`);
              const isNewWordCell = newWordCellKeys.includes(`${cell.row}:${cell.col}`);
              const isLastMoveCell = lastMoveCellKeys.includes(`${cell.row}:${cell.col}`);
              const cellKey = `${cell.row}:${cell.col}`;
              const isSelectedBoardCell = selectedBoardCellKey === cellKey;
              const isReferenceBoardCell = referenceBoardCellKey === cellKey;
              const isHintAreaCell = hintAreaCellKeys.includes(cellKey);
              const isHintAnchorCell = hintAnchorCellKeys.includes(cellKey);
              const isHintPositionCell = hintPositionCellKeys.includes(cellKey);
              const isNearLeftEdge = cell.col <= 1;
              const isNearRightEdge = cell.col >= board.length - 2;
              const isNearTopEdge = cell.row <= 1;
              const isAnimatedCell = animatedCellKeys.includes(cellKey);
              const isConsumedBonus = Boolean(tile?.committed && cell.bonus !== "plain");
              const bonusHint = isConsumedBonus
                ? `${BONUS_NAMES[cell.bonus]} déjà utilisée : le bonus ne s'applique plus.`
                : BONUS_HINTS[cell.bonus];
              const bonusName = isConsumedBonus ? `${BONUS_NAMES[cell.bonus]} déjà utilisée` : BONUS_NAMES[cell.bonus];
              const bonusAnimation = bonusAnimationCells.find(
                (animationCell) => animationCell.row === cell.row && animationCell.col === cell.col
              );
              const label = tile
                ? `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, lettre ${tile.letter}${cell.bonus !== "plain" ? `, ${bonusName}` : ""}${isReferenceBoardCell ? ", début du mot en cours" : ""}${isPreparedBoardTile ? ", choisie dans le mot préparé" : ""}${isNewWordCell ? ", dans un mot créé par ce coup" : ""}${isLastMoveCell ? ", lettre du dernier coup joué" : ""}${isAnimatedCell ? ", lettre jouée par le robot" : ""}${bonusAnimation ? `, bonus ${BONUS_NAMES[bonusAnimation.bonus]} appliqué` : ""}${isInvalidCell ? ", à vérifier" : ""}`
                : previewLetter
                  ? `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, aperçu lettre ${previewLetter}${hintPreviewLetter ? ", lettre révélée par l'indice" : ""}${errorPreviewLetter ? ", pose refusée" : ""}`
                  : isHintPositionCell
                    ? `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, case exacte de l'indice`
                    : isHintAnchorCell
                      ? `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, lettre du plateau utilisée par l'indice`
                    : isHintAreaCell
                      ? `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, zone possible pour l'indice`
                    : `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, ${bonusName}${isSelectedBoardCell ? ", case sélectionnée" : ""}`;

              return (
                <button
                  className={`board-cell bonus-${cell.bonus} ${cell.row === center && cell.col === center ? "center-cell" : ""} ${isNearLeftEdge ? "tooltip-left-edge" : ""} ${isNearRightEdge ? "tooltip-right-edge" : ""} ${isNearTopEdge ? "tooltip-top-edge" : ""} ${isHintAreaCell ? "hint-area-cell" : ""} ${isHintAnchorCell ? "hint-anchor-cell" : ""} ${isHintPositionCell ? "hint-position-cell" : ""} ${isSelectedBoardCell ? "selected-board-cell" : ""} ${isLastMoveCell ? "last-move-cell" : ""} ${isNewWordCell ? "new-word-cell" : ""} ${isAnimatedCell ? "computer-move-cell" : ""} ${bonusAnimation ? `bonus-score-cell bonus-score-${bonusAnimation.bonus}-cell` : ""} ${isInvalidCell ? "invalid-cell" : ""}`}
                  key={`${cell.row}-${cell.col}`}
                  type="button"
                  role="gridcell"
                  data-row={cell.row}
                  data-col={cell.col}
                  aria-label={label}
                  aria-pressed={isPreparedBoardTile || isSelectedBoardCell}
                  onClick={() => handleCellPress(cell.row, cell.col)}
                  onDoubleClick={() => onCellDoubleClick(cell.row, cell.col)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const tileId = getDraggedTileId(event);

                    if (tileId) {
                      onTileDrop(tileId, cell.row, cell.col);
                    }
                  }}
                >
                  {tile ? (
                    <span
                      className={`board-tile ${tile.committed ? "committed" : "pending"} ${isPendingWordSelected && !tile.committed && tile.owner === "human" ? "selected-pending-word-tile" : ""} ${isReferenceBoardCell ? "reference-board-tile" : ""} ${isPreparedBoardTile ? "selected-board-tile" : ""} ${isAnimatedCell ? "computer-move-tile" : ""} ${isInvalidCell ? "invalid-board-tile" : ""}`}
                      draggable={!tile.committed && tile.owner === "human"}
                      onDragStart={(event) => {
                        if (tile.committed || tile.owner !== "human") {
                          return;
                        }

                        setDraggedTileId(event, tile.id);
                      }}
                      onPointerDown={(event) => {
                        if (tile.committed || tile.owner !== "human") {
                          return;
                        }

                        handleTilePointerDown(event, tile.id);
                      }}
                      onPointerMove={handleTilePointerMove}
                      onPointerUp={handleTilePointerUp}
                      onPointerCancel={() => {
                        touchDragRef.current = null;
                      }}
                    >
                      <span className="board-tile-letter">{tile.letter}</span>
                      <small>{tile.value}</small>
                    </span>
                  ) : previewLetter ? (
                    <span
                      className={`hint-tile ${hintPreviewLetter && !hintLetter ? "hint-preview-tile" : ""} ${preparedPreviewLetter && !hintLetter && !hintPreviewLetter ? "prepared-preview-tile" : ""} ${errorPreviewLetter ? "invalid-preview-tile" : ""}`}
                      aria-hidden="true"
                    >
                      {previewLetter}
                    </span>
                  ) : (
                    <>
                      <span className="bonus-label" aria-hidden="true">
                        {BONUS_LABELS[cell.bonus]}
                      </span>
                    </>
                  )}
                  {cell.bonus !== "plain" ? (
                    <span className="bonus-tooltip" aria-hidden="true">
                      {bonusHint}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        {boardScorePreview ? <BoardScoreBadge preview={boardScorePreview} /> : null}
        {floatingPreparedWord ? (
          <FloatingPreparedWord
            preview={floatingPreparedWord}
            scorePreview={floatingScorePreview}
          />
        ) : null}
      </div>
    </div>
  );
}

function setDraggedTileId(event: DragEvent<HTMLElement>, tileId: string) {
  event.dataTransfer.setData(TILE_DRAG_MIME, tileId);
  event.dataTransfer.setData("text/plain", tileId);
  event.dataTransfer.effectAllowed = "move";
}

function getDraggedTileId(event: DragEvent<HTMLElement>): string {
  return event.dataTransfer.getData(TILE_DRAG_MIME) || event.dataTransfer.getData("text/plain");
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

function BoardScoreBadge({ preview }: { preview: BoardScorePreview }) {
  return (
    <strong
      className="board-score-preview"
      style={{
        left: `calc((${preview.col} * (var(--cell) + 0.18rem)) + (var(--cell) / 2))`,
        top: `calc((${preview.row} * (var(--cell) + 0.18rem)) - 0.35rem)`
      }}
      aria-label={`Score prévu ${preview.score} points`}
    >
      +{preview.score} pt{preview.score > 1 ? "s" : ""}
    </strong>
  );
}

type FloatingPreparedWordProps = {
  preview: BoardFloatingWord;
  scorePreview: number | null;
};

function FloatingPreparedWord({
  preview,
  scorePreview
}: FloatingPreparedWordProps) {
  return (
    <div
      className={`floating-prepared-word floating-prepared-word-${preview.direction}`}
      style={getFloatingWordStyle(preview)}
      aria-label={`Aperçu du mot préparé ${preview.word}`}
    >
      {[...preview.word].map((letter, index) => (
        <span key={`${letter}-${index}`}>{letter}</span>
      ))}
      {scorePreview !== null ? (
        <strong className="floating-score-preview">
          {scorePreview} pt{scorePreview > 1 ? "s" : ""}
        </strong>
      ) : null}
    </div>
  );
}

function getFloatingWordStyle(preview: BoardFloatingWord): { left?: string; top?: string } | undefined {
  if (preview.row === undefined || preview.col === undefined) {
    return undefined;
  }

  return {
    left: `calc(${preview.col} * (var(--cell) + 0.18rem) + var(--cell) / 2)`,
    top: `calc(${preview.row} * (var(--cell) + 0.18rem) + var(--cell) / 2)`
  };
}

function getPreparedPreviewLetter(previewCells: BoardPreviewCell[], row: number, col: number): string | null {
  return previewCells.find((cell) => cell.row === row && cell.col === col)?.letter ?? null;
}

function getHintLetter(hint: BestMoveHint | null, row: number, col: number): string | null {
  if (!hint) {
    return null;
  }

  for (let index = 0; index < hint.word.length; index += 1) {
    const hintRow = hint.direction === "col" ? hint.row + index : hint.row;
    const hintCol = hint.direction === "row" ? hint.col + index : hint.col;

    if (hintRow === row && hintCol === col) {
      return hint.word[index];
    }
  }

  return null;
}
