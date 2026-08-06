import { normalizeWord } from "./dictionary";

export type WordExplanationSource = {
  name: string;
  version?: string;
};

export type WordExplanation = {
  word: string;
  baseWord?: string;
  formNote?: string;
  partOfSpeech: string;
  shortDefinition: string;
  usage?: string;
  lemma?: string;
  sources: WordExplanationSource[];
  reviewed: boolean;
};

type WordExplanationSeed = Omit<WordExplanation, "sources" | "reviewed">;

export const WORD_EXPLANATION_LENGTHS = [2, 3, 4] as const;
export const WORD_EXPLANATION_INITIALS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z"
] as const;
export const WORD_EXPLANATION_LENGTH_FILE_PATHS = Object.fromEntries(
  WORD_EXPLANATION_LENGTHS.map((length) => [
    length,
    `${import.meta.env.BASE_URL}static/dictionary/lexique4005.explanations-${length}.json`
  ])
) as Record<(typeof WORD_EXPLANATION_LENGTHS)[number], string>;
export const WORD_EXPLANATION_INITIAL_FILE_PATHS = Object.fromEntries(
  WORD_EXPLANATION_INITIALS.map((initial) => [
    initial,
    `${import.meta.env.BASE_URL}static/dictionary/lexique4005.explanations-${initial}.json`
  ])
) as Record<(typeof WORD_EXPLANATION_INITIALS)[number], string>;

function buildLexiqueReviewedExplanations(entries: WordExplanationSeed[]): Record<string, WordExplanation> {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.word,
      {
        ...entry,
        sources: [{ name: "Lexique", version: "4.00" }],
        reviewed: true
      }
    ])
  );
}

const RAW_WORD_EXPLANATIONS: Record<string, WordExplanation> = {
  ...buildLexiqueReviewedExplanations([
    { word: "AH", partOfSpeech: "interjection", shortDefinition: "Exprime une émotion, une surprise ou une réaction." },
    { word: "AIE", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AIT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "ABRI", partOfSpeech: "nom masculin", shortDefinition: "Lieu qui protège des intempéries ou du danger." },
    { word: "ABRIS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de ABRI.", lemma: "abri" },
    { word: "ACTE", partOfSpeech: "nom masculin", shortDefinition: "Action accomplie ; document officiel." },
    { word: "ACTES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de ACTE.", lemma: "acte" },
    { word: "AILE", partOfSpeech: "nom féminin", shortDefinition: "Organe ou partie permettant de voler ; côté d'un bâtiment." },
    { word: "AILES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de AILE.", lemma: "aile" },
    { word: "AME", partOfSpeech: "nom féminin", shortDefinition: "Principe spirituel ou moral ; partie essentielle d'une chose.", lemma: "âme" },
    { word: "AMES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de AME.", lemma: "âme" },
    { word: "ANE", partOfSpeech: "nom masculin", shortDefinition: "Animal proche du cheval, réputé robuste.", lemma: "âne" },
    { word: "ANES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de ANE.", lemma: "âne" },
    { word: "ANGE", partOfSpeech: "nom masculin", shortDefinition: "Être spirituel ; personne très douce ou bienveillante." },
    { word: "ANGES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de ANGE.", lemma: "ange" },
    { word: "APTE", partOfSpeech: "adjectif", shortDefinition: "Qui possède les capacités nécessaires." },
    { word: "APTES", partOfSpeech: "adjectif pluriel", shortDefinition: "Pluriel de APTE.", lemma: "apte" },
    { word: "ARME", partOfSpeech: "nom féminin", shortDefinition: "Objet servant à attaquer ou à se défendre." },
    { word: "ARMES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de ARME.", lemma: "arme" },
    { word: "ALLER", partOfSpeech: "verbe", shortDefinition: "Se déplacer ; convenir ou fonctionner correctement." },
    { word: "ALLEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "ALLA", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "AVOIR", partOfSpeech: "verbe", shortDefinition: "Posséder ; servir aussi d'auxiliaire dans les temps composés." },
    { word: "AI", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AIES", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AU", partOfSpeech: "article contracté", shortDefinition: "Contraction de à le." },
    { word: "AUX", partOfSpeech: "article contracté", shortDefinition: "Contraction de à les." },
    { word: "AVAIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AVAIT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AVIEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AVONS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AURA", partOfSpeech: "verbe ou nom féminin", shortDefinition: "Forme du verbe avoir ; atmosphère particulière qui entoure quelqu'un ou quelque chose.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AUREZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AYANT", partOfSpeech: "participe présent", shortDefinition: "Forme du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AYONS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AYEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AVEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "AY", partOfSpeech: "nom masculin", shortDefinition: "Interjection ou cri court lexicalisé selon les usages relevés." },
    { word: "BAIN", partOfSpeech: "nom masculin", shortDefinition: "Action de se laver ou de se plonger dans un liquide." },
    { word: "BAINS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de BAIN.", lemma: "bain" },
    { word: "BANC", partOfSpeech: "nom masculin", shortDefinition: "Siège allongé ; groupe compact d'animaux ou de sable." },
    { word: "BANCS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de BANC.", lemma: "banc" },
    { word: "BA", partOfSpeech: "nom masculin", shortDefinition: "Dans l'Égypte ancienne, élément spirituel d'une personne." },
    { word: "BASE", partOfSpeech: "nom féminin", shortDefinition: "Partie qui soutient ; principe de départ." },
    { word: "BASES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de BASE.", lemma: "base" },
    { word: "BE", partOfSpeech: "nom masculin ou interjection", shortDefinition: "Cri ou son bref lexicalisé." },
    { word: "BEBE", partOfSpeech: "nom masculin", shortDefinition: "Très jeune enfant.", lemma: "bébé" },
    { word: "BEBES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de BEBE.", lemma: "bébé" },
    { word: "BI", partOfSpeech: "adjectif ou nom", shortDefinition: "Désigne ce qui est double ou lié à deux éléments." },
    { word: "BIEN", partOfSpeech: "nom masculin ou adverbe", shortDefinition: "Ce qui est utile ou favorable ; d'une bonne manière." },
    { word: "BIENS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de BIEN, choses possédées.", lemma: "bien" },
    { word: "BU", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe boire." },
    { word: "BORD", partOfSpeech: "nom masculin", shortDefinition: "Limite ou côté d'une surface ou d'un objet." },
    { word: "BORDS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de BORD.", lemma: "bord" },
    { word: "CAFE", partOfSpeech: "nom masculin", shortDefinition: "Boisson obtenue à partir de grains torréfiés ; lieu où on la sert.", lemma: "café" },
    { word: "CAFES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CAFE.", lemma: "café" },
    { word: "CA", partOfSpeech: "pronom démonstratif", shortDefinition: "Forme familière ou courante de cela.", lemma: "ça" },
    { word: "CE", partOfSpeech: "déterminant ou pronom démonstratif", shortDefinition: "Désigne une personne, une chose ou une idée proche dans le discours." },
    { word: "CES", partOfSpeech: "déterminant démonstratif pluriel", shortDefinition: "Désigne plusieurs personnes, choses ou idées proches dans le discours.", lemma: "ce" },
    { word: "CET", partOfSpeech: "déterminant démonstratif", shortDefinition: "Forme de CE devant un nom masculin commençant par une voyelle ou un h muet.", lemma: "ce" },
    { word: "CAGE", partOfSpeech: "nom féminin", shortDefinition: "Enceinte fermée servant à retenir ou protéger." },
    { word: "CAGES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de CAGE.", lemma: "cage" },
    { word: "CALME", partOfSpeech: "nom masculin ou adjectif", shortDefinition: "Absence d'agitation ; paisible." },
    { word: "CALMES", partOfSpeech: "nom masculin pluriel ou adjectif pluriel", shortDefinition: "Pluriel de CALME.", lemma: "calme" },
    { word: "CAMP", partOfSpeech: "nom masculin", shortDefinition: "Lieu où l'on s'installe temporairement ; groupe ou parti." },
    { word: "CAMPS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CAMP.", lemma: "camp" },
    { word: "CAVE", partOfSpeech: "nom féminin", shortDefinition: "Pièce souterraine servant souvent au stockage." },
    { word: "CAVES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de CAVE.", lemma: "cave" },
    { word: "CHAT", partOfSpeech: "nom masculin", shortDefinition: "Petit félin domestique." },
    { word: "CHATS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CHAT.", lemma: "chat" },
    { word: "CIEL", partOfSpeech: "nom masculin", shortDefinition: "Espace visible au-dessus de la terre." },
    { word: "CIELS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CIEL.", lemma: "ciel" },
    { word: "CI", partOfSpeech: "adverbe", shortDefinition: "Sert à désigner ce qui est proche, souvent dans ici, celui-ci ou celle-ci." },
    { word: "CITE", partOfSpeech: "nom féminin", shortDefinition: "Ville ; ensemble d'habitations.", lemma: "cité" },
    { word: "CITES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de CITE.", lemma: "cité" },
    { word: "CLAN", partOfSpeech: "nom masculin", shortDefinition: "Groupe uni par des liens familiaux, sociaux ou d'intérêt." },
    { word: "CLANS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CLAN.", lemma: "clan" },
    { word: "CODE", partOfSpeech: "nom masculin", shortDefinition: "Système de signes ou ensemble de règles." },
    { word: "CODES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CODE.", lemma: "code" },
    { word: "COIN", partOfSpeech: "nom masculin", shortDefinition: "Angle, endroit retiré ou petite zone." },
    { word: "COINS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de COIN.", lemma: "coin" },
    { word: "CONTE", partOfSpeech: "nom masculin", shortDefinition: "Récit imaginaire ou merveilleux." },
    { word: "CONTES", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de CONTE.", lemma: "conte" },
    { word: "CORDE", partOfSpeech: "nom féminin", shortDefinition: "Lien long et souple formé de fibres torsadées." },
    { word: "CORDES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de CORDE.", lemma: "corde" },
    { word: "COTE", partOfSpeech: "nom féminin", shortDefinition: "Dimension, classement ou valeur attribuée ; aussi rivage.", lemma: "cote" },
    { word: "COTES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de COTE.", lemma: "cote" },
    { word: "COUR", partOfSpeech: "nom féminin", shortDefinition: "Espace découvert près d'un bâtiment ; assemblée souveraine." },
    { word: "COURS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Enseignements ; mouvement ou progression.", lemma: "cours" },
    { word: "DE", partOfSpeech: "préposition", shortDefinition: "Introduit notamment l'origine, l'appartenance ou le complément." },
    { word: "DES", partOfSpeech: "article ou préposition contractée", shortDefinition: "Article indéfini pluriel ; contraction de de les." },
    { word: "DEVOIR", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Être obligé de faire quelque chose ; obligation ou travail à accomplir." },
    { word: "DIRE", partOfSpeech: "verbe", shortDefinition: "Exprimer quelque chose par la parole ou par écrit." },
    { word: "DIREZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe dire.", baseWord: "DIRE", formNote: "Forme du verbe dire.", lemma: "dire" },
    { word: "DAME", partOfSpeech: "nom féminin", shortDefinition: "Femme ; pièce ou carte dans certains jeux." },
    { word: "DAMES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de DAME.", lemma: "dame" },
    { word: "DATE", partOfSpeech: "nom féminin", shortDefinition: "Indication du jour, du mois et de l'année." },
    { word: "DATES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de DATE.", lemma: "date" },
    { word: "DENT", partOfSpeech: "nom féminin", shortDefinition: "Organe dur de la bouche servant notamment à mâcher." },
    { word: "DENTS", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de DENT.", lemma: "dent" },
    { word: "DON", partOfSpeech: "nom masculin", shortDefinition: "Action de donner ; aptitude particulière." },
    { word: "DONS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de DON.", lemma: "don" },
    { word: "DIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe dire.", baseWord: "DIRE", formNote: "Forme du verbe dire.", lemma: "dire" },
    { word: "DIT", partOfSpeech: "adjectif, nom ou participe passé", shortDefinition: "Ce qui est exprimé par la parole.", baseWord: "DIRE", formNote: "Forme du verbe dire.", lemma: "dire" },
    { word: "DRAP", partOfSpeech: "nom masculin", shortDefinition: "Grande pièce de tissu pour le lit." },
    { word: "DRAPS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de DRAP.", lemma: "drap" },
    { word: "DU", partOfSpeech: "article contracté", shortDefinition: "Contraction de de le ; peut aussi marquer une quantité partitive." },
    { word: "DUS", partOfSpeech: "adjectif pluriel ou participe passé pluriel", shortDefinition: "Forme plurielle de dû.", baseWord: "DEVOIR", formNote: "Forme du verbe devoir.", lemma: "devoir" },
    { word: "DUE", partOfSpeech: "adjectif féminin ou participe passé", shortDefinition: "Forme féminine de dû ; ce qui est attendu ou exigible.", baseWord: "DEVOIR", formNote: "Forme du verbe devoir.", lemma: "devoir" },
    { word: "DUT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe devoir.", baseWord: "DEVOIR", formNote: "Forme du verbe devoir.", lemma: "devoir" },
    { word: "DUNE", partOfSpeech: "nom féminin", shortDefinition: "Colline de sable formée par le vent." },
    { word: "DUNES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de DUNE.", lemma: "dune" },
    { word: "ECOLE", partOfSpeech: "nom féminin", shortDefinition: "Établissement où l'on enseigne ; courant de pensée.", lemma: "école" },
    { word: "ECOLES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de ECOLE.", lemma: "école" },
    { word: "ELAN", partOfSpeech: "nom masculin", shortDefinition: "Mouvement soudain ; grand cervidé des régions froides.", lemma: "élan" },
    { word: "ELANS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de ELAN.", lemma: "élan" },
    { word: "EN", partOfSpeech: "préposition ou pronom", shortDefinition: "Indique notamment le lieu, le temps, la matière ou reprend un complément." },
    { word: "ES", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "EST", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Forme du verbe être ; point cardinal où le soleil se lève.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "ET", partOfSpeech: "conjonction", shortDefinition: "Sert à relier deux éléments." },
    { word: "ETAIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "ETAIT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "ETANT", partOfSpeech: "participe présent", shortDefinition: "Forme du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "ETIEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "EU", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "EUE", partOfSpeech: "participe passé féminin", shortDefinition: "Forme du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "EUES", partOfSpeech: "participe passé féminin pluriel", shortDefinition: "Forme du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "EUS", partOfSpeech: "verbe ou participe passé pluriel", shortDefinition: "Forme du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "EUT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "EUX", partOfSpeech: "pronom personnel", shortDefinition: "Désigne plusieurs personnes ou choses déjà évoquées." },
    { word: "EH", partOfSpeech: "interjection", shortDefinition: "Sert à interpeller, attirer l'attention ou marquer une réaction." },
    { word: "EX", partOfSpeech: "nom ou adjectif", shortDefinition: "Ancien conjoint, ancienne conjointe ou personne ayant occupé une fonction." },
    { word: "FA", partOfSpeech: "nom masculin", shortDefinition: "Note de musique." },
    { word: "FAIRE", partOfSpeech: "verbe", shortDefinition: "Réaliser, produire ou accomplir une action." },
    { word: "FAIT", partOfSpeech: "nom masculin ou participe passé", shortDefinition: "Ce qui est arrivé ou accompli.", baseWord: "FAIRE", formNote: "Forme du verbe faire.", lemma: "faire" },
    { word: "FERA", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe faire.", baseWord: "FAIRE", formNote: "Forme du verbe faire.", lemma: "faire" },
    { word: "FEREZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe faire.", baseWord: "FAIRE", formNote: "Forme du verbe faire.", lemma: "faire" },
    { word: "FETE", partOfSpeech: "nom féminin", shortDefinition: "Réjouissance ou célébration.", lemma: "fête" },
    { word: "FETES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de FETE.", lemma: "fête" },
    { word: "FEU", partOfSpeech: "nom masculin", shortDefinition: "Combustion produisant chaleur et lumière." },
    { word: "FEUX", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de FEU.", lemma: "feu" },
    { word: "FIT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe faire.", baseWord: "FAIRE", formNote: "Forme du verbe faire.", lemma: "faire" },
    { word: "FIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe faire.", baseWord: "FAIRE", formNote: "Forme du verbe faire.", lemma: "faire" },
    { word: "FI", partOfSpeech: "interjection", shortDefinition: "Exprime le dégoût, le rejet ou le mépris." },
    { word: "FLEUR", partOfSpeech: "nom féminin", shortDefinition: "Partie colorée de nombreuses plantes." },
    { word: "FLEURS", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de FLEUR.", lemma: "fleur" },
    { word: "FONT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe faire.", baseWord: "FAIRE", formNote: "Forme du verbe faire.", lemma: "faire" },
    { word: "GARE", partOfSpeech: "nom féminin", shortDefinition: "Lieu aménagé pour les voyageurs et les trains." },
    { word: "GARES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de GARE.", lemma: "gare" },
    { word: "GOUT", partOfSpeech: "nom masculin", shortDefinition: "Sens qui perçoit les saveurs ; préférence.", lemma: "goût" },
    { word: "GOUTS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de GOUT.", lemma: "goût" },
    { word: "FUS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "FUSSE", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "FUT", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Forme du verbe être ; partie allongée d'un objet.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "GO", partOfSpeech: "nom masculin", shortDefinition: "Jeu de stratégie d'origine asiatique." },
    { word: "HA", partOfSpeech: "interjection ou nom masculin", shortDefinition: "Exprime notamment la surprise ou le rire." },
    { word: "HE", partOfSpeech: "interjection", shortDefinition: "Sert à interpeller ou attirer l'attention.", lemma: "hé" },
    { word: "HI", partOfSpeech: "interjection", shortDefinition: "Évoque un rire bref ou un son aigu." },
    { word: "HO", partOfSpeech: "interjection", shortDefinition: "Sert à appeler, arrêter ou marquer une réaction." },
    { word: "IDEE", partOfSpeech: "nom féminin", shortDefinition: "Représentation de l'esprit ; pensée ou projet.", lemma: "idée" },
    { word: "IDEES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de IDEE.", lemma: "idée" },
    { word: "ILE", partOfSpeech: "nom féminin", shortDefinition: "Terre entourée d'eau.", lemma: "île" },
    { word: "ILES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de ILE.", lemma: "île" },
    { word: "IL", partOfSpeech: "pronom personnel", shortDefinition: "Désigne une personne ou une chose au masculin singulier." },
    { word: "ILS", partOfSpeech: "pronom personnel pluriel", shortDefinition: "Désigne plusieurs personnes ou choses au masculin ou au mixte.", lemma: "il" },
    { word: "IF", partOfSpeech: "nom masculin", shortDefinition: "Arbre résineux aux aiguilles persistantes." },
    { word: "IN", partOfSpeech: "adjectif ou nom", shortDefinition: "À la mode ou dans le coup, par opposition à out." },
    { word: "IRA", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "IRAI", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "IREZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "IRIEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "JE", partOfSpeech: "pronom personnel", shortDefinition: "Désigne la personne qui parle." },
    { word: "JEU", partOfSpeech: "nom masculin", shortDefinition: "Activité de divertissement régie par des règles." },
    { word: "JEUX", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de JEU.", lemma: "jeu" },
    { word: "JOUR", partOfSpeech: "nom masculin", shortDefinition: "Durée de vingt-quatre heures ; clarté du soleil." },
    { word: "JOURS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de JOUR.", lemma: "jour" },
    { word: "KA", partOfSpeech: "nom masculin", shortDefinition: "Dans l'Égypte ancienne, principe vital d'une personne." },
    { word: "KO", partOfSpeech: "nom masculin ou adjectif", shortDefinition: "Mise hors de combat ; très fatigué ou vaincu.", lemma: "K.-O." },
    { word: "LA", partOfSpeech: "article ou pronom", shortDefinition: "Désigne un nom féminin singulier ou remplace un complément féminin." },
    { word: "LES", partOfSpeech: "article ou pronom pluriel", shortDefinition: "Désigne plusieurs noms ou remplace plusieurs compléments.", lemma: "le" },
    { word: "LAC", partOfSpeech: "nom masculin", shortDefinition: "Grande étendue d'eau entourée de terres." },
    { word: "LACS", partOfSpeech: "nom masculin pluriel", shortDefinition: "Pluriel de LAC.", lemma: "lac" },
    { word: "LE", partOfSpeech: "article ou pronom", shortDefinition: "Désigne un nom masculin singulier ou remplace un complément masculin." },
    { word: "LI", partOfSpeech: "nom masculin", shortDefinition: "Ancienne unité de distance chinoise." },
    { word: "LU", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe lire." },
    { word: "LUI", partOfSpeech: "pronom personnel", shortDefinition: "Désigne une personne ou une chose comme complément indirect." },
    { word: "LUNE", partOfSpeech: "nom féminin", shortDefinition: "Satellite naturel de la Terre." },
    { word: "LUNES", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de LUNE.", lemma: "lune" },
    { word: "MAIN", partOfSpeech: "nom féminin", shortDefinition: "Partie du corps au bout du bras, servant à saisir." },
    { word: "MAINS", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de MAIN.", lemma: "main" },
    { word: "MA", partOfSpeech: "déterminant possessif", shortDefinition: "Indique qu'un nom féminin singulier appartient à la personne qui parle." },
    { word: "MER", partOfSpeech: "nom féminin", shortDefinition: "Grande étendue d'eau salée." },
    { word: "MERS", partOfSpeech: "nom féminin pluriel", shortDefinition: "Pluriel de MER.", lemma: "mer" },
    { word: "ME", partOfSpeech: "pronom personnel", shortDefinition: "Représente la personne qui parle comme complément." },
    { word: "MES", partOfSpeech: "déterminant possessif pluriel", shortDefinition: "Indique que plusieurs éléments appartiennent à la personne qui parle.", lemma: "ma" },
    { word: "MOI", partOfSpeech: "pronom personnel", shortDefinition: "Désigne la personne qui parle, souvent après une préposition ou pour insister." },
    { word: "MON", partOfSpeech: "déterminant possessif", shortDefinition: "Indique qu'un nom masculin singulier appartient à la personne qui parle." },
    { word: "MU", partOfSpeech: "participe passé ou nom masculin", shortDefinition: "Forme du verbe mouvoir ; lettre grecque." },
    { word: "NA", partOfSpeech: "interjection ou nom féminin", shortDefinition: "Son bref ou mot lexicalisé dans la source." },
    { word: "NE", partOfSpeech: "adverbe de négation", shortDefinition: "Marque la négation, souvent avec pas, plus ou jamais." },
    { word: "NI", partOfSpeech: "conjonction", shortDefinition: "Sert à coordonner deux éléments dans une négation." },
    { word: "NO", partOfSpeech: "nom masculin", shortDefinition: "Théâtre traditionnel japonais, aussi écrit nô.", lemma: "nô" },
    { word: "NON", partOfSpeech: "adverbe ou nom masculin", shortDefinition: "Sert à exprimer le refus ou la négation." },
    { word: "NU", partOfSpeech: "adjectif ou nom", shortDefinition: "Sans vêtement ou sans couverture." },
    { word: "OC", partOfSpeech: "nom masculin", shortDefinition: "Langue d'oc ou ensemble linguistique occitan." },
    { word: "OH", partOfSpeech: "interjection", shortDefinition: "Exprime notamment la surprise, l'appel ou l'émotion." },
    { word: "OK", partOfSpeech: "adjectif ou adverbe", shortDefinition: "Indique l'accord ou que tout va bien." },
    { word: "ON", partOfSpeech: "pronom personnel", shortDefinition: "Désigne une personne indéterminée ou un groupe incluant parfois le locuteur." },
    { word: "ONT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe avoir.", baseWord: "AVOIR", formNote: "Forme du verbe avoir.", lemma: "avoir" },
    { word: "OU", partOfSpeech: "conjonction ou pronom", shortDefinition: "Marque une alternative ou introduit une question de lieu.", lemma: "où" },
    { word: "OR", partOfSpeech: "nom masculin ou conjonction", shortDefinition: "Métal précieux jaune ; sert aussi à introduire une opposition ou une transition." },
    { word: "OS", partOfSpeech: "nom masculin", shortDefinition: "Pièce dure du squelette." },
    { word: "PAS", partOfSpeech: "adverbe ou nom masculin", shortDefinition: "Marque la négation ; mouvement du pied en marchant." },
    { word: "PAR", partOfSpeech: "préposition", shortDefinition: "Indique notamment le moyen, le passage, l'agent ou la cause." },
    { word: "PEUX", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe pouvoir.", baseWord: "POUVOIR", formNote: "Forme du verbe pouvoir.", lemma: "pouvoir" },
    { word: "PI", partOfSpeech: "nom masculin", shortDefinition: "Lettre grecque et constante mathématique." },
    { word: "POUVOIR", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Être capable de faire quelque chose ; autorité ou capacité d'action." },
    { word: "POUR", partOfSpeech: "préposition", shortDefinition: "Indique notamment le but, la destination, la cause ou le bénéficiaire." },
    { word: "PU", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe pouvoir.", baseWord: "POUVOIR", formNote: "Forme du verbe pouvoir.", lemma: "pouvoir" },
    { word: "PUS", partOfSpeech: "verbe ou participe passé pluriel", shortDefinition: "Forme du verbe pouvoir.", baseWord: "POUVOIR", formNote: "Forme du verbe pouvoir.", lemma: "pouvoir" },
    { word: "PUT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe pouvoir.", baseWord: "POUVOIR", formNote: "Forme du verbe pouvoir.", lemma: "pouvoir" },
    { word: "QUE", partOfSpeech: "conjonction ou pronom", shortDefinition: "Introduit une proposition ou remplace un complément." },
    { word: "QUI", partOfSpeech: "pronom", shortDefinition: "Désigne une personne ou introduit une proposition relative." },
    { word: "QUOI", partOfSpeech: "pronom", shortDefinition: "Désigne une chose dans une question, une exclamation ou une reprise." },
    { word: "RA", partOfSpeech: "nom masculin", shortDefinition: "Note de musique dans certains systèmes ou nom divin égyptien selon les usages." },
    { word: "RI", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe rire." },
    { word: "RU", partOfSpeech: "nom masculin", shortDefinition: "Petit ruisseau." },
    { word: "SA", partOfSpeech: "déterminant possessif", shortDefinition: "Indique qu'un nom féminin singulier appartient à une personne ou une chose déjà évoquée." },
    { word: "SAVOIR", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Connaître quelque chose ; ensemble de connaissances." },
    { word: "SAVEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe savoir.", baseWord: "SAVOIR", formNote: "Forme du verbe savoir.", lemma: "savoir" },
    { word: "SE", partOfSpeech: "pronom personnel", shortDefinition: "Marque une action réfléchie ou réciproque." },
    { word: "SERAI", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SERA", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SERAS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SERIEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SEREZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SI", partOfSpeech: "conjonction, adverbe ou nom masculin", shortDefinition: "Introduit une condition ; sert aussi à renforcer ou à répondre affirmativement." },
    { word: "SOIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SOIT", partOfSpeech: "verbe ou conjonction", shortDefinition: "Forme du verbe être ; sert aussi à introduire une alternative.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SOYEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SOYONS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SON", partOfSpeech: "déterminant possessif ou nom masculin", shortDefinition: "Indique l'appartenance ; sensation perçue par l'ouïe." },
    { word: "SONT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SU", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe savoir.", baseWord: "SAVOIR", formNote: "Forme du verbe savoir.", lemma: "savoir" },
    { word: "SUE", partOfSpeech: "participe passé féminin", shortDefinition: "Forme du verbe savoir.", baseWord: "SAVOIR", formNote: "Forme du verbe savoir.", lemma: "savoir" },
    { word: "SUIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe être ou du verbe suivre.", baseWord: "ETRE", formNote: "Forme du verbe être.", lemma: "être" },
    { word: "SUR", partOfSpeech: "préposition ou adjectif", shortDefinition: "Indique la position au-dessus ; peut aussi signifier acide ou certain." },
    { word: "SUS", partOfSpeech: "verbe ou adverbe", shortDefinition: "Forme du verbe savoir ; peut aussi signifier dessus dans un emploi ancien.", baseWord: "SAVOIR", formNote: "Forme du verbe savoir.", lemma: "savoir" },
    { word: "SUT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe savoir.", baseWord: "SAVOIR", formNote: "Forme du verbe savoir.", lemma: "savoir" },
    { word: "TA", partOfSpeech: "déterminant possessif", shortDefinition: "Indique qu'un nom féminin singulier appartient à la personne à qui l'on parle." },
    { word: "TE", partOfSpeech: "pronom personnel", shortDefinition: "Représente la personne à qui l'on parle comme complément." },
    { word: "TON", partOfSpeech: "déterminant possessif ou nom masculin", shortDefinition: "Indique l'appartenance ; hauteur ou manière de parler." },
    { word: "TO", partOfSpeech: "nom masculin ou pronom", shortDefinition: "Petit mot lexicalisé, attesté comme entrée courte dans la source." },
    { word: "TU", partOfSpeech: "pronom personnel", shortDefinition: "Désigne la personne à qui l'on parle." },
    { word: "UD", partOfSpeech: "nom masculin", shortDefinition: "Instrument de musique à cordes, aussi appelé oud." },
    { word: "UN", partOfSpeech: "article, adjectif numéral ou pronom", shortDefinition: "Désigne une unité ou un élément indéfini." },
    { word: "UNE", partOfSpeech: "article, adjectif numéral ou pronom féminin", shortDefinition: "Féminin de UN.", lemma: "un" },
    { word: "US", partOfSpeech: "nom masculin pluriel", shortDefinition: "Habitudes, coutumes ou usages établis." },
    { word: "UT", partOfSpeech: "nom masculin", shortDefinition: "Ancien nom de la note do." },
    { word: "VA", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "VAS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "VAIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "VENIR", partOfSpeech: "verbe", shortDefinition: "Se déplacer vers le lieu où l'on parle ; arriver." },
    { word: "VENU", partOfSpeech: "participe passé ou nom", shortDefinition: "Forme du verbe venir ; personne arrivée quelque part.", baseWord: "VENIR", formNote: "Forme du verbe venir.", lemma: "venir" },
    { word: "VE", partOfSpeech: "interjection", shortDefinition: "Son bref lexicalisé dans la source." },
    { word: "VEUT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe vouloir.", baseWord: "VOULOIR", formNote: "Forme du verbe vouloir.", lemma: "vouloir" },
    { word: "VEUX", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe vouloir.", baseWord: "VOULOIR", formNote: "Forme du verbe vouloir.", lemma: "vouloir" },
    { word: "VINT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe venir.", baseWord: "VENIR", formNote: "Forme du verbe venir.", lemma: "venir" },
    { word: "VIT", partOfSpeech: "verbe", shortDefinition: "Forme du verbe vivre ou voir selon le contexte.", lemma: "vivre" },
    { word: "VIVRE", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Être en vie ; manière de mener son existence." },
    { word: "VIS", partOfSpeech: "nom féminin ou verbe", shortDefinition: "Petite tige filetée ; forme des verbes voir ou vivre." },
    { word: "VOIR", partOfSpeech: "verbe", shortDefinition: "Percevoir par les yeux ; constater ou comprendre." },
    { word: "VOIE", partOfSpeech: "nom féminin ou verbe", shortDefinition: "Chemin, direction ou moyen ; forme du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VOIS", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VOIT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VONT", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe aller.", baseWord: "ALLER", formNote: "Forme du verbe aller.", lemma: "aller" },
    { word: "VOS", partOfSpeech: "déterminant possessif pluriel", shortDefinition: "Indique que plusieurs éléments appartiennent à la ou aux personnes à qui l'on parle." },
    { word: "VOUS", partOfSpeech: "pronom personnel", shortDefinition: "Désigne la ou les personnes à qui l'on parle." },
    { word: "VOULOIR", partOfSpeech: "verbe ou nom masculin", shortDefinition: "Désirer, souhaiter ou avoir l'intention de faire quelque chose." },
    { word: "VOYEZ", partOfSpeech: "verbe", shortDefinition: "Forme conjuguée du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VS", partOfSpeech: "préposition ou nom", shortDefinition: "Forme abrégée de versus, marquant l'opposition." },
    { word: "VU", partOfSpeech: "participe passé", shortDefinition: "Forme du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VUE", partOfSpeech: "nom féminin ou participe passé féminin", shortDefinition: "Faculté de voir ; forme féminine de VU.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VUES", partOfSpeech: "nom féminin pluriel ou participe passé féminin pluriel", shortDefinition: "Pluriel de VUE ; forme du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "VUS", partOfSpeech: "participe passé pluriel", shortDefinition: "Forme du verbe voir.", baseWord: "VOIR", formNote: "Forme du verbe voir.", lemma: "voir" },
    { word: "XI", partOfSpeech: "nom masculin", shortDefinition: "Lettre de l'alphabet grec." },
  ]),
  AA: {
    word: "AA",
    partOfSpeech: "nom masculin",
    shortDefinition: "Lave basaltique à surface rugueuse.",
    usage: "Mot court lexicalisé, utile dans les croisements.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AAS: {
    word: "AAS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de AA, lave basaltique rugueuse.",
    lemma: "aa",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ARE: {
    word: "ARE",
    partOfSpeech: "nom masculin",
    shortDefinition: "Unité de surface valant 100 mètres carrés.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ARES: {
    word: "ARES",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de ARE, unité de surface.",
    lemma: "are",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ASE: {
    word: "ASE",
    partOfSpeech: "nom féminin",
    shortDefinition: "Suffixe lexicalisé désignant une enzyme.",
    usage: "Mot technique court, à garder visible pour éviter la surprise.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ASES: {
    word: "ASES",
    partOfSpeech: "nom féminin pluriel",
    shortDefinition: "Pluriel de ASE, terme lié aux enzymes.",
    lemma: "ase",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AIR: {
    word: "AIR",
    partOfSpeech: "nom masculin",
    shortDefinition: "Mélange gazeux que l'on respire ; aussi mélodie.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AIRS: {
    word: "AIRS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de AIR.",
    lemma: "air",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AMI: {
    word: "AMI",
    partOfSpeech: "nom masculin",
    shortDefinition: "Personne avec qui l'on a une relation d'affection ou de confiance.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AMIE: {
    word: "AMIE",
    partOfSpeech: "nom féminin",
    shortDefinition: "Féminin de AMI.",
    lemma: "ami",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AMIS: {
    word: "AMIS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de AMI.",
    lemma: "ami",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AN: {
    word: "AN",
    partOfSpeech: "nom masculin",
    shortDefinition: "Durée d'une année.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ANS: {
    word: "ANS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de AN.",
    lemma: "an",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ARC: {
    word: "ARC",
    partOfSpeech: "nom masculin",
    shortDefinition: "Arme courbe lançant des flèches ; forme courbée.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ARCS: {
    word: "ARCS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de ARC.",
    lemma: "arc",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ART: {
    word: "ART",
    partOfSpeech: "nom masculin",
    shortDefinition: "Activité de création ou savoir-faire maîtrisé.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ARTS: {
    word: "ARTS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de ART.",
    lemma: "art",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AS: {
    word: "AS",
    partOfSpeech: "nom masculin",
    shortDefinition: "Carte marquée d'un seul symbole ; personne très habile.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AXE: {
    word: "AXE",
    partOfSpeech: "nom masculin",
    shortDefinition: "Ligne autour de laquelle tourne un objet ; direction principale.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  AXES: {
    word: "AXES",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de AXE.",
    lemma: "axe",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BAL: {
    word: "BAL",
    partOfSpeech: "nom masculin",
    shortDefinition: "Réunion où l'on danse.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BALS: {
    word: "BALS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de BAL.",
    lemma: "bal",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BAR: {
    word: "BAR",
    partOfSpeech: "nom masculin",
    shortDefinition: "Lieu où l'on consomme des boissons ; aussi poisson marin.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BARS: {
    word: "BARS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de BAR.",
    lemma: "bar",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BEC: {
    word: "BEC",
    partOfSpeech: "nom masculin",
    shortDefinition: "Partie dure et saillante de la bouche d'un oiseau.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BECS: {
    word: "BECS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de BEC.",
    lemma: "bec",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BLE: {
    word: "BLE",
    partOfSpeech: "nom masculin",
    shortDefinition: "Céréale cultivée pour son grain.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BLES: {
    word: "BLES",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de BLE, céréale cultivée pour son grain.",
    lemma: "blé",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BOL: {
    word: "BOL",
    partOfSpeech: "nom masculin",
    shortDefinition: "Récipient creux servant à boire ou à manger.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BOLS: {
    word: "BOLS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de BOL.",
    lemma: "bol",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BUS: {
    word: "BUS",
    partOfSpeech: "nom masculin",
    shortDefinition: "Véhicule de transport collectif.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BUT: {
    word: "BUT",
    partOfSpeech: "nom masculin",
    shortDefinition: "Objectif à atteindre ; point marqué dans certains sports.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  BUTS: {
    word: "BUTS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de BUT.",
    lemma: "but",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CAP: {
    word: "CAP",
    partOfSpeech: "nom masculin",
    shortDefinition: "Direction suivie ; pointe de terre avancée dans la mer.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CAPS: {
    word: "CAPS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de CAP.",
    lemma: "cap",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CAR: {
    word: "CAR",
    partOfSpeech: "nom masculin ou conjonction",
    shortDefinition: "Autocar ; ou mot introduisant une cause.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CARS: {
    word: "CARS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de CAR, véhicule de transport.",
    lemma: "car",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CAS: {
    word: "CAS",
    partOfSpeech: "nom masculin",
    shortDefinition: "Situation particulière ; exemple à examiner.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CLE: {
    word: "CLE",
    partOfSpeech: "nom féminin",
    shortDefinition: "Objet servant à ouvrir une serrure ; moyen d'accès.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CLES: {
    word: "CLES",
    partOfSpeech: "nom féminin pluriel",
    shortDefinition: "Pluriel de CLE.",
    lemma: "clé",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  COQ: {
    word: "COQ",
    partOfSpeech: "nom masculin",
    shortDefinition: "Mâle de la poule.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  COQS: {
    word: "COQS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de COQ.",
    lemma: "coq",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  COU: {
    word: "COU",
    partOfSpeech: "nom masculin",
    shortDefinition: "Partie du corps reliant la tête au tronc.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  COUS: {
    word: "COUS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de COU.",
    lemma: "cou",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CRI: {
    word: "CRI",
    partOfSpeech: "nom masculin",
    shortDefinition: "Son fort émis par la voix.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  CRIS: {
    word: "CRIS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de CRI.",
    lemma: "cri",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  DA: {
    word: "DA",
    partOfSpeech: "interjection",
    shortDefinition: "Mot familier ou emprunté pouvant marquer l'affirmation.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  DAS: {
    word: "DAS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de DA.",
    lemma: "da",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  DIAM: {
    word: "DIAM",
    partOfSpeech: "nom masculin",
    shortDefinition: "Terme familier pour diamant.",
    usage: "Mot court accepté après revue manuelle, cohérent avec le pluriel DIAMS.",
    lemma: "diamant",
    sources: [
      { name: "Lexique", version: "3.83" },
      { name: "Lexique", version: "4.00" },
      { name: "Morphalou", version: "3.1" }
    ],
    reviewed: true
  },
  DO: {
    word: "DO",
    partOfSpeech: "nom masculin",
    shortDefinition: "Note de musique.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  DOS: {
    word: "DOS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de DO, note de musique.",
    lemma: "do",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  DUO: {
    word: "DUO",
    partOfSpeech: "nom masculin",
    shortDefinition: "Ensemble de deux personnes ou composition pour deux voix ou instruments.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  DUOS: {
    word: "DUOS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de DUO.",
    lemma: "duo",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  EAU: {
    word: "EAU",
    partOfSpeech: "nom féminin",
    shortDefinition: "Liquide transparent indispensable à la vie.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  EAUX: {
    word: "EAUX",
    partOfSpeech: "nom féminin pluriel",
    shortDefinition: "Pluriel de EAU.",
    lemma: "eau",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ELU: {
    word: "ELU",
    partOfSpeech: "nom masculin ou adjectif",
    shortDefinition: "Personne choisie par élection ; choisi.",
    lemma: "élu",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ELUS: {
    word: "ELUS",
    partOfSpeech: "nom masculin pluriel ou adjectif pluriel",
    shortDefinition: "Pluriel de ELU.",
    lemma: "élu",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  EMU: {
    word: "EMU",
    partOfSpeech: "adjectif",
    shortDefinition: "Touché par une émotion.",
    lemma: "ému",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  EMUS: {
    word: "EMUS",
    partOfSpeech: "adjectif pluriel",
    shortDefinition: "Pluriel de EMU.",
    lemma: "ému",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  EPI: {
    word: "EPI",
    partOfSpeech: "nom masculin",
    shortDefinition: "Partie terminale d'une céréale portant les grains.",
    lemma: "épi",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  EPIS: {
    word: "EPIS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de EPI, partie d'une céréale portant les grains.",
    lemma: "épi",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ERG: {
    word: "ERG",
    partOfSpeech: "nom masculin",
    shortDefinition: "Grande étendue de dunes dans un désert.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ERGS: {
    word: "ERGS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de ERG, étendue dunaire.",
    lemma: "erg",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ETE: {
    word: "ETE",
    partOfSpeech: "nom masculin ou participe passé",
    shortDefinition: "Saison chaude ; aussi forme du verbe être.",
    lemma: "été",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ETRE: {
    word: "ETRE",
    partOfSpeech: "verbe",
    shortDefinition: "Exister ; se trouver dans un état ou une situation.",
    lemma: "être",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ETES: {
    word: "ETES",
    partOfSpeech: "verbe",
    shortDefinition: "Forme conjuguée du verbe être.",
    baseWord: "ETRE",
    formNote: "Forme du verbe être.",
    lemma: "être",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FEE: {
    word: "FEE",
    partOfSpeech: "nom féminin",
    shortDefinition: "Personnage merveilleux doté de pouvoirs magiques.",
    lemma: "fée",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FEES: {
    word: "FEES",
    partOfSpeech: "nom féminin pluriel",
    shortDefinition: "Pluriel de FEE.",
    lemma: "fée",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FIL: {
    word: "FIL",
    partOfSpeech: "nom masculin",
    shortDefinition: "Brin long et fin de matière textile ou métallique.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FILS: {
    word: "FILS",
    partOfSpeech: "nom masculin",
    shortDefinition: "Pluriel de FIL ; aussi enfant masculin par rapport à ses parents.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FOI: {
    word: "FOI",
    partOfSpeech: "nom féminin",
    shortDefinition: "Confiance ou croyance.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FOIS: {
    word: "FOIS",
    partOfSpeech: "nom féminin",
    shortDefinition: "Occurrence ou répétition d'un fait.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FOU: {
    word: "FOU",
    partOfSpeech: "nom masculin ou adjectif",
    shortDefinition: "Personne déraisonnable ; qui manque de raison ou de mesure.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  FOUS: {
    word: "FOUS",
    partOfSpeech: "nom masculin pluriel ou adjectif pluriel",
    shortDefinition: "Pluriel de FOU.",
    lemma: "fou",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  GAG: {
    word: "GAG",
    partOfSpeech: "nom masculin",
    shortDefinition: "Effet comique bref, souvent visuel ou verbal.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  HOP: {
    word: "HOP",
    partOfSpeech: "interjection",
    shortDefinition: "Interjection marquant un saut, un effort ou une action rapide.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  KHI: {
    word: "KHI",
    partOfSpeech: "nom masculin",
    shortDefinition: "Lettre de l'alphabet grec.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  KIF: {
    word: "KIF",
    partOfSpeech: "nom masculin",
    shortDefinition: "Plaisir intense ; peut aussi désigner un chanvre à fumer.",
    usage: "Mot familier courant, lexicalisé.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  KIFS: {
    word: "KIFS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de KIF.",
    lemma: "kif",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  METTRE: {
    word: "METTRE",
    partOfSpeech: "verbe",
    shortDefinition: "Placer quelque chose quelque part ; faire passer dans un état.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  MI: {
    word: "MI",
    partOfSpeech: "nom masculin",
    shortDefinition: "Note de musique.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  MIS: {
    word: "MIS",
    partOfSpeech: "participe passé",
    shortDefinition: "Forme du verbe mettre.",
    baseWord: "METTRE",
    formNote: "Forme du verbe mettre.",
    lemma: "mettre",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  PFF: {
    word: "PFF",
    partOfSpeech: "interjection",
    shortDefinition: "Interjection exprimant le dédain, la lassitude ou le souffle.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  PFFT: {
    word: "PFFT",
    partOfSpeech: "interjection",
    shortDefinition: "Variante expressive de PFF.",
    lemma: "pff",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  PSST: {
    word: "PSST",
    partOfSpeech: "interjection",
    shortDefinition: "Interjection discrète pour attirer l'attention.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  QI: {
    word: "QI",
    partOfSpeech: "nom masculin",
    shortDefinition: "Quotient intellectuel.",
    usage: "Sigle lexicalisé et accepté comme mot court.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  RE: {
    word: "RE",
    partOfSpeech: "nom masculin",
    shortDefinition: "Note de musique.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  RES: {
    word: "RES",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de RE, note de musique.",
    lemma: "re",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  TIPER: {
    word: "TIPER",
    partOfSpeech: "verbe",
    shortDefinition: "Donner un pourboire ou une contribution volontaire.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  TIPA: {
    word: "TIPA",
    partOfSpeech: "verbe",
    shortDefinition: "Forme conjuguée du verbe tiper.",
    usage: "Forme courte acceptée par règle, rattachée au lemme TIPER déjà présent.",
    baseWord: "TIPER",
    formNote: "Forme du verbe tiper.",
    lemma: "tiper",
    sources: [{ name: "Règle Sérénimot GO A" }],
    reviewed: true
  },
  WOK: {
    word: "WOK",
    partOfSpeech: "nom masculin",
    shortDefinition: "Poêle profonde d'origine asiatique.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  WOKS: {
    word: "WOKS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de WOK.",
    lemma: "wok",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  WON: {
    word: "WON",
    partOfSpeech: "nom masculin",
    shortDefinition: "Monnaie de la Corée du Sud et de la Corée du Nord.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  WONS: {
    word: "WONS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de WON, monnaie coréenne.",
    lemma: "won",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  WU: {
    word: "WU",
    partOfSpeech: "nom masculin",
    shortDefinition: "Groupe de parlers chinois.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  WUS: {
    word: "WUS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de WU.",
    lemma: "wu",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  YANG: {
    word: "YANG",
    partOfSpeech: "nom masculin",
    shortDefinition: "Principe actif et lumineux de la pensée chinoise traditionnelle.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  YEN: {
    word: "YEN",
    partOfSpeech: "nom masculin",
    shortDefinition: "Monnaie du Japon.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  YENS: {
    word: "YENS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de YEN, monnaie japonaise.",
    lemma: "yen",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  YIN: {
    word: "YIN",
    partOfSpeech: "nom masculin",
    shortDefinition: "Principe passif et sombre de la pensée chinoise traditionnelle.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  YINS: {
    word: "YINS",
    partOfSpeech: "nom masculin pluriel",
    shortDefinition: "Pluriel de YIN.",
    lemma: "yin",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ZEN: {
    word: "ZEN",
    partOfSpeech: "nom masculin ou adjectif",
    shortDefinition: "Courant du bouddhisme ; par extension, calme et détendu.",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  },
  ZENS: {
    word: "ZENS",
    partOfSpeech: "nom masculin pluriel ou adjectif pluriel",
    shortDefinition: "Pluriel de ZEN.",
    lemma: "zen",
    sources: [{ name: "Lexique", version: "4.00" }],
    reviewed: true
  }
};

export const BUNDLED_WORD_EXPLANATIONS = resolveLinkedExplanations(RAW_WORD_EXPLANATIONS);

let wordExplanations = BUNDLED_WORD_EXPLANATIONS;

export async function loadWordExplanationsFromUrl(url = WORD_EXPLANATION_LENGTH_FILE_PATHS[2]): Promise<number> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Impossible de charger les explications (${response.status}).`);
  }

  return loadWordExplanationsFromText(await response.text());
}

export async function loadWordExplanationsForLengths(lengths: readonly (typeof WORD_EXPLANATION_LENGTHS)[number][]): Promise<number> {
  return loadWordExplanationsFromUrls(lengths.map((length) => WORD_EXPLANATION_LENGTH_FILE_PATHS[length]));
}

export async function loadWordExplanationsForInitials(initials: readonly (typeof WORD_EXPLANATION_INITIALS)[number][]): Promise<number> {
  return loadWordExplanationsFromUrls(initials.map((initial) => WORD_EXPLANATION_INITIAL_FILE_PATHS[initial]));
}

export async function loadWordExplanationsFromUrls(urls: readonly string[]): Promise<number> {
  const responses = await Promise.all(urls.map((url) => fetch(url)));

  responses.forEach((response) => {
    if (!response.ok) {
      throw new Error(`Impossible de charger les explications (${response.status}).`);
    }
  });

  const sources = await Promise.all(responses.map((response) => response.text()));
  return loadWordExplanationsFromTexts(sources);
}

export function loadWordExplanationsFromText(source: string): number {
  wordExplanations = BUNDLED_WORD_EXPLANATIONS;
  return loadWordExplanationsFromTexts([source]);
}

function loadWordExplanationsFromTexts(sources: readonly string[]): number {
  const entries = sources.flatMap((source) => parseWordExplanations(source));

  if (entries.length === 0) {
    throw new Error("Le fichier d'explications est vide.");
  }

  wordExplanations = resolveLinkedExplanations({
    ...wordExplanations,
    ...Object.fromEntries(entries.map((entry) => [normalizeWord(entry.word), { ...entry, word: normalizeWord(entry.word) }]))
  });

  return Object.keys(wordExplanations).length;
}

function parseWordExplanations(source: string): WordExplanation[] {
  const payload = JSON.parse(source) as { entries?: WordExplanation[] };
  const entries = payload.entries ?? [];

  if (entries.length === 0) {
    throw new Error("Le fichier d'explications est vide.");
  }

  return entries;
}

function resolveLinkedExplanations(explanations: Record<string, WordExplanation>): Record<string, WordExplanation> {
  return Object.fromEntries(
    Object.entries(explanations).map(([word, explanation]) => {
      const baseWord = getLinkedBaseWord(word, explanation, explanations);
      const baseExplanation = baseWord ? explanations[baseWord] : null;

      if (!baseWord || !baseExplanation) {
        return [word, explanation];
      }

      return [
        word,
        {
          ...explanation,
          baseWord,
          formNote: explanation.formNote ?? formatFormNote(explanation, baseWord, baseExplanation),
          partOfSpeech: formatLinkedPartOfSpeech(explanation, baseExplanation),
          shortDefinition: baseExplanation.shortDefinition,
          usage: explanation.usage ?? baseExplanation.usage,
          lemma: explanation.lemma ?? baseExplanation.lemma ?? baseWord.toLocaleLowerCase("fr-CH")
        }
      ];
    })
  );
}

function getLinkedBaseWord(
  word: string,
  explanation: WordExplanation,
  explanations: Record<string, WordExplanation>
): string | null {
  for (const candidate of [explanation.baseWord, getPluralBaseWord(explanation), explanation.lemma]) {
    const normalizedCandidate = normalizeLinkedBaseWord(candidate, word, explanations);

    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return null;
}

function normalizeLinkedBaseWord(
  candidate: string | undefined | null,
  word: string,
  explanations: Record<string, WordExplanation>
): string | null {
  if (!candidate) {
    return null;
  }

  const normalizedCandidate = normalizeWord(candidate);

  if (!normalizedCandidate || normalizedCandidate === word || !explanations[normalizedCandidate]) {
    return null;
  }

  return normalizedCandidate;
}

function getPluralBaseWord(explanation: WordExplanation): string | null {
  if (!hasPluralSignal(explanation)) {
    return null;
  }

  const pluralMatch = explanation.shortDefinition.match(/^Pluriel de ([\p{L}]+)\b/iu);

  return pluralMatch?.[1] ? normalizeWord(pluralMatch[1]) : null;
}

function formatFormNote(explanation: WordExplanation, baseWord: string, baseExplanation: WordExplanation): string {
  const partOfSpeech = explanation.partOfSpeech.toLocaleLowerCase("fr-CH");

  if (hasPluralSignal(explanation)) {
    return `Pluriel de ${baseWord}.`;
  }

  if (partOfSpeech.includes("féminin")) {
    return `Féminin de ${baseWord}.`;
  }

  if (partOfSpeech.includes("verbe") || partOfSpeech.includes("participe")) {
    return `Forme du verbe ${baseExplanation.lemma ?? baseWord.toLocaleLowerCase("fr-CH")}.`;
  }

  return `Forme de ${baseWord}.`;
}

function formatLinkedPartOfSpeech(explanation: WordExplanation, baseExplanation: WordExplanation): string {
  const partOfSpeech = explanation.partOfSpeech.toLocaleLowerCase("fr-CH");

  if (!hasPluralSignal(explanation) || partOfSpeech.includes("pluriel")) {
    return explanation.partOfSpeech;
  }

  const basePartOfSpeech = baseExplanation.partOfSpeech;

  if (basePartOfSpeech.toLocaleLowerCase("fr-CH").includes("pluriel")) {
    return basePartOfSpeech;
  }

  return `${basePartOfSpeech} pluriel`;
}

function hasPluralSignal(explanation: WordExplanation): boolean {
  return (
    explanation.partOfSpeech.toLocaleLowerCase("fr-CH").includes("pluriel") ||
    explanation.shortDefinition.toLocaleLowerCase("fr-CH").startsWith("pluriel de ")
  );
}

export function getWordExplanation(word: string): WordExplanation | null {
  return wordExplanations[normalizeWord(word)] ?? null;
}

export function getKnownWordExplanations(): WordExplanation[] {
  return Object.values(wordExplanations).sort((first, second) => first.word.localeCompare(second.word));
}

export function formatWordExplanationDefinition(explanation: WordExplanation): string {
  return [explanation.formNote, explanation.shortDefinition].filter(Boolean).join(" ");
}

export function searchWordExplanations(query: string): WordExplanation[] {
  const normalizedQuery = normalizeWord(query);
  const plainQuery = query.trim().toLocaleLowerCase("fr-CH");
  const explanations = getKnownWordExplanations();

  if (!normalizedQuery && !plainQuery) {
    return explanations;
  }

  return explanations
    .map((entry) => ({ entry, rank: getWordExplanationSearchRank(entry, normalizedQuery, plainQuery) }))
    .filter((result): result is { entry: WordExplanation; rank: number } => result.rank !== null)
    .sort((first, second) => first.rank - second.rank || first.entry.word.localeCompare(second.entry.word))
    .map((result) => result.entry);
}

function getWordExplanationSearchRank(
  entry: WordExplanation,
  normalizedQuery: string,
  plainQuery: string
): number | null {
  if (entry.word === normalizedQuery) {
    return 0;
  }

  if (entry.word.startsWith(normalizedQuery)) {
    return 1;
  }

  if (entry.lemma && normalizeWord(entry.lemma).startsWith(normalizedQuery)) {
    return 2;
  }

  if (normalizedQuery.length <= 2) {
    return null;
  }

  if (entry.word.includes(normalizedQuery)) {
    return 3;
  }

  const haystack = [
      entry.word,
      entry.baseWord,
      entry.formNote,
      entry.partOfSpeech,
      entry.shortDefinition,
      entry.usage,
      entry.lemma,
      ...entry.sources.map((source) => `${source.name} ${source.version ?? ""}`)
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLocaleLowerCase("fr-CH");

    const normalizedHaystack = normalizeWord(haystack);

  return haystack.includes(plainQuery) || normalizedHaystack.includes(normalizedQuery) ? 4 : null;
}
