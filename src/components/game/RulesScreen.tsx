import { createBoard } from "../../domain/board/board";
import { DICTIONARY_LABEL, ORIGINAL_LEXICON_LABEL } from "../../domain/rules/dictionary";
import { LETTER_DISTRIBUTION } from "../../domain/tiles/bag";
import { BonusKind, RACK_SIZE } from "../../domain/tiles/types";

type RulesScreenProps = {
  hasGame: boolean;
  onBack: () => void;
  onLexiconRequest: () => void;
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

const INTERACTION_GUIDES = [
  {
    title: "Vue générale sur ordinateur",
    image: "/static/docs/interactions/01-desktop-game-overview.png",
    alt: "Vue générale de la partie sur ordinateur avec le plateau et la zone de préparation.",
    description:
      "Le plateau occupe la zone principale. La réserve, le chevalet, les actions et les messages restent visibles à droite."
  },
  {
    title: "Sélectionner une case vide",
    image: "/static/docs/interactions/02-board-empty-cell-selected.png",
    alt: "Case vide sélectionnée sur le plateau.",
    description:
      "Touchez ou cliquez une case vide pour la choisir comme destination. La case sélectionnée est mise en évidence."
  },
  {
    title: "Poser une lettre depuis la réserve",
    image: "/static/docs/interactions/03-board-letter-placed-from-rack.png",
    alt: "Lettre posée sur la case sélectionnée depuis les lettres disponibles.",
    description:
      "Après avoir choisi une case, touchez une lettre disponible. Elle est posée immédiatement sur le plateau."
  },
  {
    title: "Déplacer une lettre déjà posée",
    image: "/static/docs/interactions/06-board-letter-moved-to-selected-cell.png",
    alt: "Lettre déjà posée déplacée vers une case précédemment sélectionnée.",
    description:
      "Si une case vide est déjà sélectionnée, touchez une lettre posée pendant le tour pour la déplacer vers cette case."
  },
  {
    title: "Préparer un mot dans le chevalet",
    image: "/static/docs/interactions/08-prepared-word-in-rack.png",
    alt: "Mot préparé dans le chevalet avant d'être posé.",
    description:
      "Le chevalet permet d'organiser plusieurs lettres avant de poser le mot en une seule action. Il reste possible de déplacer les lettres dans le chevalet avant la pose."
  },
  {
    title: "Poser un mot préparé",
    image: "/static/docs/interactions/09-prepared-word-placed-on-board.png",
    alt: "Mot préparé posé sur le plateau.",
    description:
      "Quand plusieurs lettres sont préparées, touchez une case compatible. Le jeu cherche une pose horizontale ou verticale valide à partir de cette case."
  },
  {
    title: "Vue smartphone",
    image: "/static/docs/interactions/10-mobile-game-overview.png",
    alt: "Vue générale de la partie sur smartphone.",
    description:
      "Sur téléphone, le plateau reste prioritaire et la zone de préparation est placée sous le plateau."
  },
  {
    title: "Actions rapides mobiles",
    image: "/static/docs/interactions/12-mobile-quick-actions.png",
    alt: "Barre d'actions rapides sur smartphone.",
    description:
      "La barre mobile regroupe les actions utiles pendant le tour : valider, demander un indice, passer, reprendre et effacer."
  }
];

export function RulesScreen({ hasGame, onBack, onLexiconRequest }: RulesScreenProps) {
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
              <li>Posez les lettres une par une ou préparez un mot dans le chevalet.</li>
              <li>Touchez une case vide du plateau pour choisir la destination d'une lettre.</li>
              <li>Touchez une case compatible pour poser un mot préparé de plusieurs lettres.</li>
              <li>Validez seulement quand le mot est correct.</li>
              <li>Vous pouvez déplacer, retirer, reprendre, effacer ou annuler votre coup avant validation.</li>
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

        <section className="rules-section" aria-labelledby="interaction-doc-title">
          <h2 id="interaction-doc-title">Documentation des interactions</h2>
          <p>
            Le jeu propose toujours une alternative au glisser-déposer. Les gestes principaux
            fonctionnent à la souris, au trackpad ou au toucher selon l'appareil.
          </p>
          <div className="interaction-guide-grid">
            {INTERACTION_GUIDES.map((guide) => (
              <figure className="interaction-guide-card" key={guide.image}>
                <img src={guide.image} alt={guide.alt} loading="lazy" />
                <figcaption>
                  <strong>{guide.title}</strong>
                  <span>{guide.description}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="interaction-summary" role="list" aria-label="Résumé des gestes">
            <p role="listitem">
              <strong>Case vide du plateau.</strong> Elle devient la destination sélectionnée.
            </p>
            <p role="listitem">
              <strong>Case sélectionnée puis lettre disponible.</strong> La lettre est posée sur
              cette case.
            </p>
            <p role="listitem">
              <strong>Case sélectionnée puis lettre déjà posée ce tour.</strong> La lettre est
              déplacée vers cette case.
            </p>
            <p role="listitem">
              <strong>Lettre déjà posée, sans case sélectionnée.</strong> Seule cette lettre est
              retirée du plateau.
            </p>
            <p role="listitem">
              <strong>Emplacement vide du chevalet puis lettre.</strong> La lettre se déplace vers
              cet emplacement.
            </p>
            <p role="listitem">
              <strong>Glisser-déposer.</strong> Il reste possible depuis la réserve, le chevalet ou
              une lettre déjà posée.
            </p>
            <p role="listitem">
              <strong>Lettre déjà validée.</strong> Elle peut servir de repère dans un mot préparé si
              elle correspond à la lettre attendue.
            </p>
          </div>
          <p>
            La version complète destinée au dépôt, avec toutes les captures, est disponible dans :
            docs/interactions.md.
          </p>
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
          <button type="button" onClick={onLexiconRequest}>
            Voir la page Lexique
          </button>
        </section>

        <section className="rules-section" aria-labelledby="anti-confusion-title">
          <h2 id="anti-confusion-title">Anti-confusion</h2>
          <p>
            Sérénimot est un jeu original et indépendant de lettres croisées sur grille. Il n'est
            pas affilié à Scrabble, Mattel, Hasbro, Larousse, la FISF ou une fédération de jeu de
            lettres.
          </p>
          <p>
            Le jeu utilise son propre nom, son propre plateau, sa propre disposition de bonus, ses
            propres règles, son propre système de score et un lexique ouvert documenté. Il ne reprend
            pas le plateau officiel, les règles officielles ni un dictionnaire officiel de
            compétition.
          </p>
        </section>

        <section className="rules-section" aria-labelledby="about-title">
          <h2 id="about-title">À propos de l'application</h2>
          <p>
            Sérénimot fonctionne localement dans votre navigateur ou dans l'application installée.
            Aucune inscription n'est demandée, aucune donnée personnelle n'est collectée et aucune
            publicité n'est affichée. L'application est gratuite et son code est ouvert.
          </p>
          <p>
            L'application est actuellement hébergée gratuitement avec GitHub Pages. Elle a été
            conçue en vibecoding avec Codex, dans l'idée de créer rapidement une application
            directement utilisable, facile à prendre en main et sans compte utilisateur.
          </p>
          <p>
            Le projet devait d'abord tourner confortablement sur ordinateur. Une version smartphone
            et tablette a ensuite été ajoutée, avec le risque assumé que l'interface tactile soit un
            peu plus dense ou plus complexe selon la taille de l'écran.
          </p>
          <p>
            La baisse du coût de développement pourrait encourager un mouvement similaire pour des
            jeux captifs, sobres, indépendants, sans publicité et adaptés à des usages précis.
          </p>
          <p>
            Vous pouvez me joindre à arnaud point gaudinat arobas gmail point com. Je ne garantis
            pas une réponse ; merci par avance pour votre compréhension.
          </p>
        </section>
      </section>
    </main>
  );
}
