import { useCallback, useEffect, useRef, useState } from "react";
import { GameScreen } from "../components/game/GameScreen";
import { LexiconScreen } from "../components/game/LexiconScreen";
import { RulesScreen } from "../components/game/RulesScreen";
import { createNewGame } from "../domain/turns/game";
import type { OpponentLevel } from "../domain/turns/game";
import type { BoardSize, GameState } from "../domain/tiles/types";
import { DICTIONARY_LABEL, getDictionarySize, loadDictionaryFromUrl } from "../domain/rules/dictionary";
import {
  getKnownWordExplanations,
  loadWordExplanationsForInitials,
  loadWordExplanationsForLengths,
  WORD_EXPLANATION_INITIALS,
  WORD_EXPLANATION_LENGTHS
} from "../domain/rules/wordExplanations";
import { playGameMessageSound } from "../features/audio/gameSounds";
import { deleteSavedGame, loadSavedGame } from "../features/persistence/gameStorage";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from "../features/accessibility/preferences";
import {
  BUG_REPORT_URL,
  FEATURE_REQUEST_URL,
  GITHUB_PAGES_APP_URL,
  OFFICIAL_SITE_URL,
  PROJECT_REPOSITORY_URL
} from "./links";
import { APP_VERSION, APP_VERSION_DETAIL } from "./version";

type Screen = "home" | "rules" | "lexicon" | "options" | "game" | "pwa";
type DictionaryStatus = "loading" | "ready" | "fallback";
type ExplanationsStatus = "idle" | "loading" | "partial" | "ready" | "fallback";
type TextScale = typeof DEFAULT_PREFERENCES.textScale;
type HintMode = typeof DEFAULT_PREFERENCES.hintMode;
type ComputerSearchPreference = typeof DEFAULT_PREFERENCES.computerSearchProfile;
type UndoMode = typeof DEFAULT_PREFERENCES.undoMode;
type VisualHintProps = {
  "aria-description": string;
  "data-tooltip"?: string;
};

const DEV_REMAINING_BAG_SIZE = 20;

const OPPONENT_LEVEL_OPTIONS: { value: OpponentLevel; label: string }[] = [
  { value: "very-easy", label: "Très facile" },
  { value: "easy", label: "Facile" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Difficile" },
  { value: "expert", label: "Expert" }
];

const TEXT_SCALE_OPTIONS: { value: TextScale; label: string }[] = [
  { value: "ultra-small", label: "Ultra compacte" },
  { value: "extra-small", label: "Très compacte" },
  { value: "small", label: "Compacte" },
  { value: "standard", label: "Normale" },
  { value: "large", label: "Grande" },
  { value: "extra-large", label: "Très grande" }
];

const BOARD_SIZE_OPTIONS: { value: BoardSize; label: string }[] = [
  { value: 9, label: "9 × 9" },
  { value: 11, label: "11 × 11" },
  { value: 13, label: "13 × 13" },
  { value: 15, label: "15 × 15" },
  { value: 17, label: "17 × 17" }
];

const HINT_MODE_OPTIONS: { value: HintMode; label: string; description: string }[] = [
  { value: "none", label: "Pas d'indice", description: "Le bouton Indice est désactivé pendant la partie." },
  { value: "progressive", label: "Indice progressif", description: "Chaque appui révèle une aide supplémentaire." },
  { value: "complete", label: "Indice complet", description: "Un appui donne directement le meilleur mot trouvé." }
];

const UNDO_MODE_OPTIONS: { value: UndoMode; label: string; description: string }[] = [
  {
    value: "turn-only",
    label: "Tour en cours seulement",
    description: "Permet de défaire ou refaire les actions du tour en cours, sans revenir au tour précédent."
  },
  {
    value: "all-actions",
    label: "Historique complet",
    description: "Permet de défaire ou refaire plusieurs actions, y compris sur les tours précédents."
  }
];

const COMPUTER_SEARCH_PROFILE_OPTIONS: { value: ComputerSearchPreference; label: string; description: string }[] = [
  {
    value: "auto",
    label: "Automatique",
    description: "Ajuste l'effort de recherche selon les temps observés sur cet appareil."
  },
  {
    value: "safe",
    label: "Prudent",
    description: "Réduit l'effort de recherche pour les appareils anciens ou lents."
  },
  {
    value: "balanced",
    label: "Équilibré",
    description: "Garde le comportement standard du robot."
  },
  {
    value: "quality",
    label: "Qualité",
    description: "Autorise plus de recherche pour trouver de meilleurs coups."
  }
];
const GAME_EXPLANATION_LENGTHS = [2, 3, 4] as const;
const PROMO_URL = OFFICIAL_SITE_URL;
const PROMO_TITLE = "Sérénimot - jeu original de lettres croisées sur grille";
const PROMO_DESCRIPTION =
  "Jeu original de lettres croisées sur grille, gratuit, en code ouvert, sans compte, sans publicité, jouable en ligne et installable comme une application.";
const SHARE_TEXT = `${PROMO_TITLE}. ${PROMO_DESCRIPTION}`;
const ASSET_BASE_URL = import.meta.env.BASE_URL;
const APP_ICON_URL = `${ASSET_BASE_URL}icons/icon.svg`;
const PROMO_ICONS = {
  alert: `${ASSET_BASE_URL}static/promo/alert.svg`,
  audience: `${ASSET_BASE_URL}static/promo/audience.svg`,
  check: `${ASSET_BASE_URL}static/promo/check.svg`,
  deviceMenu: `${ASSET_BASE_URL}static/promo/device-menu.svg`,
  deviceShare: `${ASSET_BASE_URL}static/promo/device-share.svg`,
  independent: `${ASSET_BASE_URL}static/promo/independent.svg`,
  install: `${ASSET_BASE_URL}static/promo/install.svg`,
  play: `${ASSET_BASE_URL}static/promo/play.svg`,
  privacy: `${ASSET_BASE_URL}static/promo/privacy.svg`,
  share: `${ASSET_BASE_URL}static/promo/share.svg`,
  shield: `${ASSET_BASE_URL}static/promo/shield.svg`,
  wifi: `${ASSET_BASE_URL}static/promo/wifi.svg`
} as const;
const SHARE_LINKS = [
  {
    label: "WhatsApp",
    href: `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${PROMO_URL}`)}`
  },
  {
    label: "Telegram",
    href: `https://t.me/share/url?url=${encodeURIComponent(PROMO_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`
  },
  {
    label: "Facebook",
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(PROMO_URL)}`
  },
  {
    label: "LinkedIn",
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PROMO_URL)}`
  },
  {
    label: "X",
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(PROMO_URL)}`
  },
  {
    label: "E-mail",
    href: `mailto:?subject=${encodeURIComponent(PROMO_TITLE)}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${PROMO_URL}`)}`
  }
];

function isWordExplanationInitial(value: string): value is (typeof WORD_EXPLANATION_INITIALS)[number] {
  return WORD_EXPLANATION_INITIALS.includes(value as (typeof WORD_EXPLANATION_INITIALS)[number]);
}

function getStandardTextScaleIndex(): number {
  const standardIndex = TEXT_SCALE_OPTIONS.findIndex((option) => option.value === "standard");

  return standardIndex === -1 ? 0 : standardIndex;
}

function getOpponentLevelLabel(level: OpponentLevel): string {
  return OPPONENT_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? OPPONENT_LEVEL_OPTIONS[0].label;
}

function getOpponentLevelDescription(level: OpponentLevel): string {
  if (level === "expert") {
    return "Explore beaucoup de possibilités et choisit le meilleur score trouvé.";
  }

  if (level === "hard") {
    return "Cherche davantage de coups et privilégie les meilleurs scores trouvés.";
  }

  if (level === "normal") {
    return "Cherche quelques bons coups, sans toujours choisir le meilleur.";
  }

  if (level === "easy") {
    return "Joue des coups modestes et limite les mots longs.";
  }

  return "Préfère des mots courts et joue vite, pour rester plus accessible.";
}

function getVisualHintProps(description: string, enabled: boolean): VisualHintProps {
  return enabled ? { "aria-description": description, "data-tooltip": description } : { "aria-description": description };
}

function PromoIcon({ icon, className = "promo-section-icon" }: { icon: keyof typeof PROMO_ICONS; className?: string }) {
  return <img className={className} src={PROMO_ICONS[icon]} alt="" aria-hidden="true" />;
}

type PromoHomeProps = {
  dictionarySize: number;
  dictionaryStatus: DictionaryStatus;
  explanationsSize: number;
  explanationsStatus: ExplanationsStatus;
  hasSave: boolean;
  onContinue: () => void;
  onLexiconRequest: () => void;
  onNewGame: () => void;
  onOptionsRequest: () => void;
  onPwaInfoRequest: () => void;
  onRulesRequest: () => void;
};

function PromoHome({
  dictionarySize,
  dictionaryStatus,
  explanationsSize,
  explanationsStatus,
  hasSave,
  onContinue,
  onLexiconRequest,
  onNewGame,
  onOptionsRequest,
  onPwaInfoRequest,
  onRulesRequest
}: PromoHomeProps) {
  const canPlay = dictionaryStatus !== "loading";
  const canUseDeviceShare = "share" in navigator;
  const shareWithDevice = async () => {
    if (!canUseDeviceShare) {
      return;
    }

    await navigator.share({
      title: PROMO_TITLE,
      text: PROMO_DESCRIPTION,
      url: PROMO_URL
    });
  };

  return (
    <main className="promo-layout">
      <section className="promo-hero" aria-labelledby="home-title">
        <PromoFlyingTiles />
        <div className="promo-copy">
          <p className="eyebrow">Les mots, à votre rythme.</p>
          <div className="promo-title-lockup">
            <img className="promo-title-icon" src={APP_ICON_URL} alt="" />
            <h1 id="home-title">Sérénimot</h1>
          </div>
          <p className="promo-lead">
            Jeu original de lettres croisées sur grille, gratuit, en code ouvert, sans compte, sans
            publicité, jouable en ligne et installable comme une application.
          </p>
          <p className="app-version-line" aria-label={`Version de l'application ${APP_VERSION}`}>
            Version {APP_VERSION} · {APP_VERSION_DETAIL}
          </p>
          <div className="home-actions promo-actions">
            <button type="button" onClick={onNewGame} disabled={!canPlay}>
              Jouer maintenant
            </button>
            <button type="button" onClick={onContinue} disabled={!hasSave || !canPlay}>
              Continuer
            </button>
            <button className="secondary-button" type="button" onClick={onRulesRequest}>
              Règles
            </button>
            <button className="secondary-button" type="button" onClick={onLexiconRequest}>
              Lexique
            </button>
            <button className="secondary-button" type="button" onClick={onPwaInfoRequest}>
              Installation sans store
            </button>
            <a className="promo-action-link" href="#installation">
              Installer sur mon téléphone
            </a>
          </div>
          <p className="dictionary-status">
            {dictionaryStatus === "loading"
              ? "Chargement du dictionnaire..."
              : dictionaryStatus === "ready"
                ? `Dictionnaire chargé : ${dictionarySize.toLocaleString("fr-CH")} mots, ${DICTIONARY_LABEL}.`
                : `Dictionnaire complet indisponible : base minimale active (${dictionarySize.toLocaleString("fr-CH")} mots).`}
          </p>
          {explanationsStatus !== "idle" ? (
            <p className="dictionary-status">
              {explanationsStatus === "loading"
                ? "Chargement des explications..."
                : explanationsStatus === "partial"
                  ? `${explanationsSize.toLocaleString("fr-CH")} fiches explicatives disponibles.`
                  : explanationsStatus === "ready"
                    ? `${explanationsSize.toLocaleString("fr-CH")} fiches explicatives disponibles.`
                    : `Explications complètes indisponibles : ${explanationsSize.toLocaleString("fr-CH")} fiches intégrées actives.`}
            </p>
          ) : null}
        </div>
        <PromoTileBoard />
      </section>

      <section className="promo-section" aria-labelledby="promo-for-title">
        <h2 id="promo-for-title">
          <PromoIcon icon="audience" />
          Pour qui ?
        </h2>
        <p>
          Sérénimot s'adresse aux personnes qui aiment les jeux de lettres sur grille et souhaitent
          une expérience plus calme, sans inscription, sans publicité et utilisable sur ordinateur,
          tablette ou smartphone.
        </p>
      </section>

      <section className="promo-feature-grid" aria-label="Points forts">
        <article>
          <PromoIcon icon="play" />
          <h2>Jouer simplement</h2>
          <p>
            Lancez une partie directement dans le navigateur, placez les lettres par toucher,
            clic ou glisser-déposer, puis validez à votre rythme.
          </p>
        </article>
        <article>
          <PromoIcon icon="privacy" />
          <h2>Local et privé</h2>
          <p>
            La partie et les préférences restent sur votre appareil. Aucune donnée personnelle
            n'est collectée et aucune publicité n'est affichée.
          </p>
        </article>
        <article>
          <PromoIcon icon="install" />
          <h2>Installable</h2>
          <p>
            L'application peut être ajoutée à l'écran d'accueil sur iPhone, iPad, Android, Mac et
            Windows lorsque le navigateur le permet.
          </p>
        </article>
        <article>
          <PromoIcon icon="independent" />
          <h2>Indépendant</h2>
          <p>
            Sérénimot utilise son propre plateau, ses propres règles, son propre score et un lexique
            ouvert documenté. Son code est ouvert afin de pouvoir être consulté et amélioré.
          </p>
        </article>
      </section>

      <section className="promo-section promo-install" id="installation" aria-labelledby="promo-install-title">
        <div>
          <h2 id="promo-install-title">
            <PromoIcon icon="install" />
            Installer sur smartphone
          </h2>
          <p>
            Ouvrez cette page depuis votre téléphone, puis ajoutez Sérénimot à l'écran d'accueil.
            L'application se lancera ensuite comme une app classique.
          </p>
          <button className="secondary-button" type="button" onClick={onPwaInfoRequest}>
            Installation sans store
          </button>
        </div>
        <div className="promo-install-steps">
          <article>
            <h3>
              <PromoIcon icon="deviceShare" className="promo-platform-icon" />
              iPhone ou iPad
            </h3>
            <ol>
              <li>Ouvrez Sérénimot avec Safari.</li>
              <li>Touchez le bouton Partager.</li>
              <li>Choisissez Sur l'écran d'accueil.</li>
              <li>Validez avec Ajouter.</li>
            </ol>
          </article>
          <article>
            <h3>
              <PromoIcon icon="deviceMenu" className="promo-platform-icon" />
              Android
            </h3>
            <ol>
              <li>Ouvrez Sérénimot avec Chrome.</li>
              <li>Touchez le menu à trois points.</li>
              <li>Choisissez Installer l'application ou Ajouter à l'écran d'accueil.</li>
              <li>Validez l'installation.</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="promo-section promo-share" aria-labelledby="promo-share-title">
        <div>
          <h2 id="promo-share-title">
            <PromoIcon icon="share" />
            Partager Sérénimot
          </h2>
          <p>
            Les liens ci-dessous ouvrent les réseaux les plus utiles pour faire découvrir le jeu à
            des proches ou à une communauté.
          </p>
        </div>
        <div className="promo-share-links">
          {canUseDeviceShare ? (
            <button
              className="secondary-button promo-device-share-button"
              type="button"
              onClick={() => void shareWithDevice()}
              data-share-tooltip="Ouvre le menu de partage de votre appareil."
            >
              Partage appareil
            </button>
          ) : null}
          {SHARE_LINKS.map((link) => (
            <a
              className="promo-share-link promo-share-icon-link"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              key={link.label}
              aria-label={`Partager sur ${link.label}`}
              data-share-tooltip={link.label}
              title={link.label}
            >
              <ShareIcon label={link.label} />
            </a>
          ))}
        </div>
      </section>

      <section className="promo-section" aria-labelledby="promo-confusion-title">
        <h2 id="promo-confusion-title">
          <PromoIcon icon="check" />
          Anti-confusion
        </h2>
        <p>
          Sérénimot est un jeu original et indépendant. Il n'est pas affilié à Scrabble, Mattel,
          Hasbro, Larousse, la FISF ou une fédération de jeu de lettres. Il ne reprend pas le
          plateau officiel, les règles officielles ni un dictionnaire officiel de compétition.
        </p>
      </section>

      <nav className="promo-footer-links" aria-label="Navigation">
        <button type="button" onClick={onOptionsRequest}>
          Options
        </button>
        <button type="button" onClick={onRulesRequest}>
          Règles complètes
        </button>
        <button type="button" onClick={onLexiconRequest}>
          Page Lexique
        </button>
        <button type="button" onClick={onPwaInfoRequest}>
          Installation sans store
        </button>
        <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noreferrer">
          Projet GitHub
        </a>
      </nav>
      <p className="promo-official-site">
        Site officiel :{" "}
        <a href={OFFICIAL_SITE_URL} target="_blank" rel="noreferrer">
          serenimot.fr
        </a>
        . L'application reste également accessible depuis{" "}
        <a href={GITHUB_PAGES_APP_URL} target="_blank" rel="noreferrer">
          GitHub Pages
        </a>
        .
      </p>
      <p className="promo-feedback-links">
        Retours :{" "}
        <a href={BUG_REPORT_URL} target="_blank" rel="noreferrer">
          signaler un bug
        </a>{" "}
        ou{" "}
        <a href={FEATURE_REQUEST_URL} target="_blank" rel="noreferrer">
          proposer une idée
        </a>
        .
      </p>
    </main>
  );
}

const PROMO_BOARD_LETTERS = ["S", "É", "R", "É", "N", "I", "M", "O", "T"];
const PROMO_FLYING_TILES = [
  { letter: "M", className: "tile-a" },
  { letter: "O", className: "tile-b" },
  { letter: "T", className: "tile-c" },
  { letter: "S", className: "tile-d" },
  { letter: "A", className: "tile-e" }
];

function PromoTileBoard() {
  return (
    <div className="promo-board" aria-hidden="true">
      {PROMO_BOARD_LETTERS.map((letter, index) => (
        <span className="promo-board-tile" key={`${letter}-${index}`}>
          {letter}
        </span>
      ))}
    </div>
  );
}

function PromoFlyingTiles() {
  return (
    <div className="promo-flying-tiles-layer" aria-hidden="true">
      {PROMO_FLYING_TILES.map(({ letter, className }) => (
        <span className={`promo-flying-tile ${className}`} key={`${className}-${letter}`}>
          {letter}
        </span>
      ))}
    </div>
  );
}

function ShareIcon({ label }: { label: string }) {
  if (label === "WhatsApp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#25D366" d="M12 2.4a9.6 9.6 0 0 0-8.14 14.68L2.8 21.2l4.22-1.06A9.6 9.6 0 1 0 12 2.4Z" />
        <path
          fill="#fff"
          d="M16.62 13.76c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
        />
      </svg>
    );
  }

  if (label === "Telegram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="#229ED9" />
        <path
          fill="#fff"
          d="M17.9 7.1c.18-.08.38.08.33.28l-2.1 9.9c-.05.25-.37.34-.55.15l-3.04-3.1-1.57 1.52c-.17.17-.46.08-.5-.16l-.42-2.64-2.82-.92c-.27-.09-.29-.46-.03-.58L17.9 7.1Zm-7.18 5.53.32 2.07.7-1.34 4.74-4.28-5.76 3.55Z"
        />
      </svg>
    );
  }

  if (label === "Facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="#1877F2" />
        <path
          fill="#fff"
          d="M13.55 21v-7.02h2.35l.36-2.73h-2.71V9.52c0-.79.22-1.33 1.35-1.33h1.44V5.75c-.25-.03-1.1-.1-2.1-.1-2.07 0-3.49 1.26-3.49 3.58v2.02H8.4v2.73h2.35V21h2.8Z"
        />
      </svg>
    );
  }

  if (label === "LinkedIn") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect width="20" height="20" x="2" y="2" fill="#0A66C2" rx="3" />
        <path
          fill="#fff"
          d="M7.52 9.85h2.54V18H7.52V9.85Zm1.28-3.94a1.47 1.47 0 1 1 0 2.94 1.47 1.47 0 0 1 0-2.94ZM11.65 9.85h2.44v1.11h.04c.34-.64 1.17-1.32 2.41-1.32 2.58 0 3.06 1.7 3.06 3.9V18h-2.54v-3.95c0-.94-.02-2.15-1.31-2.15-1.31 0-1.51 1.02-1.51 2.08V18h-2.59V9.85Z"
        />
      </svg>
    );
  }

  if (label === "X") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect width="20" height="20" x="2" y="2" fill="#000" rx="3" />
        <path fill="#fff" d="M14.14 10.55 19.18 5h-1.2l-4.38 4.82L10.1 5H6.08l5.29 7.27L6.08 18.1h1.2l4.62-5.1 3.7 5.1h4.02l-5.48-7.55Zm-1.64 1.8-.53-.72-4.27-5.7h1.83l3.44 4.6.53.72 4.48 5.98h-1.83l-3.65-4.88Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="20" height="16" x="2" y="4" fill="#6b746f" rx="3" />
      <path fill="#fffaf1" d="M4.3 7.1 12 12.7l7.7-5.6v2.1L12 14.8 4.3 9.2V7.1Z" />
    </svg>
  );
}

function PwaInfoScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="rules-layout">
      <section className="rules-panel" aria-labelledby="pwa-title">
        <div className="rules-heading">
          <div>
            <p className="eyebrow">Installation</p>
            <h1 id="pwa-title">C'est quoi une PWA ?</h1>
          </div>
          <button type="button" onClick={onBack}>
            Retour
          </button>
        </div>

        <section className="rules-section pwa-intro" aria-labelledby="pwa-simple-title">
          <h2 id="pwa-simple-title">
            <PromoIcon icon="install" />
            Une application web installable
          </h2>
          <p>
            Une PWA, ou Progressive Web App, est un site web qui peut se comporter comme une
            application. On l'ouvre d'abord dans le navigateur, puis on peut l'ajouter à l'écran
            d'accueil du téléphone, de la tablette ou de l'ordinateur.
          </p>
        </section>

        <section className="pwa-explainer-grid" aria-label="Explication simple des PWA">
          <article className="rules-section">
            <h2>
              <PromoIcon icon="install" />
              Pas de boutique
            </h2>
            <p>
              Il n'est pas nécessaire de passer par l'App Store ou le Play Store. L'installation se
              fait depuis le navigateur, avec l'option Ajouter à l'écran d'accueil ou Installer
              l'application.
            </p>
          </article>
          <article className="rules-section">
            <h2>
              <PromoIcon icon="privacy" />
              Plus proche d'une app
            </h2>
            <p>
              Une fois installée, Sérénimot peut se lancer depuis une icône, dans une fenêtre plus
              simple, sans devoir retaper l'adresse du site.
            </p>
          </article>
          <article className="rules-section">
            <h2>
              <PromoIcon icon="wifi" />
              Fonctionne mieux hors ligne
            </h2>
            <p>
              Après le premier chargement, l'interface du jeu peut être gardée en mémoire par le
              navigateur. La partie et les préférences restent enregistrées localement sur l'appareil.
            </p>
          </article>
          <article className="rules-section">
            <h2>
              <PromoIcon icon="check" />
              Simple à retirer
            </h2>
            <p>
              Si vous ne voulez plus l'utiliser, il suffit de supprimer l'icône de l'écran d'accueil,
              comme pour une autre application installée.
            </p>
          </article>
          <article className="rules-section">
            <h2>
              <PromoIcon icon="shield" />
              Avantages sécurité
            </h2>
            <p>
              Une PWA installée depuis un site en HTTPS limite les risques liés aux téléchargements
              inconnus. Pour Sérénimot, il n'y a pas de compte, pas de mot de passe, pas de publicité
              et les données de jeu restent sur l'appareil.
            </p>
          </article>
          <article className="rules-section">
            <h2>
              <PromoIcon icon="alert" />
              Risque de perte
            </h2>
            <p>
              Comme les parties sont enregistrées localement, elles ne sont pas synchronisées dans
              un compte en ligne. Elles peuvent être perdues si les données du navigateur sont
              effacées, si l'application est supprimée ou si vous changez d'appareil.
            </p>
          </article>
        </section>

        <section className="rules-section" aria-labelledby="pwa-limits-title">
          <h2 id="pwa-limits-title">À retenir</h2>
          <ul>
            <li>Une PWA reste basée sur un site web.</li>
            <li>La sécurité dépend du site d'origine : il faut utiliser l'adresse officielle en HTTPS.</li>
            <li>Les parties restent locales : elles ne suivent pas automatiquement l'utilisateur sur un autre appareil.</li>
            <li>Le comportement exact dépend du navigateur et du téléphone.</li>
            <li>Sur iPhone et iPad, l'installation passe généralement par Safari.</li>
            <li>Sur Android, Chrome propose souvent Installer l'application ou Ajouter à l'écran d'accueil.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [game, setGame] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [preferences, setPreferences] = useState(() => loadPreferences());
  const [dictionaryStatus, setDictionaryStatus] = useState<DictionaryStatus>("loading");
  const [dictionarySize, setDictionarySize] = useState(getDictionarySize());
  const [explanationsStatus, setExplanationsStatus] = useState<ExplanationsStatus>("idle");
  const [explanationsSize, setExplanationsSize] = useState(getKnownWordExplanations().length);
  const explanationsLoadPromise = useRef<Promise<number> | null>(null);
  const requestedExplanationInitials = useRef(new Set<(typeof WORD_EXPLANATION_INITIALS)[number]>());
  const loadedExplanationInitials = useRef(new Set<(typeof WORD_EXPLANATION_INITIALS)[number]>());
  const lastSoundMessageRef = useRef("");

  useEffect(() => {
    loadSavedGame()
      .then((savedGame) => setHasSave(Boolean(savedGame)))
      .catch(() => setHasSave(false));
    loadDictionaryFromUrl()
      .then((loadedSize) => {
        setDictionarySize(loadedSize);
        setDictionaryStatus("ready");
      })
      .catch(() => {
        setDictionarySize(getDictionarySize());
        setDictionaryStatus("fallback");
      });
  }, []);

  const loadWordExplanations = useCallback(
    (lengths: readonly (typeof WORD_EXPLANATION_LENGTHS)[number][], nextStatus: "partial" | "ready") => {
      if (explanationsStatus === "ready" || explanationsStatus === "loading" || explanationsStatus === "fallback") {
        return;
      }

      setExplanationsStatus("loading");
      explanationsLoadPromise.current = loadWordExplanationsForLengths(lengths);
      explanationsLoadPromise.current
        .then((loadedSize) => {
          explanationsLoadPromise.current = null;
          setExplanationsSize(loadedSize);
          setExplanationsStatus(nextStatus);
        })
        .catch(() => {
          explanationsLoadPromise.current = null;
          setExplanationsSize(getKnownWordExplanations().length);
          setExplanationsStatus("fallback");
        });
    },
    [explanationsStatus]
  );

  const ensureGameWordExplanationsLoaded = useCallback(() => {
    if (explanationsStatus !== "idle") {
      return;
    }

    loadWordExplanations(GAME_EXPLANATION_LENGTHS, "partial");
  }, [explanationsStatus, loadWordExplanations]);

  const requestWordExplanationsForInitial = useCallback((initial: string) => {
    const normalizedInitial = initial.toLocaleLowerCase("fr-CH");

    if (!isWordExplanationInitial(normalizedInitial)) {
      return;
    }

    if (
      explanationsStatus === "ready" ||
      explanationsStatus === "fallback" ||
      requestedExplanationInitials.current.has(normalizedInitial) ||
      loadedExplanationInitials.current.has(normalizedInitial)
    ) {
      return;
    }

    requestedExplanationInitials.current.add(normalizedInitial);
    setExplanationsStatus((currentStatus) =>
      currentStatus === "ready" || currentStatus === "fallback" ? currentStatus : "loading"
    );

    loadWordExplanationsForInitials([normalizedInitial])
      .then((loadedSize) => {
        loadedExplanationInitials.current.add(normalizedInitial);
        setExplanationsSize(loadedSize);
        setExplanationsStatus(
          WORD_EXPLANATION_INITIALS.every((letter) => loadedExplanationInitials.current.has(letter)) ? "ready" : "partial"
        );
      })
      .catch(() => {
        requestedExplanationInitials.current.delete(normalizedInitial);
        setExplanationsSize(getKnownWordExplanations().length);
        setExplanationsStatus("fallback");
      });
  }, [explanationsStatus]);

  useEffect(() => {
    savePreferences(preferences);
    document.documentElement.dataset.textScale = preferences.textScale;
    document.documentElement.dataset.contrast = preferences.contrast;
  }, [preferences]);

  useEffect(() => {
    if (screen === "game") {
      ensureGameWordExplanationsLoaded();
    }

  }, [ensureGameWordExplanationsLoaded, screen]);

  useEffect(() => {
    const message = game?.message;

    if (!message || !preferences.soundEnabled || message.text === lastSoundMessageRef.current) {
      return;
    }

    lastSoundMessageRef.current = message.text;
    playGameMessageSound(message, preferences.soundVolume);
  }, [game?.message, preferences.soundEnabled, preferences.soundVolume]);

  async function continueGame() {
    const savedGame = await loadSavedGame();
    if (savedGame) {
      ensureGameWordExplanationsLoaded();
      setGame(savedGame.state);
      setScreen("game");
    }
  }

  function startNewGame() {
    if (game && !window.confirm("Voulez-vous commencer une nouvelle partie ?")) {
      return;
    }

    const newGame = createNewGame({
      boardSize: preferences.boardSize,
      remainingBagSize: preferences.developerMode ? DEV_REMAINING_BAG_SIZE : undefined
    });
    ensureGameWordExplanationsLoaded();
    setGame(newGame);
    setHasSave(true);
    setScreen("game");
  }

  function changeBoardSize(nextBoardSize: BoardSize) {
    if (nextBoardSize === preferences.boardSize) {
      return;
    }

    const selectedOption = BOARD_SIZE_OPTIONS.find((option) => option.value === nextBoardSize);
    const selectedLabel = selectedOption?.label ?? `${nextBoardSize} × ${nextBoardSize}`;

    if (
      (game || hasSave) &&
      !window.confirm(
        `Changer la taille du plateau en ${selectedLabel} va lancer une nouvelle partie. Voulez-vous continuer ?`
      )
    ) {
      return;
    }

    const nextPreferences = { ...preferences, boardSize: nextBoardSize };
    setPreferences(nextPreferences);
    ensureGameWordExplanationsLoaded();
    setGame(
      createNewGame({
        boardSize: nextBoardSize,
        remainingBagSize: nextPreferences.developerMode ? DEV_REMAINING_BAG_SIZE : undefined
      })
    );
    setHasSave(true);
    setScreen("game");
  }

  async function resetSave() {
    if (!window.confirm("Voulez-vous supprimer la partie enregistrée ?")) {
      return;
    }

    await deleteSavedGame();
    setGame(null);
    setHasSave(false);
    setScreen("home");
  }

  function openLexiconScreen() {
    if (window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }

    setScreen("lexicon");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function updateTextScale(direction: -1 | 1) {
    const matchedIndex = TEXT_SCALE_OPTIONS.findIndex((option) => option.value === preferences.textScale);
    const currentIndex = matchedIndex === -1 ? getStandardTextScaleIndex() : matchedIndex;
    const nextIndex = Math.min(TEXT_SCALE_OPTIONS.length - 1, Math.max(0, currentIndex + direction));
    setPreferences({ ...preferences, textScale: TEXT_SCALE_OPTIONS[nextIndex].value });
  }

  const matchedTextScaleIndex = TEXT_SCALE_OPTIONS.findIndex((option) => option.value === preferences.textScale);
  const textScaleIndex = matchedTextScaleIndex === -1 ? getStandardTextScaleIndex() : matchedTextScaleIndex;
  const textScaleLabel = TEXT_SCALE_OPTIONS[textScaleIndex]?.label ?? TEXT_SCALE_OPTIONS[getStandardTextScaleIndex()].label;
  const optionHintProps = (description: string) => getVisualHintProps(description, preferences.hintsEnabled);

  if (screen === "rules") {
    return (
      <RulesScreen
        hasGame={Boolean(game)}
        onBack={() => setScreen(game ? "game" : "home")}
        onLexiconRequest={openLexiconScreen}
      />
    );
  }

  if (screen === "lexicon") {
    return (
      <LexiconScreen
        dictionarySize={dictionarySize}
        explanationsSize={explanationsSize}
        explanationsStatus={explanationsStatus}
        hasGame={Boolean(game)}
        onExplanationInitialRequested={requestWordExplanationsForInitial}
        onBack={() => setScreen(game ? "game" : "home")}
      />
    );
  }

  if (screen === "pwa") {
    return <PwaInfoScreen onBack={() => setScreen("home")} />;
  }

  if (screen === "options") {
    return (
      <main className="home-layout">
        <section className="home-panel options-panel" aria-labelledby="options-title">
          <p className="eyebrow">Options</p>
          <h1 id="options-title">Sérénimot</h1>
          <label
            className="setting-row"
            {...optionHintProps("Règle le niveau de jeu du robot pour les prochaines parties.")}
          >
            <span>Niveau du robot</span>
            <select
              value={preferences.opponentLevel}
              onChange={(event) => setPreferences({ ...preferences, opponentLevel: event.target.value as OpponentLevel })}
            >
              {OPPONENT_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {getOpponentLevelLabel(preferences.opponentLevel)} : {getOpponentLevelDescription(preferences.opponentLevel)}
          </p>
          <div className="opponent-level-legend" aria-label="Code couleur des niveaux du robot">
            <span className="opponent-level-legend-label">Code couleur</span>
            {OPPONENT_LEVEL_OPTIONS.map((option) => (
              <span
                key={option.value}
                className={`opponent-level-badge level-${option.value} ${
                  option.value === preferences.opponentLevel ? "is-selected" : ""
                }`}
              >
                {option.label}
              </span>
            ))}
          </div>
          <label
            className="setting-row"
            {...optionHintProps("Ajuste l'effort de recherche pour préserver la fluidité sur cet appareil.")}
          >
            <span>Performance du robot</span>
            <select
              value={preferences.computerSearchProfile}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  computerSearchProfile: event.target.value as ComputerSearchPreference
                })
              }
            >
              {COMPUTER_SEARCH_PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {
              COMPUTER_SEARCH_PROFILE_OPTIONS.find((option) => option.value === preferences.computerSearchProfile)
                ?.description
            }
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Choisit si l'aide est absente, progressive ou complète pendant la partie.")}
          >
            <span>Indice</span>
            <select
              value={preferences.hintMode}
              onChange={(event) => setPreferences({ ...preferences, hintMode: event.target.value as HintMode })}
            >
              {HINT_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {HINT_MODE_OPTIONS.find((option) => option.value === preferences.hintMode)?.description}
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Choisit jusqu'où les boutons pour défaire et refaire peuvent remonter.")}
          >
            <span>Annuler / refaire</span>
            <select
              aria-label="Annuler / refaire"
              value={preferences.undoMode}
              onChange={(event) => setPreferences({ ...preferences, undoMode: event.target.value as UndoMode })}
            >
              {UNDO_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">
            {UNDO_MODE_OPTIONS.find((option) => option.value === preferences.undoMode)?.description}
          </p>
          {import.meta.env.DEV ? (
            <>
              <label
                className="setting-row checkbox-setting"
                {...optionHintProps("Affiche des informations techniques utiles pendant les tests.")}
              >
                <span>Mode dev</span>
                <span className="toggle-setting">
                  <span>{preferences.developerMode ? "Actif" : "Inactif"}</span>
                  <input
                    type="checkbox"
                    checked={preferences.developerMode}
                    onChange={(event) => setPreferences({ ...preferences, developerMode: event.target.checked })}
                  />
                </span>
              </label>
              <p className="setting-help">
                Affiche les diagnostics de recherche et limite les nouvelles parties à une pioche de 20 lettres.
              </p>
            </>
          ) : null}
          <label
            className="setting-row checkbox-setting"
            {...optionHintProps("Active ou masque les bulles d'aide visuelles après un court survol ou focus.")}
          >
            <span>Bulles d'aide</span>
            <span className="toggle-setting">
              <span>{preferences.hintsEnabled ? "Actif" : "Inactif"}</span>
              <input
                type="checkbox"
                checked={preferences.hintsEnabled}
                onChange={(event) => setPreferences({ ...preferences, hintsEnabled: event.target.checked })}
              />
            </span>
          </label>
          <p className="setting-help">
            Les descriptions restent disponibles pour l'accessibilité, même quand les bulles visuelles sont masquées.
          </p>
          <label
            className="setting-row"
            {...optionHintProps("Change le nombre de lignes et colonnes du plateau.")}
          >
            <span>Taille du plateau</span>
            <select
              value={preferences.boardSize}
              onChange={(event) => changeBoardSize(Number(event.target.value) as BoardSize)}
            >
              {BOARD_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="setting-help">Changer la taille lance une nouvelle partie avec le nouveau plateau.</p>
          <div
            className="setting-row"
            {...optionHintProps("Agrandit ou réduit l'ensemble de l'interface.")}
          >
            <span id="options-interface-scale-label">Taille de l'interface</span>
            <div className="scale-control" aria-labelledby="options-interface-scale-label">
              <button
                className="secondary-button"
                type="button"
                onClick={() => updateTextScale(-1)}
                disabled={textScaleIndex <= 0}
                aria-label="Réduire l'interface"
              >
                -
              </button>
              <strong aria-live="polite">{textScaleLabel}</strong>
              <button
                className="secondary-button"
                type="button"
                onClick={() => updateTextScale(1)}
                disabled={textScaleIndex >= TEXT_SCALE_OPTIONS.length - 1}
                aria-label="Agrandir l'interface"
              >
                +
              </button>
              <button
                className="secondary-button scale-reset"
                type="button"
                onClick={() => setPreferences({ ...preferences, textScale: DEFAULT_PREFERENCES.textScale })}
                disabled={preferences.textScale === DEFAULT_PREFERENCES.textScale}
              >
                Réinitialiser
              </button>
            </div>
          </div>
          <label
            className="setting-row"
            {...optionHintProps("Renforce le contraste visuel des éléments principaux.")}
          >
            <span>Contraste</span>
            <select
              value={preferences.contrast}
              onChange={(event) =>
                setPreferences({ ...preferences, contrast: event.target.value as typeof preferences.contrast })
              }
            >
              <option value="standard">Standard</option>
              <option value="enhanced">Renforcé</option>
            </select>
          </label>
          <label
            className="setting-row checkbox-setting"
            {...optionHintProps("Active ou coupe les sons du jeu.")}
          >
            <span>Sons</span>
            <span className="toggle-setting">
              <span>{preferences.soundEnabled ? "Actif" : "Inactif"}</span>
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(event) => setPreferences({ ...preferences, soundEnabled: event.target.checked })}
              />
            </span>
          </label>
          <p className="setting-help">Ajoute de petits sons pour les coups acceptés, les alertes et le tour du robot.</p>
          {preferences.soundEnabled ? (
            <label
              className="setting-row range-setting"
              {...optionHintProps("Règle le volume des sons du jeu.")}
            >
              <span>Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={preferences.soundVolume}
                onChange={(event) => setPreferences({ ...preferences, soundVolume: Number(event.target.value) })}
              />
              <strong aria-live="polite">{preferences.soundVolume}%</strong>
            </label>
          ) : null}
          <div className="home-actions">
            <button
              type="button"
              onClick={() => setScreen(game ? "game" : "home")}
              {...optionHintProps("Revient à l'écran précédent.")}
            >
              Retour
            </button>
            {hasSave ? (
              <button
                className="secondary-button"
                type="button"
                onClick={resetSave}
                {...optionHintProps("Supprime la partie sauvegardée localement après confirmation.")}
              >
                Supprimer la sauvegarde
              </button>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  if (screen === "game" && game) {
    return (
      <GameScreen
        game={game}
        onGameChange={(nextGame) => {
          setGame(nextGame);
          setHasSave(true);
        }}
        onNewGameRequest={startNewGame}
        onRulesRequest={() => setScreen("rules")}
        onLexiconRequest={openLexiconScreen}
        onOptionsRequest={() => setScreen("options")}
        onExplanationInitialRequested={requestWordExplanationsForInitial}
        interfaceScaleLabel={textScaleLabel}
        opponentLevel={preferences.opponentLevel}
        computerSearchProfile={preferences.computerSearchProfile}
        hintMode={preferences.hintMode}
        undoMode={preferences.undoMode}
        hintsEnabled={preferences.hintsEnabled}
        developerMode={preferences.developerMode}
        canDecreaseInterfaceScale={textScaleIndex > 0}
        canIncreaseInterfaceScale={textScaleIndex < TEXT_SCALE_OPTIONS.length - 1}
        onDecreaseInterfaceScale={() => updateTextScale(-1)}
        onIncreaseInterfaceScale={() => updateTextScale(1)}
      />
    );
  }

  return (
    <PromoHome
      dictionarySize={dictionarySize}
      dictionaryStatus={dictionaryStatus}
      explanationsSize={explanationsSize}
      explanationsStatus={explanationsStatus}
      hasSave={hasSave}
      onContinue={continueGame}
      onLexiconRequest={openLexiconScreen}
      onNewGame={startNewGame}
      onOptionsRequest={() => setScreen("options")}
      onPwaInfoRequest={() => setScreen("pwa")}
      onRulesRequest={() => setScreen("rules")}
    />
  );
}
