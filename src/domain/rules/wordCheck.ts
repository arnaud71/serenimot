import { DICTIONARY_LABEL, isWordAccepted, normalizeWord } from "./dictionary";
import { getWordExplanation, type WordExplanation } from "./wordExplanations";

export type WordCheckResult = {
  detail: string;
  explanation?: WordExplanation;
  label: string;
  normalizedWord: string;
  status: "empty" | "accepted" | "rejected";
};

export function getWordCheckResult(query: string): WordCheckResult {
  const normalizedWord = normalizeWord(query);

  if (!normalizedWord) {
    return {
      status: "empty",
      label: "En attente",
      normalizedWord: "",
      detail: "Tapez un mot pour le tester."
    };
  }

  if (isWordAccepted(normalizedWord)) {
    const explanation = getWordExplanation(normalizedWord) ?? undefined;

    return {
      status: "accepted",
      label: `${normalizedWord} est accepté`,
      normalizedWord,
      detail: explanation
        ? `Ce mot est reconnu dans ${DICTIONARY_LABEL} et dispose d'une fiche explicative.`
        : `Ce mot est reconnu dans ${DICTIONARY_LABEL}. Sa fiche explicative n'est pas encore disponible.`,
      explanation
    };
  }

  return {
    status: "rejected",
    label: `${normalizedWord} n'est pas reconnu`,
    normalizedWord,
    detail: "Vous pouvez essayer une autre forme ou consulter les règles du lexique."
  };
}
