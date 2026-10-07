import { describe, expect, it } from "vitest";

import { submissionSchema, underwritingSchema } from "@/lib/api/schemas";
import { gradeDeviation } from "@/lib/scoring";
import { SEEDED_PROPERTY_IDS, TEAMMATES, YOU, demoAttempts } from "@/lib/team/demo-team";
import {
  buildYourAttempts,
  propertyLeaderboard,
  rankTeam,
  skillLevel,
  summarizeTrainee,
} from "@/lib/team/stats";
import type { TeamAttempt } from "@/lib/team/types";

import reference from "../../e2e/fixtures/api/reference-underwriting.json";
import submissions from "../../e2e/fixtures/api/submissions.json";
import saved from "../../e2e/fixtures/api/underwriting-saved.json";

const MARKETS: Record<string, string> = {
  "41234567": "Smoky & Blue Ridge Mountains",
  "52345678": "Broken Bow",
  "63456789": "Central Florida",
  "74567890": "Smoky & Blue Ridge Mountains",
  "85678901": "Texas Gulf Coast",
  "96789012": "Smoky & Blue Ridge Mountains",
};
const marketOf = (zpid: string) => MARKETS[zpid] ?? "Unknown market";

function attempt(partial: Partial<TeamAttempt> & Pick<TeamAttempt, "zpid" | "submittedAt">): TeamAttempt {
  const grade = gradeDeviation(partial.midDeviation ?? 0);
  return {
    id: `${partial.zpid}-${partial.submittedAt}`,
    traineeId: "t",
    attemptNumber: 1,
    midDeviation: 0,
    setupDeviation: null,
    opexDeviation: null,
    source: "demo",
    ...grade,
    ...partial,
  };
}

const trainee = { id: "t", name: "Test Trainee", initials: "TT", hue: 0 };

describe("grading", () => {
  it("matches the API bands, limits inclusive", () => {
    expect(gradeDeviation(0.1)).toEqual({ rating: "best", score: 100 });
    expect(gradeDeviation(-0.1)).toEqual({ rating: "best", score: 100 });
    expect(gradeDeviation(0.10001)).toEqual({ rating: "medium", score: 70 });
    expect(gradeDeviation(0.25)).toEqual({ rating: "medium", score: 70 });
    expect(gradeDeviation(-0.2501)).toEqual({ rating: "low", score: 40 });
    expect(gradeDeviation(null)).toEqual({ rating: "low", score: 40 });
  });

  it("uses the same bands for skill levels", () => {
    expect(skillLevel(0.08)).toBe("good");
    expect(skillLevel(0.2)).toBe("ok");
    expect(skillLevel(0.35)).toBe("needs-work");
    expect(skillLevel(null)).toBeNull();
  });
});

describe("summarizeTrainee", () => {
  it("averages the latest attempt per property and keeps first tries separately", () => {
    const summary = summarizeTrainee(
      trainee,
      [
        attempt({ zpid: "41234567", submittedAt: "2026-09-01", midDeviation: 0.4 }),
        attempt({ zpid: "41234567", submittedAt: "2026-09-02", midDeviation: 0.02 }),
        attempt({ zpid: "52345678", submittedAt: "2026-09-03", midDeviation: 0.2 }),
      ],
      marketOf,
    );
    expect(summary.casesCompleted).toBe(2);
    expect(summary.retakes).toBe(1);
    expect(summary.averageScore).toBe(85); // latest: 100 and 70
    expect(summary.firstTryAverage).toBe(55); // first: 40 and 70
    expect(summary.bestRated).toBe(1);
    expect(summary.skills.revenue.miss).toBeCloseTo(0.11, 5);
  });

  it("returns empty results for a trainee with no attempts", () => {
    const summary = summarizeTrainee(trainee, [], marketOf);
    expect(summary.averageScore).toBeNull();
    expect(summary.skills.setup.level).toBeNull();
    expect(summary.notes).toEqual([]);
  });
});

describe("demo team", () => {
  const attempts = demoAttempts();
  const summaries = Object.fromEntries(
    TEAMMATES.map((t) => [t.id, summarizeTrainee(t, attempts, marketOf)]),
  );
  const noteKinds = (id: string) => summaries[id].notes.map((n) => n.kind);

  it("is deterministic and only uses seeded properties", () => {
    expect(demoAttempts()).toEqual(attempts);
    for (const a of attempts) {
      expect(SEEDED_PROPERTY_IDS).toContain(a.zpid);
      expect(a.submittedAt).toMatch(/^2026-09-\d{2}T15:00:00.000Z$/);
    }
    expect(new Set(attempts.map((a) => a.id)).size).toBe(attempts.length);
  });

  it("gives each teammate the coaching pattern they illustrate", () => {
    expect(noteKinds("priya-shah")).toEqual([]);
    expect(noteKinds("marcus-lee")).toEqual(["setup"]);
    expect(noteKinds("elena-ruiz")).toEqual(["market", "market"]);
    expect(summaries["elena-ruiz"].notes.map((n) => n.title)).toEqual([
      "Central Florida market",
      "Texas Gulf Coast market",
    ]);
    expect(noteKinds("tom-becker")).toEqual(["revenue"]);
    expect(summaries["tom-becker"].notes[0].detail).toContain("usually too high");
    expect(noteKinds("aisha-khan")).toEqual(["opex"]);
    expect(noteKinds("daniel-okafor")).toEqual(["retakes"]);
    expect(summaries["daniel-okafor"].firstTryAverage).toBe(40);
    expect(summaries["daniel-okafor"].averageScore).toBe(100);
  });

  it("ranks by average, then cases completed", () => {
    const ranked = rankTeam(Object.values(summaries));
    expect(ranked.map((r) => [r.trainee.id, Math.round(r.averageScore ?? 0)])).toEqual([
      ["priya-shah", 100],
      ["daniel-okafor", 100],
      ["marcus-lee", 95],
      ["aisha-khan", 94],
      ["elena-ruiz", 80],
      ["tom-becker", 50],
    ]);
  });
});

describe("your attempts from the API", () => {
  const parsedSubmissions = submissions.map((s) => submissionSchema.parse(s));
  const underwritings = new Map(
    [saved, reference].map((u) => {
      const parsed = underwritingSchema.parse(u);
      return [parsed.id, parsed] as const;
    }),
  );

  it("derives every skill from your underwriting and the analyst's", () => {
    const [mine] = buildYourAttempts(parsedSubmissions, underwritings);
    expect(mine.traineeId).toBe(YOU.id);
    expect(mine.submissionId).toBe(1);
    expect(mine.midDeviation).toBeCloseTo(0.04, 5); // $130,000 vs $125,000
    expect(mine.setupDeviation).toBeCloseTo((57_000 - 66_000) / 66_000, 5);
    expect(mine.opexDeviation).toBeCloseTo((770 - 1_850) / 1_850, 5);
    expect(mine.score).toBe(100);
  });

  it("leaves setup and running costs empty until the underwritings load", () => {
    const [mine] = buildYourAttempts(parsedSubmissions);
    expect(mine.setupDeviation).toBeNull();
    expect(mine.opexDeviation).toBeNull();
  });

  it("places you on the team and on the property leaderboard", () => {
    const all = [...demoAttempts(), ...buildYourAttempts(parsedSubmissions, underwritings)];
    const team = [YOU, ...TEAMMATES].map((t) => summarizeTrainee(t, all, marketOf));
    const ranked = rankTeam(team);
    expect(ranked.find((r) => r.trainee.isYou)?.rank).toBe(3); // 100 on 1 case, behind 100 on 6 and on 4
    expect(team[0].notes.map((n) => n.kind)).toEqual(["opex"]); // your running costs are 58% low

    const skiView = propertyLeaderboard(team, "41234567");
    expect(skiView.map((s) => s.trainee.id)).toEqual([
      "daniel-okafor", // +1%
      "aisha-khan", // −3%
      "you", // +4%
      "priya-shah", // +4.5%
      "elena-ruiz", // +5%
      "marcus-lee", // +7%
      "tom-becker", // +22%
    ]);
  });
});
