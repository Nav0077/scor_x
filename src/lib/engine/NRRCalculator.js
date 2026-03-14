/**
 * Net Run Rate Calculator
 * NRR = (Total runs scored / Total overs faced) - (Total runs conceded / Total overs bowled)
 * When a team is all-out, use max overs (not actual overs)
 */

/**
 * @param {object} params
 * @param {number} params.runsFor       - total runs scored by the team
 * @param {number} params.oversFor      - actual overs faced (decimal, e.g., 19.3)
 * @param {boolean} params.allOut       - if team was all-out (use max overs)
 * @param {number} params.maxOvers      - max overs per match
 * @param {number} params.runsAgainst   - total runs conceded
 * @param {number} params.oversAgainst  - actual overs bowled against opponents
 * @param {boolean} params.opponentAllOut
 */
export function calculateNRR({
  runsFor, oversFor, allOut = false, maxOvers = 20,
  runsAgainst, oversAgainst, opponentAllOut = false,
}) {
  // If a team is all-out, treat their overs faced as the full match overs
  const effectiveOversFor     = allOut        ? maxOvers : oversDecimalToFloat(oversFor);
  const effectiveOversAgainst = opponentAllOut ? maxOvers : oversDecimalToFloat(oversAgainst);

  if (effectiveOversFor <= 0 || effectiveOversAgainst <= 0) return 0;

  const rrFor     = runsFor     / effectiveOversFor;
  const rrAgainst = runsAgainst / effectiveOversAgainst;

  return parseFloat((rrFor - rrAgainst).toFixed(3));
}

/**
 * Convert overs decimal (e.g. 3.4) to actual float (3.66…)
 */
export function oversDecimalToFloat(overs) {
  const o = Math.floor(overs);
  const b = Math.round((overs - o) * 10);
  return o + b / 6;
}

/**
 * Update tournament points table entry for a completed match
 */
export function getMatchPoints({ result }) {
  switch (result) {
    case 'won':      return { points: 2, won: 1, lost: 0, tied: 0 };
    case 'lost':     return { points: 0, won: 0, lost: 1, tied: 0 };
    case 'tied':     return { points: 1, won: 0, lost: 0, tied: 1 };
    case 'no_result':return { points: 1, won: 0, lost: 0, tied: 0, nr: 1 };
    default:         return { points: 0, won: 0, lost: 0, tied: 0 };
  }
}
