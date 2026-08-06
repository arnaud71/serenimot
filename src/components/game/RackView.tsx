import { Rack } from "../../domain/tiles/types";

type RackViewProps = {
  rack: Rack;
  preparedTileIds: string[];
  onAddTile: (tileId: string) => void;
  onDropTile: (tileId: string) => void;
};

const TILE_DRAG_MIME = "text/serenimot-tile-id";

export function RackView({ rack, preparedTileIds, onAddTile, onDropTile }: RackViewProps) {
  const availableTiles = rack.filter((tile) => !preparedTileIds.includes(tile.id));

  return (
    <div className="preparation-subsection">
      <h3 id="rack-title">Vos lettres</h3>
      <div
        className="rack"
        role="list"
        aria-label="Chevalet"
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
          availableTiles.map((tile) => (
            <button
              className="rack-tile"
              draggable
              key={tile.id}
              type="button"
              aria-label={`Ajouter la lettre ${tile.letter}, valeur ${tile.value}`}
              onClick={() => onAddTile(tile.id)}
              onDragStart={(event) => {
                event.dataTransfer.setData(TILE_DRAG_MIME, tile.id);
                event.dataTransfer.setData("text/plain", tile.id);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <span>{tile.letter}</span>
              <small>{tile.value}</small>
            </button>
          ))
        ) : (
          <p className="rack-empty">Toutes vos lettres sont dans le chevalet.</p>
        )}
      </div>
    </div>
  );
}
