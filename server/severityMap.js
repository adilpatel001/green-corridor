// The DB stores severity as a human-meaningful enum ("minor", "moderate",
// "blocked"). applyHazards() in the algorithm layer expects either a
// numeric cost multiplier or the literal string "blocked". This mapping
// is the one place that translation happens, so the two layers can each
// stay expressed in their own natural vocabulary.

export const SEVERITY_MULTIPLIERS = {
  minor: 1.5,
  moderate: 3,
  blocked: "blocked",
};