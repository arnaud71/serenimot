import { useEffect, useRef, useState } from "react";
import type { DragEvent, PointerEvent, Ref } from "react";
import { Board, getBoardCenter } from "../../domain/tiles/types";
import type { BonusKind } from "../../domain/tiles/types";
import type { BestMoveHint } from "../../domain/turns/hints";

type BoardViewProps = {
  board: Board;
  selectedTileId: string | null;
  selectedBoardCellKey: string | null;
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
  onPendingWordDrop: (row: number, col: number, sourceRow?: number, sourceCol?: number) => void;
  onTileDrop: (tileId: string, row: number, col: number) => void;
  onFloatingWordDrag: (row: number, col: number) => void;
  onFloatingWordDragEnd: () => void;
  onFloatingWordDrop: (row: number, col: number) => void;
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

const TILE_DRAG_MIME = "text/serenimot-tile-id";
const PENDING_WORD_DRAG_MIME = "text/serenimot-pending-word";

export function BoardView({
  board,
  selectedTileId,
  selectedBoardCellKey,
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
  onPendingWordDrop,
  onTileDrop,
  onFloatingWordDrag,
  onFloatingWordDragEnd,
  onFloatingWordDrop
}: BoardViewProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const floatingWordRef = useRef<HTMLDivElement | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingFloatingWord, setIsDraggingFloatingWord] = useState(false);
  const [expandedBonusKey, setExpandedBonusKey] = useState<string | null>(null);
  const center = getBoardCenter(board);

  useEffect(() => {
    setDragPosition(null);
    setIsDraggingFloatingWord(false);
  }, [floatingPreparedWord?.word, floatingPreparedWord?.direction]);

  function handleFloatingPointerDown(event: PointerEvent<HTMLDivElement>) {
    const boardRect = boardRef.current?.getBoundingClientRect();

    if (!boardRect || !floatingPreparedWord) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingFloatingWord(true);
    const nextPosition = {
      x: event.clientX - boardRect.left,
      y: event.clientY - boardRect.top
    };
    setDragPosition(nextPosition);
    const dragCell = getFloatingWordDropCellFromPosition(boardRef.current, nextPosition, floatingPreparedWord);
    if (dragCell) {
      onFloatingWordDrag(dragCell.row, dragCell.col);
    } else {
      onFloatingWordDragEnd();
    }
  }

  function handleFloatingPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingFloatingWord || !floatingPreparedWord) {
      return;
    }

    const boardRect = boardRef.current?.getBoundingClientRect();

    if (!boardRect) {
      return;
    }

    const nextPosition = {
      x: event.clientX - boardRect.left,
      y: event.clientY - boardRect.top
    };
    setDragPosition(nextPosition);
    const dragCell = getFloatingWordDropCellFromPosition(boardRef.current, nextPosition, floatingPreparedWord);
    if (dragCell) {
      onFloatingWordDrag(dragCell.row, dragCell.col);
    } else {
      onFloatingWordDragEnd();
    }
  }

  function handleFloatingPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingFloatingWord || !floatingPreparedWord) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDraggingFloatingWord(false);

    const boardRect = boardRef.current?.getBoundingClientRect();
    const dropCell = boardRect
      ? getFloatingWordDropCellFromPosition(
          boardRef.current,
          {
            x: event.clientX - boardRect.left,
            y: event.clientY - boardRect.top
          },
          floatingPreparedWord
        )
      : null;
    if (dropCell) {
      onFloatingWordDrop(dropCell.row, dropCell.col);
    } else {
      onFloatingWordDragEnd();
    }
  }

  return (
    <div className="board-shell" aria-label="Plateau de jeu">
      <div className="board-stage">
        <div
          ref={boardRef}
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
              const isHintAreaCell = hintAreaCellKeys.includes(cellKey);
              const isHintAnchorCell = hintAnchorCellKeys.includes(cellKey);
              const isHintPositionCell = hintPositionCellKeys.includes(cellKey);
              const isNearLeftEdge = cell.col <= 1;
              const isNearRightEdge = cell.col >= board.length - 2;
              const isNearTopEdge = cell.row <= 1;
              const isExpandedBonus = expandedBonusKey === cellKey;
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
                ? `Ligne ${cell.row + 1}, colonne ${cell.col + 1}, lettre ${tile.letter}${cell.bonus !== "plain" ? `, ${bonusName}` : ""}${isPreparedBoardTile ? ", choisie dans le mot préparé" : ""}${isNewWordCell ? ", dans un mot créé par ce coup" : ""}${isLastMoveCell ? ", lettre du dernier coup joué" : ""}${isAnimatedCell ? ", lettre jouée par l'ordinateur" : ""}${bonusAnimation ? `, bonus ${BONUS_NAMES[bonusAnimation.bonus]} appliqué` : ""}${isInvalidCell ? ", à vérifier" : ""}`
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
                  className={`board-cell bonus-${cell.bonus} ${cell.row === center && cell.col === center ? "center-cell" : ""} ${isNearLeftEdge ? "tooltip-left-edge" : ""} ${isNearRightEdge ? "tooltip-right-edge" : ""} ${isNearTopEdge ? "tooltip-top-edge" : ""} ${isHintAreaCell ? "hint-area-cell" : ""} ${isHintAnchorCell ? "hint-anchor-cell" : ""} ${isHintPositionCell ? "hint-position-cell" : ""} ${isSelectedBoardCell ? "selected-board-cell" : ""} ${isLastMoveCell ? "last-move-cell" : ""} ${isNewWordCell ? "new-word-cell" : ""} ${isExpandedBonus ? "expanded-bonus-cell" : ""} ${isAnimatedCell ? "computer-move-cell" : ""} ${bonusAnimation ? `bonus-score-cell bonus-score-${bonusAnimation.bonus}-cell` : ""} ${isInvalidCell ? "invalid-cell" : ""}`}
                  key={`${cell.row}-${cell.col}`}
                  type="button"
                  role="gridcell"
                  data-row={cell.row}
                  data-col={cell.col}
                  aria-label={label}
                  aria-pressed={isPreparedBoardTile || isSelectedBoardCell}
                  draggable={Boolean(tile && !tile.committed)}
                  onClick={() => {
                    setExpandedBonusKey(cell.bonus === "plain" || expandedBonusKey === cellKey ? null : cellKey);
                    onCellClick(cell.row, cell.col);
                  }}
                  onDoubleClick={() => onCellDoubleClick(cell.row, cell.col)}
                  onDragStart={(event) => {
                    if (tile && !tile.committed) {
                      event.dataTransfer.setData(PENDING_WORD_DRAG_MIME, `${cell.row}:${cell.col}`);
                      event.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleBoardDrop(event, cell.row, cell.col, onTileDrop, onPendingWordDrop)}
                >
                  {tile ? (
                    <span className={`board-tile ${tile.committed ? "committed" : "pending"} ${isPendingWordSelected && !tile.committed && tile.owner === "human" ? "selected-pending-word-tile" : ""} ${isPreparedBoardTile ? "selected-board-tile" : ""} ${isAnimatedCell ? "computer-move-tile" : ""} ${isInvalidCell ? "invalid-board-tile" : ""}`}>
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
                    <span className={`bonus-tooltip${isExpandedBonus ? " bonus-tooltip-expanded" : ""}`} aria-hidden="true">
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
            dragPosition={dragPosition}
            isDragging={isDraggingFloatingWord}
            onPointerDown={handleFloatingPointerDown}
            onPointerMove={handleFloatingPointerMove}
            onPointerUp={handleFloatingPointerUp}
            preview={floatingPreparedWord}
            floatingRef={floatingWordRef}
            scorePreview={floatingScorePreview}
          />
        ) : null}
      </div>
    </div>
  );
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

function handleBoardDrop(
  event: DragEvent<HTMLButtonElement>,
  row: number,
  col: number,
  onTileDrop: (tileId: string, row: number, col: number) => void,
  onPendingWordDrop: (row: number, col: number, sourceRow?: number, sourceCol?: number) => void
) {
  event.preventDefault();
  const pendingWord = event.dataTransfer.getData(PENDING_WORD_DRAG_MIME);
  if (pendingWord) {
    const source = parsePendingWordDragSource(pendingWord);
    onPendingWordDrop(row, col, source?.row, source?.col);
    return;
  }

  const tileId = event.dataTransfer.getData(TILE_DRAG_MIME) || event.dataTransfer.getData("text/plain");

  if (tileId) {
    onTileDrop(tileId, row, col);
  }
}

function parsePendingWordDragSource(value: string): { row: number; col: number } | null {
  const match = value.match(/^(\d+):(\d+)$/u);

  if (!match) {
    return null;
  }

  return {
    row: Number(match[1]),
    col: Number(match[2])
  };
}

type FloatingPreparedWordProps = {
  dragPosition: { x: number; y: number } | null;
  floatingRef: Ref<HTMLDivElement>;
  isDragging: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  preview: BoardFloatingWord;
  scorePreview: number | null;
};

function FloatingPreparedWord({
  dragPosition,
  floatingRef,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  preview,
  scorePreview
}: FloatingPreparedWordProps) {
  return (
    <div
      ref={floatingRef}
      className={`floating-prepared-word floating-prepared-word-${preview.direction} ${isDragging ? "dragging" : ""}`}
      style={getFloatingWordStyle(preview, dragPosition)}
      aria-label={`Déplacer le mot préparé ${preview.word}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="button"
      tabIndex={0}
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

function getFloatingWordStyle(
  preview: BoardFloatingWord,
  dragPosition: { x: number; y: number } | null
): { left?: string; top?: string } | undefined {
  if (dragPosition) {
    return {
      left: `${dragPosition.x}px`,
      top: `${dragPosition.y}px`
    };
  }

  if (preview.row === undefined || preview.col === undefined) {
    return undefined;
  }

  return {
    left: `calc(${preview.col} * (var(--cell) + 0.18rem) + var(--cell) / 2)`,
    top: `calc(${preview.row} * (var(--cell) + 0.18rem) + var(--cell) / 2)`
  };
}

function getFloatingWordDropCellFromPosition(
  boardElement: HTMLDivElement | null,
  position: { x: number; y: number },
  preview: BoardFloatingWord
): { row: number; col: number } | null {
  const firstCellRect = boardElement?.querySelector(".board-cell")?.getBoundingClientRect();
  const boardStyle = boardElement ? getComputedStyle(boardElement) : null;

  if (!boardElement || !firstCellRect || !boardStyle) {
    return null;
  }

  const gap = Number.parseFloat(boardStyle.columnGap) || 0;
  const stepX = firstCellRect.width + gap;
  const stepY = firstCellRect.height + gap;
  const firstLetterX =
    preview.direction === "row" ? position.x - ((preview.word.length - 1) * stepX) / 2 : position.x;
  const firstLetterY =
    preview.direction === "col" ? position.y - ((preview.word.length - 1) * stepY) / 2 : position.y;
  const col = Math.floor(firstLetterX / stepX);
  const row = Math.floor(firstLetterY / stepY);

  const boardSize = boardElement.querySelectorAll(".board-cell[data-row='0']").length;

  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
    return null;
  }

  return { row, col };
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
