import { describe, expect, it } from "vitest";
import { getGameMessageSoundKindForTest } from "../../src/features/audio/gameSounds";

describe("sons de partie", () => {
  it("associe une mélodie positive à la victoire du joueur", () => {
    expect(
      getGameMessageSoundKindForTest({
        tone: "success",
        text: "La partie est terminée. Vous gagnez. Score final : vous 42, robot 39."
      })
    ).toBe("win");
  });

  it("associe une mélodie négative à la victoire du robot", () => {
    expect(
      getGameMessageSoundKindForTest({
        tone: "notice",
        text: "La partie est terminée. Le robot gagne. Score final : vous 39, robot 42."
      })
    ).toBe("lose");
  });

  it("associe un son neutre à l'égalité", () => {
    expect(
      getGameMessageSoundKindForTest({
        tone: "notice",
        text: "La partie est terminée sur une égalité. Score final : vous 42, robot 42."
      })
    ).toBe("draw");
  });
});
