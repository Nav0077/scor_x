/**
 * ScorX Cricket Scoring Engine
 * Handles all cricket scoring logic: balls, overs, wickets, extras, partnerships, etc.
 */

export const DISMISSAL_TYPES = [
  { id: 'bowled',       label: 'Bowled',            needsFielder: false, bowledOut: true  },
  { id: 'caught',       label: 'Caught',             needsFielder: true,  bowledOut: true  },
  { id: 'lbw',          label: 'LBW',                needsFielder: false, bowledOut: true  },
  { id: 'run_out',      label: 'Run Out',            needsFielder: true,  bowledOut: false },
  { id: 'stumped',      label: 'Stumped',            needsFielder: true,  bowledOut: true  },
  { id: 'hit_wicket',   label: 'Hit Wicket',         needsFielder: false, bowledOut: true  },
  { id: 'caught_behind',label: 'Caught Behind',      needsFielder: true,  bowledOut: true  },
  { id: 'caught_bowled',label: 'Caught & Bowled',    needsFielder: false, bowledOut: true  },
  { id: 'retired_hurt', label: 'Retired Hurt',       needsFielder: false, bowledOut: false },
  { id: 'obstructing',  label: 'Obstructing Field',  needsFielder: false, bowledOut: false },
  { id: 'timed_out',    label: 'Timed Out',          needsFielder: false, bowledOut: false },
];

export const EXTRA_TYPES = {
  WIDE:    'wide',
  NO_BALL: 'noball',
  BYE:     'bye',
  LEG_BYE: 'legbye',
  PENALTY: 'penalty',
};

/**
 * Format overs: 1.3 means 1 completed over, 3 balls into the next
 * @param {number} legalBalls
 */
export function formatOvers(legalBalls) {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return parseFloat(`${overs}.${balls}`);
}

/**
 * Convert overs decimal (e.g. 3.4) to total legal balls
 */
export function oversToLegalBalls(overs) {
  const o = Math.floor(overs);
  const b = Math.round((overs - o) * 10);
  return o * 6 + b;
}

export class ScoringEngine {
  constructor({ maxOvers, maxWickets = 10 }) {
    this.maxOvers = maxOvers;
    this.maxWickets = maxWickets;

    // Ball history for undo
    this._history = [];

    // Innings data
    this.innings = {
      totalScore: 0,
      totalWickets: 0,
      totalExtras: 0,
      extrasWides: 0,
      extrasNoballs: 0,
      extrasByes: 0,
      extrasLegbyes: 0,
      legalBalls: 0,      // actual legal deliveries
      totalDeliveries: 0, // including wides/no-balls
    };

    // Current over buffer (legal balls only)
    this.currentOverBalls = [];  // array of ball result strings for display
    this.currentOverRuns = 0;    // runs in current over (for maiden calculation)

    // Completed overs
    this.completedOvers = []; // array of { runs, balls[], bowlerId }

    // Batsmen
    this.striker = null;
    this.nonStriker = null;
    this.battingScorecard = {}; // playerId → { runs, balls, fours, sixes, isOut, ... }

    // Bowler
    this.currentBowler = null;
    this.previousBowler = null;
    this.bowlingScorecard = {}; // playerId → { overs, maidens, runs, wickets, wides, noballs, dots }

    // Partnerships
    this.partnerships = [];           // completed partnerships
    this.currentPartnership = null;   // { batsman1Id, batsman2Id, runs, balls }

    // Fall of wickets
    this.fallOfWickets = [];
  }

  // ──────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────

  initBatsman(playerId, playerName, position) {
    if (!this.battingScorecard[playerId]) {
      this.battingScorecard[playerId] = {
        id: playerId, name: playerName,
        runs: 0, balls: 0, fours: 0, sixes: 0,
        isStriker: false, isNonStriker: false,
        isOut: false, dismissalType: null, dismissedBy: null,
        fielderId: null, dismissalText: '',
        battingPosition: position,
      };
    }
  }

  setStriker(playerId) {
    if (this.striker) {
      this.battingScorecard[this.striker].isStriker = false;
      this.battingScorecard[this.striker].isNonStriker = true;
    }
    this.striker = playerId;
    if (this.battingScorecard[playerId]) {
      this.battingScorecard[playerId].isStriker = true;
      this.battingScorecard[playerId].isNonStriker = false;
    }
  }

  setNonStriker(playerId) {
    if (this.nonStriker && this.battingScorecard[this.nonStriker]) {
      this.battingScorecard[this.nonStriker].isNonStriker = false;
    }
    this.nonStriker = playerId;
    if (this.battingScorecard[playerId]) {
      this.battingScorecard[playerId].isNonStriker = true;
      this.battingScorecard[playerId].isStriker = false;
    }
  }

  initBowler(playerId, playerName) {
    if (!this.bowlingScorecard[playerId]) {
      this.bowlingScorecard[playerId] = {
        id: playerId, name: playerName,
        legalBalls: 0, runs: 0, wickets: 0,
        wides: 0, noballs: 0, dots: 0,
        maidens: 0, fours: 0, sixes: 0,
      };
    }
    this.previousBowler = this.currentBowler;
    this.currentBowler = playerId;
    this.bowlingScorecard[playerId].isCurrent = true;
    if (this.previousBowler) {
      this.bowlingScorecard[this.previousBowler].isCurrent = false;
    }
  }

  initPartnership(b1Id, b2Id) {
    this.currentPartnership = {
      batsman1Id: b1Id, batsman1Runs: 0, batsman1Balls: 0,
      batsman2Id: b2Id, batsman2Runs: 0, batsman2Balls: 0,
      totalRuns: 0, totalBalls: 0, wicketNumber: this.innings.totalWickets + 1,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // CORE: RECORD A BALL
  // ──────────────────────────────────────────────────────────────────

  /**
   * Record a delivery
   * @param {object} opts
   * @param {number} opts.runs           - runs by batsman (0-6)
   * @param {string} opts.extraType      - 'wide'|'noball'|'bye'|'legbye'|null
   * @param {number} opts.extraRuns      - additional extra runs (e.g., 4 for wide+4)
   * @param {boolean} opts.isWicket      - did a wicket fall?
   * @param {string} opts.wicketType     - dismissal type id
   * @param {string} opts.dismissedId    - player id who got out (can be non-striker for run-outs)
   * @param {string} opts.fielderId      - catcher/fielder id
   * @param {number} opts.shotDirection  - angle for wagon wheel
   * @param {number} opts.shotDistance
   * @param {number} opts.wagonZone
   * @returns {object} result with { isLegalDelivery, overComplete, inningsEnded, result }
   */
  recordBall({
    runs = 0,
    extraType = null,
    extraRuns = 0,
    isWicket = false,
    wicketType = null,
    dismissedId = null,
    fielderId = null,
    shotDirection = null,
    shotDistance = null,
    wagonZone = null,
  }) {
    // ── Save state for undo ──
    this._history.push(this._snapshot());

    const isWide   = extraType === EXTRA_TYPES.WIDE;
    const isNoball = extraType === EXTRA_TYPES.NO_BALL;
    const isBye    = extraType === EXTRA_TYPES.BYE;
    const isLegbye = extraType === EXTRA_TYPES.LEG_BYE;

    // Legal delivery: byes and leg-byes ARE legal, wides and no-balls are NOT
    const isLegalDelivery = !isWide && !isNoball;

    // Calculate totals
    let batsmanRuns  = (isWide || isBye || isLegbye) ? 0 : runs; // batsman doesn't get credit for wide/bye/legbye
    let extraAmount  = 0;

    if (isWide)   { extraAmount = 1 + extraRuns; batsmanRuns = 0; }
    if (isNoball) { extraAmount = 1; } // 1 extra always, batsman gets their runs
    if (isBye)    { extraAmount = runs + extraRuns; batsmanRuns = 0; }
    if (isLegbye) { extraAmount = runs + extraRuns; batsmanRuns = 0; }

    const totalRunsThisBall = batsmanRuns + extraAmount;

    // ── Update innings totals ──
    this.innings.totalScore += totalRunsThisBall;
    this.innings.totalExtras += extraAmount;
    this.innings.totalDeliveries++;
    if (isLegalDelivery) this.innings.legalBalls++;
    if (isWide)   this.innings.extrasWides   += extraAmount;
    if (isNoball) this.innings.extrasNoballs += 1;
    if (isBye)    this.innings.extrasByes    += extraAmount;
    if (isLegbye) this.innings.extrasLegbyes += extraAmount;

    // ── Update batsman scorecard ──
    const batter = this.battingScorecard[this.striker];
    if (batter && !isWide) {
      batter.balls++;
      batter.runs += batsmanRuns;
      if (batsmanRuns === 4) batter.fours++;
      if (batsmanRuns === 6) batter.sixes++;
    }

    // ── Partnership ──
    if (this.currentPartnership) {
      this.currentPartnership.totalRuns += totalRunsThisBall;
      if (isLegalDelivery) this.currentPartnership.totalBalls++;
      const isStrikerPartner = this.currentPartnership.batsman1Id === this.striker;
      if (isStrikerPartner) {
        this.currentPartnership.batsman1Runs += batsmanRuns;
        if (isLegalDelivery) this.currentPartnership.batsman1Balls++;
      } else {
        this.currentPartnership.batsman2Runs += batsmanRuns;
        if (isLegalDelivery) this.currentPartnership.batsman2Balls++;
      }
    }

    // ── Bowler scorecard ──
    const bowler = this.bowlingScorecard[this.currentBowler];
    if (bowler) {
      // Wide and no-ball extras are charged to bowler
      if (isWide)   { bowler.runs += extraAmount; bowler.wides++; }
      if (isNoball) { bowler.runs += 1; bowler.noballs++; }
      if (!isWide && !isNoball) {
        bowler.runs   += batsmanRuns;
        if (isLegalDelivery) bowler.legalBalls++;
        if (batsmanRuns === 0 && !extraAmount) bowler.dots++;
        if (batsmanRuns === 4) bowler.fours++;
        if (batsmanRuns === 6) bowler.sixes++;
      }
    }

    // ── Current over display ──
    this.currentOverRuns += totalRunsThisBall;
    if (isLegalDelivery) {
      const displayStr = this._ballDisplayStr({ batsmanRuns, isWicket, extraType, extraRuns, runs });
      this.currentOverBalls.push(displayStr);
    } else if (isWide) {
      this.currentOverBalls.push('Wd' + (extraRuns > 0 ? '+' + extraRuns : ''));
    } else if (isNoball) {
      this.currentOverBalls.push('Nb' + (batsmanRuns > 0 ? '+' + batsmanRuns : ''));
    }

    // ── Wicket ──
    let wicketResult = null;
    if (isWicket) {
      // On no-ball: LBW, caught, bowled are NOT out. Run-out is allowed.
      const isNullifiedByNoBall = isNoball && ['bowled','caught','lbw','caught_behind','caught_bowled','stumped'].includes(wicketType);
      if (!isNullifiedByNoBall) {
        wicketResult = this._processWicket({ wicketType, dismissedId, fielderId, bowler });
      }
    }

    // ── Strike rotation ──
    // Swap on odd runs (1,3,5) from bat; also on no-ball + 1 run from bat
    const shouldSwap = (batsmanRuns % 2 === 1) && !isWide;
    if (shouldSwap) this._swapStrike();

    // ── End of over ──
    let overComplete = false;
    if (isLegalDelivery && this.innings.legalBalls % 6 === 0) {
      overComplete = true;
      this._endOver();
    }

    // ── Check innings end ──
    const inningsEnded = this._checkInningsEnd();

    return {
      isLegalDelivery,
      totalRunsThisBall,
      batsmanRuns,
      extraAmount,
      overComplete,
      inningsEnded,
      wicketResult,
      oversDisplay: formatOvers(this.innings.legalBalls),
    };
  }

  _processWicket({ wicketType, dismissedId, fielderId, bowler }) {
    this.innings.totalWickets++;

    // Which batsman is out?
    const outPlayerId = dismissedId || this.striker;
    const dismissed = this.battingScorecard[outPlayerId];

    if (dismissed) {
      dismissed.isOut = true;
      dismissed.dismissalType = wicketType;
      dismissed.dismissedBy = ['bowled','caught','lbw','caught_behind','caught_bowled','stumped','hit_wicket'].includes(wicketType)
        ? this.currentBowler : null;
      dismissed.fielderId = fielderId;
      dismissed.dismissalText = this._buildDismissalText(wicketType, dismissed.dismissedBy, fielderId);
    }

    // Credit bowler with wicket (not for run-outs and retired)
    if (bowler && !['run_out','retired_hurt','obstructing'].includes(wicketType)) {
      bowler.wickets++;
    }

    // Fall of wickets
    this.fallOfWickets.push({
      wicketNumber: this.innings.totalWickets,
      score: this.innings.totalScore,
      overs: formatOvers(this.innings.legalBalls),
      playerId: outPlayerId,
      playerName: dismissed?.name || '',
    });

    // Close partnership
    if (this.currentPartnership) {
      this.partnerships.push({ ...this.currentPartnership });
      this.currentPartnership = null;
    }

    // If striker is out, they need replacing
    if (outPlayerId === this.striker) {
      this.striker = null;
    }
    if (outPlayerId === this.nonStriker) {
      this.nonStriker = null;
    }

    return {
      outPlayerId,
      dismissalText: dismissed?.dismissalText,
      wicketsNow: this.innings.totalWickets,
    };
  }

  _buildDismissalText(wicketType, bowlerId, fielderId) {
    const bowler = this.bowlingScorecard[bowlerId];
    const bName  = bowler?.name || 'bowler';
    switch (wicketType) {
      case 'bowled': return `b ${bName}`;
      case 'caught': return fielderId ? `c fielder b ${bName}` : `c & b ${bName}`;
      case 'caught_bowled': return `c & b ${bName}`;
      case 'caught_behind': return `c †wk b ${bName}`;
      case 'lbw': return `lbw b ${bName}`;
      case 'run_out': return 'run out';
      case 'stumped': return `st †wk b ${bName}`;
      case 'hit_wicket': return `hit wicket b ${bName}`;
      case 'retired_hurt': return 'retired hurt';
      default: return wicketType;
    }
  }

  _ballDisplayStr({ batsmanRuns, isWicket, extraType, extraRuns, runs }) {
    if (isWicket) return 'W';
    if (extraType === EXTRA_TYPES.BYE) return batsmanRuns === 0 && extraRuns === 0 && runs > 0 ? `${runs}B` : `${runs + extraRuns}B`;
    if (extraType === EXTRA_TYPES.LEG_BYE) return `${runs + extraRuns}Lb`;
    if (batsmanRuns === 4) return '4';
    if (batsmanRuns === 6) return '6';
    if (batsmanRuns === 0) return '•';
    return String(batsmanRuns);
  }

  _endOver() {
    const bowler = this.bowlingScorecard[this.currentBowler];
    const overs = Math.floor(this.innings.legalBalls / 6);

    this.completedOvers.push({
      overNumber: overs - 1,
      runs: this.currentOverRuns,
      balls: [...this.currentOverBalls],
      bowlerId: this.currentBowler,
      isMaiden: this.currentOverRuns === 0,
    });

    // Maiden over
    if (this.currentOverRuns === 0 && bowler) {
      bowler.maidens++;
    }

    // Reset current over
    this.currentOverBalls = [];
    this.currentOverRuns  = 0;

    // Swap strike at end of over
    this._swapStrike();
  }

  _swapStrike() {
    [this.striker, this.nonStriker] = [this.nonStriker, this.striker];
    if (this.striker   && this.battingScorecard[this.striker])   { this.battingScorecard[this.striker].isStriker = true; this.battingScorecard[this.striker].isNonStriker = false; }
    if (this.nonStriker && this.battingScorecard[this.nonStriker]) { this.battingScorecard[this.nonStriker].isStriker = false; this.battingScorecard[this.nonStriker].isNonStriker = true; }
  }

  manualSwapStrike() {
    this._swapStrike();
  }

  _checkInningsEnd() {
    const allOversComplete = this.innings.legalBalls >= this.maxOvers * 6;
    const allOut           = this.innings.totalWickets >= this.maxWickets;
    return allOversComplete || allOut;
  }

  checkTargetAchieved(target) {
    return target !== null && this.innings.totalScore > target;
  }

  // ──────────────────────────────────────────────────────────────────
  // UNDO
  // ──────────────────────────────────────────────────────────────────

  canUndo() { return this._history.length > 0; }

  undo() {
    if (!this._history.length) return null;
    const snapshot = this._history.pop();
    this._restore(snapshot);
    return snapshot;
  }

  _snapshot() {
    return JSON.parse(JSON.stringify({
      innings: { ...this.innings },
      currentOverBalls: [...this.currentOverBalls],
      currentOverRuns: this.currentOverRuns,
      completedOvers: [...this.completedOvers],
      striker: this.striker,
      nonStriker: this.nonStriker,
      battingScorecard: { ...this.battingScorecard },
      bowlingScorecard: { ...this.bowlingScorecard },
      currentBowler: this.currentBowler,
      previousBowler: this.previousBowler,
      partnerships: [...this.partnerships],
      currentPartnership: this.currentPartnership ? { ...this.currentPartnership } : null,
      fallOfWickets: [...this.fallOfWickets],
    }));
  }

  _restore(snap) {
    this.innings           = snap.innings;
    this.currentOverBalls  = snap.currentOverBalls;
    this.currentOverRuns   = snap.currentOverRuns;
    this.completedOvers    = snap.completedOvers;
    this.striker           = snap.striker;
    this.nonStriker        = snap.nonStriker;
    this.battingScorecard  = snap.battingScorecard;
    this.bowlingScorecard  = snap.bowlingScorecard;
    this.currentBowler     = snap.currentBowler;
    this.previousBowler    = snap.previousBowler;
    this.partnerships      = snap.partnerships;
    this.currentPartnership= snap.currentPartnership;
    this.fallOfWickets     = snap.fallOfWickets;
  }

  // ──────────────────────────────────────────────────────────────────
  // GETTERS / UTILITIES
  // ──────────────────────────────────────────────────────────────────

  getOversDisplay() {
    return formatOvers(this.innings.legalBalls);
  }

  getCurrentRunRate() {
    if (this.innings.legalBalls === 0) return 0;
    return ((this.innings.totalScore / this.innings.legalBalls) * 6).toFixed(2);
  }

  getRequiredRate(target) {
    if (!target) return null;
    const runsNeeded = target - this.innings.totalScore;
    const ballsLeft = this.maxOvers * 6 - this.innings.legalBalls;
    if (runsNeeded <= 0) return '0.00';
    if (ballsLeft <= 0) return '∞';
    return ((runsNeeded / ballsLeft) * 6).toFixed(2);
  }

  getRunsNeeded(target) {
    if (!target) return null;
    return Math.max(0, target - this.innings.totalScore);
  }

  getBallsLeft() {
    return Math.max(0, this.maxOvers * 6 - this.innings.legalBalls);
  }

  getCurrentOver() {
    return this.currentOverBalls;
  }

  getBowlerBoard(playerId) {
    const b = this.bowlingScorecard[playerId];
    if (!b) return null;
    return {
      ...b,
      overs: formatOvers(b.legalBalls),
      economy: b.legalBalls === 0 ? '0.00' : ((b.runs / b.legalBalls) * 6).toFixed(2),
    };
  }

  getBatsmanBoard(playerId) {
    const b = this.battingScorecard[playerId];
    if (!b) return null;
    return {
      ...b,
      strikeRate: b.balls === 0 ? '0.00' : ((b.runs / b.balls) * 100).toFixed(1),
    };
  }

  getMatchResult({ team1Name, team2Name, battingFirst, target }) {
    const isInnings2 = target !== null;
    const score = this.innings.totalScore;
    const wickets = this.innings.totalWickets;

    if (isInnings2) {
      if (score > target) {
        const wicketsRemaining = this.maxWickets - wickets;
        return `${battingFirst === 2 ? team2Name : team1Name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
      } else if (score < target && this._checkInningsEnd()) {
        const runDiff = target - 1 - score;
        return `${battingFirst === 1 ? team1Name : team2Name} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
      } else if (score === target && this._checkInningsEnd()) {
        return 'Match Tied';
      }
    } else {
      // First innings completed
      return null;
    }
    return null;
  }

  getScorecardSummary() {
    const batting = Object.values(this.battingScorecard);
    const bowling = Object.values(this.bowlingScorecard);
    return {
      batting,
      bowling: bowling.map((b) => ({
        ...b,
        overs: formatOvers(b.legalBalls),
        economy: b.legalBalls === 0 ? '-' : ((b.runs / b.legalBalls) * 6).toFixed(2),
      })),
      partnerships: this.partnerships,
      currentPartnership: this.currentPartnership,
      fallOfWickets: this.fallOfWickets,
      totalScore: this.innings.totalScore,
      totalWickets: this.innings.totalWickets,
      totalOvers: formatOvers(this.innings.legalBalls),
      extras: {
        total: this.innings.totalExtras,
        wides: this.innings.extrasWides,
        noballs: this.innings.extrasNoballs,
        byes: this.innings.extrasByes,
        legbyes: this.innings.extrasLegbyes,
      },
      currentOverBalls: this.currentOverBalls,
      completedOvers: this.completedOvers,
    };
  }

  // Auto-commentary
  generateCommentary({ batsmanName, bowlerName, runs, extraType, isWicket, wicketType, overNumber, ballNumber }) {
    const prefix = `${overNumber}.${ballNumber} ${bowlerName} to ${batsmanName},`;
    if (isWicket) return `${prefix} OUT! ${wicketType.replace('_', ' ').toUpperCase()}. ${batsmanName} has to go.`;
    if (extraType === 'wide') return `${prefix} Wide! ${runs > 0 ? `${runs} runs off the wide.` : ''}`;
    if (extraType === 'noball') return `${prefix} No Ball! Free hit coming up.`;
    if (runs === 6) return `${prefix} SIX! Massive hit! ${batsmanName} sends it into the stands!`;
    if (runs === 4) return `${prefix} FOUR! ${['Beautifully driven!', 'Cracking shot!', 'Whipped off the pads!'][Math.floor(Math.random()*3)]}`;
    if (runs === 0) return `${prefix} Dot ball. ${['Defended back.', 'Left alone.', 'Watchful defensive push.'][Math.floor(Math.random()*3)]}`;
    return `${prefix} ${runs} run${runs !== 1 ? 's' : ''}.`;
  }
}
