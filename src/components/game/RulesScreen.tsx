import { useState } from "react";
import { FloatingBackButton } from "../common/FloatingBackButton";
import {
  BUG_REPORT_URL,
  FEATURE_REQUEST_URL,
  GITHUB_PAGES_APP_URL,
  OFFICIAL_SITE_URL,
  PROJECT_REPOSITORY_URL
} from "../../app/links";
import { APP_VERSION, APP_VERSION_DETAIL } from "../../app/version";
import { createBoard } from "../../domain/board/board";
import { DICTIONARY_LABEL, ORIGINAL_LEXICON_LABEL } from "../../domain/rules/dictionary";
import { getLetterDistributionForBoardSize, getTileCountForBoardSize } from "../../domain/tiles/bag";
import { BoardSize, BonusKind, RACK_SIZE } from "../../domain/tiles/types";

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

const DOCS_IMAGE_BASE_URL = `${import.meta.env.BASE_URL}static/docs/interactions/`;

const INTERACTION_GUIDES = [
  {
    title: "Vue générale sur ordinateur",
    image: `${DOCS_IMAGE_BASE_URL}01-desktop-game-overview.png`,
    alt: "Vue générale de la partie sur ordinateur avec le plateau et la zone de préparation.",
    description:
      "Le plateau occupe la zone principale. La réserve, le chevalet, les actions et les messages restent visibles à droite."
  },
  {
    title: "Sélectionner une case vide",
    image: `${DOCS_IMAGE_BASE_URL}02-board-empty-cell-selected.png`,
    alt: "Case vide sélectionnée sur le plateau.",
    description:
      "Touchez ou cliquez une case vide pour la choisir comme destination. La case sélectionnée est mise en évidence."
  },
  {
    title: "Poser une lettre depuis la réserve",
    image: `${DOCS_IMAGE_BASE_URL}03-board-letter-placed-from-rack.png`,
    alt: "Lettre posée sur la case sélectionnée depuis les lettres disponibles.",
    description:
      "Après avoir choisi une case, touchez une lettre disponible. Elle est posée immédiatement sur le plateau."
  },
  {
    title: "Déplacer une suite posée",
    image: `${DOCS_IMAGE_BASE_URL}06-board-letter-moved-to-selected-cell.png`,
    alt: "Suite de lettres déplacée sur le plateau pendant le tour.",
    description:
      "Touchez une case vide ou une lettre du mot posé : le début du mot est déplacé à cet endroit."
  },
  {
    title: "Préparer un mot dans le chevalet",
    image: `${DOCS_IMAGE_BASE_URL}08-prepared-word-in-rack.png`,
    alt: "Mot préparé dans le chevalet avant d'être posé.",
    description:
      "Le chevalet permet d'organiser plusieurs lettres avant de poser le mot en une seule action."
  },
  {
    title: "Poser un mot préparé",
    image: `${DOCS_IMAGE_BASE_URL}09-prepared-word-placed-on-board.png`,
    alt: "Mot préparé posé sur le plateau.",
    description:
      "Quand plusieurs lettres sont préparées, touchez une case compatible. Le jeu cherche une pose horizontale ou verticale valide à partir de cette case."
  },
  {
    title: "Vue smartphone",
    image: `${DOCS_IMAGE_BASE_URL}10-mobile-game-overview.png`,
    alt: "Vue générale de la partie sur smartphone.",
    description:
      "Sur téléphone, le plateau reste prioritaire et la zone de préparation est placée sous le plateau."
  },
  {
    title: "Actions rapides mobiles",
    image: `${DOCS_IMAGE_BASE_URL}12-mobile-quick-actions.png`,
    alt: "Barre d'actions rapides sur smartphone.",
    description:
      "La barre mobile regroupe les actions utiles pendant le tour : valider, demander un indice, passer, reprendre et effacer."
  }
];

const BOARD_TILE_COUNTS: BoardSize[] = [9, 11, 13, 15, 17];

export function RulesScreen({ hasGame, onBack, onLexiconRequest }: RulesScreenProps) {
  const [selectedDistributionSize, setSelectedDistributionSize] = useState<BoardSize>(13);
  const selectedDistribution = getLetterDistributionForBoardSize(selectedDistributionSize);
  const selectedDistributionTileCount = getTileCountForBoardSize(selectedDistributionSize);
  const board = createBoard();
  const bonusCounts = new Map<BonusKind, number>();

  for (const cell of board.flatMap((row) => row)) {
    bonusCounts.set(cell.bonus, (bonusCounts.get(cell.bonus) ?? 0) + 1);
  }

  return (
    <main className="rules-layout">
      <FloatingBackButton label={hasGame ? "Partie" : "Accueil"} onClick={onBack} />
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
              <li>Vous pouvez retirer, reprendre, effacer ou annuler votre coup avant validation.</li>
              <li>Vous pouvez échanger des lettres disponibles si la pioche contient assez de lettres ; cela passe votre tour.</li>
            </ul>
          </article>

          <article className="rules-section">
            <h2>Échange</h2>
            <ul>
              <li>Appuyez sur Échanger pour choisir les lettres à remplacer.</li>
              <li>Si des lettres sont sur le plateau ou dans le chevalet, elles reviennent d'abord dans Vos lettres.</li>
              <li>Touchez les lettres voulues dans Vos lettres, puis appuyez à nouveau sur Échanger.</li>
              <li>Les lettres choisies retournent dans la pioche et vous recevez le même nombre de lettres.</li>
              <li>Pendant la sélection, Indice et Passer restent visibles mais ne sont pas cliquables.</li>
              <li>Annuler permet de quitter la sélection avant de confirmer l'échange.</li>
              <li>L'échange n'est disponible que si la pioche suffit.</li>
              <li>Après l'échange, le jeu vérifie la fin de partie comme après un tour passé.</li>
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

          <article className="rules-section">
            <h2>Fin de partie</h2>
            <ul>
              <li>La partie se termine quand aucun nouveau mot ne peut être créé par les deux joueurs.</li>
              <li>Elle peut aussi se terminer après plusieurs tours consécutifs passés.</li>
              <li>Le score le plus élevé détermine le gagnant.</li>
            </ul>
          </article>
        </section>

        <section className="rules-section" aria-labelledby="interaction-doc-title">
          <h2 id="interaction-doc-title">Documentation des interactions</h2>
          <p>
            Les gestes principaux fonctionnent par sélection puis toucher ou clic. Le glisser-déposer
            reste disponible, mais il n'est jamais obligatoire.
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
              cette case. Le bouton Sens → / ↓ choisit la direction de la lettre suivante.
            </p>
            <p role="listitem">
              <strong>Bouton Sens → / ↓.</strong> Il indique la direction actuelle. Avant une suite,
              il choisit le sens de pose ; avec une suite posée, il change sa direction.
            </p>
            <p role="listitem">
              <strong>Mot posé ce tour puis case vide.</strong> Le début du mot est déplacé sur cette case.
            </p>
            <p role="listitem">
              <strong>Mot posé ce tour puis lettre du même mot.</strong> Le début du mot est déplacé
              sur cette lettre.
            </p>
            <p role="listitem">
              <strong>Lettre déjà posée.</strong> Un double-clic ou double toucher retire seulement
              cette lettre.
            </p>
            <p role="listitem">
              <strong>Emplacement vide du chevalet puis lettre.</strong> La lettre se déplace vers
              cet emplacement.
            </p>
            <p role="listitem">
              <strong>Lettre glissée dans le chevalet.</strong> Elle peut s'insérer avant ou après
              une autre lettre.
            </p>
            <p role="listitem">
              <strong>Glisser-déposer.</strong> Il reste possible depuis la réserve, le chevalet ou
              une lettre déjà posée.
            </p>
            <p role="listitem">
              <strong>Échanger.</strong> Le bouton active une sélection de lettres disponibles, puis
              remplace les lettres choisies et passe le tour. Les lettres du coup en cours reviennent
              d'abord dans Vos lettres.
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
            Pour garder des parties équilibrées, le nombre de pièces et la quantité de chaque lettre
            changent selon la taille de la grille. Choisissez une taille pour voir la distribution
            utilisée en partie.
          </p>
          <div className="distribution-tabs" role="tablist" aria-label="Distribution par taille de grille">
            {BOARD_TILE_COUNTS.map((boardSize) => (
              <button
                aria-controls="letter-distribution-table"
                aria-selected={selectedDistributionSize === boardSize}
                className="distribution-tab"
                id={`distribution-tab-${boardSize}`}
                key={boardSize}
                onClick={() => setSelectedDistributionSize(boardSize)}
                role="tab"
                type="button"
              >
                <span>
                  {boardSize} × {boardSize}
                </span>
                <strong>{getTileCountForBoardSize(boardSize)} pièces</strong>
              </button>
            ))}
          </div>
          <p className="distribution-summary">
            Distribution affichée : grille {selectedDistributionSize} × {selectedDistributionSize},{" "}
            {selectedDistributionTileCount} pièces.
          </p>
          <div
            aria-labelledby={`distribution-tab-${selectedDistributionSize}`}
            className="letter-distribution"
            id="letter-distribution-table"
            role="table"
          >
            <div className="distribution-header" role="row">
              <span role="columnheader">Lettre</span>
              <span role="columnheader">Nombre</span>
              <span role="columnheader">Valeur</span>
            </div>
            {selectedDistribution.map((entry) => (
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
            Version de l'application : {APP_VERSION} ({APP_VERSION_DETAIL}).
          </p>
          <p>
            Sérénimot fonctionne localement dans votre navigateur ou dans l'application installée.
            Aucune inscription n'est demandée, aucune donnée personnelle n'est collectée et aucune
            publicité n'est affichée. L'application est gratuite et son code est ouvert :{" "}
            <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noreferrer">
              voir le projet sur GitHub
            </a>
            .
          </p>
          <p>
            Le site officiel est{" "}
            <a href={OFFICIAL_SITE_URL} target="_blank" rel="noreferrer">
              serenimot.fr
            </a>
            . L'application reste aussi accessible depuis{" "}
            <a href={GITHUB_PAGES_APP_URL} target="_blank" rel="noreferrer">
              GitHub Pages
            </a>
            .
          </p>
          <p>
            L'application est actuellement hébergée gratuitement avec GitHub Pages. Elle a été
            conçue en vibecoding avec Codex, dans l'idée de créer rapidement une application
            directement utilisable, facile à prendre en main et sans compte utilisateur.
          </p>
          <p>
            Pour aider le projet, vous pouvez{" "}
            <a href={BUG_REPORT_URL} target="_blank" rel="noreferrer">
              signaler un bug
            </a>{" "}
            ou{" "}
            <a href={FEATURE_REQUEST_URL} target="_blank" rel="noreferrer">
              proposer une idée
            </a>
            . Les retours restent publics sur GitHub afin que les demandes puissent être suivies et
            priorisées.
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
