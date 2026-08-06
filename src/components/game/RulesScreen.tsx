import { createBoard } from "../../domain/board/board";
import { DICTIONARY_LABEL, ORIGINAL_LEXICON_LABEL } from "../../domain/rules/dictionary";
import { LETTER_DISTRIBUTION } from "../../domain/tiles/bag";
import { BonusKind, RACK_SIZE } from "../../domain/tiles/types";

type RulesScreenProps = {
  hasGame: boolean;
  onBack: () => void;
};

const BONUS_RULES: Array<{
  kind: BonusKind;
  label: string;
  name: string;
  description: string;
}> = [
  { kind: "calm", label: "+1", name: "Sérénité", description: "ajoute 1 point à la lettre posée sur cette case" },
  { kind: "letter", label: "Lx2", name: "Lettre doublée", description: "double la valeur de la lettre posée" },
  { kind: "letter3", label: "Lx3", name: "Lettre triplée", description: "triple la valeur de la lettre posée" },
  { kind: "word", label: "Mx2", name: "Mot doublé", description: "double le score du mot formé" },
  { kind: "word3", label: "Mx3", name: "Mot triplé", description: "triple le score du mot formé" }
];

export function RulesScreen({ hasGame, onBack }: RulesScreenProps) {
  const totalTiles = LETTER_DISTRIBUTION.reduce((total, entry) => total + entry.count, 0);
  const board = createBoard();
  const bonusCounts = new Map<BonusKind, number>();

  for (const cell of board.flatMap((row) => row)) {
    bonusCounts.set(cell.bonus, (bonusCounts.get(cell.bonus) ?? 0) + 1);
  }

  return (
    <main className="rules-layout">
      <section className="rules-panel" aria-labelledby="rules-title">
        <div className="rules-heading">
          <div>
            <p className="eyebrow">Aide</p>
            <h1 id="rules-title">Règles du jeu</h1>
          </div>
          <button type="button" onClick={onBack}>
            {hasGame ? "Retour à la partie" : "Retour"}
          </button>
        </div>

        <section className="rules-section" aria-labelledby="rules-goal-title">
          <h2 id="rules-goal-title">But</h2>
          <p>
            Formez des mots sur le plateau pour marquer des points. Chaque mot posé doit être
            reconnu par le dictionnaire actuel et se connecter au plateau après le premier coup.
          </p>
        </section>

        <section className="rules-grid">
          <article className="rules-section">
            <h2>Tour de jeu</h2>
            <ul>
              <li>Préparez un mot avec les lettres du chevalet.</li>
              <li>Choisissez le sens horizontal ou vertical.</li>
              <li>Touchez la case de départ ou déplacez le mot flottant.</li>
              <li>Validez seulement quand le mot est correct.</li>
              <li>Vous pouvez retirer, effacer ou annuler votre coup avant validation.</li>
            </ul>
          </article>

          <article className="rules-section">
            <h2>Placement</h2>
            <ul>
              <li>Le premier mot doit passer par la case centrale.</li>
              <li>Les coups suivants doivent toucher au moins une lettre déjà posée.</li>
              <li>Les lettres d'un même coup restent sur une ligne ou une colonne.</li>
              <li>Le mot principal doit être continu, sans trou.</li>
              <li>Les mots croisés créés doivent aussi exister dans le dictionnaire.</li>
            </ul>
          </article>
        </section>

        <section className="rules-section" aria-labelledby="score-title">
          <h2 id="score-title">Score et bonus</h2>
          <p>
            Les lettres déjà présentes comptent avec leur valeur simple. Les bonus ne s'appliquent
            qu'aux nouvelles lettres du tour. Si les {RACK_SIZE} lettres du chevalet sont utilisées
            dans le même coup, un bonus de 12 points est ajouté.
          </p>
          <div className="bonus-rules">
            {BONUS_RULES.map((bonus) => (
              <div className="bonus-rule" key={bonus.label}>
                <span>{bonus.label}</span>
                <strong>{bonus.name}</strong>
                <em>
                  {bonusCounts.get(bonus.kind) ?? 0} case
                  {(bonusCounts.get(bonus.kind) ?? 0) > 1 ? "s" : ""}
                </em>
                <p>{bonus.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rules-section" aria-labelledby="distribution-title">
          <h2 id="distribution-title">Distribution des lettres</h2>
          <p>
            La pioche contient {totalTiles} tuiles. Cette distribution est originale et adaptée au
            prototype Sérénimot.
          </p>
          <div className="letter-distribution" role="table" aria-label="Distribution des lettres">
            <div className="distribution-header" role="row">
              <span role="columnheader">Lettre</span>
              <span role="columnheader">Nombre</span>
              <span role="columnheader">Valeur</span>
            </div>
            {LETTER_DISTRIBUTION.map((entry) => (
              <div className="distribution-row" role="row" key={entry.letter}>
                <strong role="cell">{entry.letter}</strong>
                <span role="cell">{entry.count}</span>
                <span role="cell">{entry.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rules-section" aria-labelledby="dictionary-title">
          <h2 id="dictionary-title">Dictionnaire</h2>
          <p>
            Le prototype utilise {DICTIONARY_LABEL}, un dictionnaire local basé sur{" "}
            {ORIGINAL_LEXICON_LABEL}. Les accents sont normalisés pour comparer les mots avec les
            lettres du jeu.
          </p>
        </section>
      </section>
    </main>
  );
}
