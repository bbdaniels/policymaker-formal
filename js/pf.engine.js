/**
 * pf.engine.js -- Passage probability engine.
 *
 * Computes per-node and path-level passage probabilities
 * using PM5 player data + institutional node configuration.
 */

var PF = PF || {};

PF.Engine = (function () {
  "use strict";

  var M = function () { return PF.Model; };

  /**
   * Convert PM5 position rating (1-7) to a [-1, +1] support score.
   *   1 (high support)    → +1.0
   *   4 (non-mobilized)   →  0.0
   *   7 (high opposition) → -1.0
   */
  var positionToScore = function (posRating) {
    if (!posRating || posRating < 1 || posRating > 7) return 0;
    return (4 - posRating) / 3;
  };

  /**
   * Convert PM5 power rating (1-7) to a [0, 1] influence weight.
   *   1 → ~0.14,  4 → ~0.57,  7 → 1.0
   */
  var powerToWeight = function (powRating) {
    if (!powRating || powRating < 1) return 0;
    return Math.min(powRating / 7, 1);
  };

  /**
   * Compute passage probability for a single node.
   *
   * Three failure modes checked in order:
   *   1. Gate failure  -- agenda-setter blocks
   *   2. Veto failure  -- veto holder exercises veto
   *   3. Vote failure  -- insufficient support under decision rule
   *
   * Returns { prob, detail, failure_mode }
   */
  var nodePassage = function (nodeId) {
    var node = M().getNode(nodeId);
    if (!node) return { prob: 0, detail: "Node not found", failure_mode: "missing" };

    var nps = M().getNodePlayers(nodeId);
    if (nps.length === 0) {
      return { prob: null, detail: "No players assigned", failure_mode: "unmapped" };
    }

    // ── 1. Gate check ───────────────────────────────────
    if (node.gate_control_player_id) {
      var gatePlayer = M().getPlayer(node.gate_control_player_id);
      if (gatePlayer) {
        var gateScore = positionToScore(gatePlayer.Position_rating);
        if (gateScore < -0.1) {
          // Gate-controller opposes — low probability the item even reaches a vote
          // Model as: P(gate) = (1 + gateScore) / 2, clamped to [0.05, 0.5]
          var pGate = Math.max(0.05, Math.min(0.5, (1 + gateScore) / 2));
          return {
            prob: pGate,
            detail: "Gate-controller " + (gatePlayer.Player_name || gatePlayer.Player_abbrev) +
                    " opposes (score " + gateScore.toFixed(2) + ")",
            failure_mode: "gate"
          };
        }
      }
    }

    // ── 2. Single-actor decision ────────────────────────
    if (node.decision_rule === "single_actor") {
      var actor = nps[0];
      if (!actor.player) return { prob: 0.5, detail: "Player data missing", failure_mode: "data" };
      var s = positionToScore(actor.player.Position_rating);
      // P(sign) = (1 + s) / 2
      var pSingle = Math.max(0, Math.min(1, (1 + s) / 2));
      return {
        prob: pSingle,
        detail: (actor.player.Player_name || "Actor") + " score " + s.toFixed(2),
        failure_mode: pSingle < 0.5 ? "veto" : null
      };
    }

    // ── 3. Voting body ──────────────────────────────────
    var totalWeight = 0;
    var supportWeight = 0;
    var vetoHolders = [];

    nps.forEach(function (np) {
      if (!np.player) return;
      var score = positionToScore(np.player.Position_rating);
      var power = powerToWeight(np.player.Power_rating || 4);
      var w = (np.assignment.vote_weight || 1) * power;

      totalWeight += w;
      // "Support" = score > 0; weighted by how strongly they support
      if (score > 0) {
        supportWeight += w * score;
      } else if (score < 0) {
        supportWeight += w * score; // subtracts
      }
      // else: non-mobilized contributes 0

      if (np.assignment.role === "veto_holder") {
        vetoHolders.push({ player: np.player, score: score });
      }
    });

    // Normalize to [0,1]: supportWeight ∈ [-totalWeight, +totalWeight]
    var supportFraction = totalWeight > 0 ? (supportWeight / totalWeight + 1) / 2 : 0.5;

    // Check against threshold
    var threshold = node.threshold || 0.5;
    // Convert support fraction to probability using a logistic curve
    // steepness controls how "decisive" the threshold is
    var steepness = 10;
    var pVote = 1 / (1 + Math.exp(-steepness * (supportFraction - threshold)));

    // ── 2b. Veto check within voting body ───────────────
    if (node.veto_type && node.veto_type !== "none") {
      for (var i = 0; i < vetoHolders.length; i++) {
        if (vetoHolders[i].score < -0.1) {
          if (node.veto_type === "absolute") {
            return {
              prob: 0.05,
              detail: "Absolute veto by " + (vetoHolders[i].player.Player_name || "veto player"),
              failure_mode: "veto"
            };
          } else if (node.veto_type === "suspensive") {
            // Can be overridden — halve the passage probability
            pVote *= 0.5;
          }
        }
      }
    }

    pVote = Math.max(0, Math.min(1, pVote));

    return {
      prob: pVote,
      detail: "Support fraction " + (supportFraction * 100).toFixed(1) +
              "% vs threshold " + (threshold * 100).toFixed(0) + "%",
      failure_mode: pVote < 0.5 ? "vote" : null
    };
  };

  /**
   * Compute overall path passage probability.
   * P(path) = product of P(node_k) for all nodes in sequence.
   *
   * Returns {
   *   overall: float,
   *   nodes: [{ node, result }],
   *   bottleneck: { node, result }
   * }
   */
  var pathAnalysis = function () {
    var nodes = M().getNodesSorted();
    var results = [];
    var overall = 1.0;
    var bottleneck = null;

    nodes.forEach(function (node) {
      var result = nodePassage(node.id);
      results.push({ node: node, result: result });

      if (result.prob !== null) {
        overall *= result.prob;
        if (!bottleneck || result.prob < bottleneck.result.prob) {
          bottleneck = { node: node, result: result };
        }
      }
    });

    return {
      overall: overall,
      nodes: results,
      bottleneck: bottleneck
    };
  };

  /**
   * Identify all veto points — nodes where a single player can block.
   */
  var vetoPoints = function () {
    var nodes = M().getNodesSorted();
    var vetos = [];

    nodes.forEach(function (node) {
      // Explicit veto type
      if (node.veto_type && node.veto_type !== "none") {
        var nps = M().getNodePlayers(node.id);
        var holders = nps.filter(function (np) {
          return np.assignment.role === "veto_holder";
        });
        holders.forEach(function (h) {
          if (h.player) {
            vetos.push({
              node: node,
              player: h.player,
              veto_type: node.veto_type,
              score: positionToScore(h.player.Position_rating)
            });
          }
        });
      }
      // Gate-control as de facto veto
      if (node.gate_control_player_id) {
        var gp = M().getPlayer(node.gate_control_player_id);
        if (gp) {
          vetos.push({
            node: node,
            player: gp,
            veto_type: "gate_control",
            score: positionToScore(gp.Position_rating)
          });
        }
      }
      // Single-actor nodes
      if (node.decision_rule === "single_actor") {
        var nps2 = M().getNodePlayers(node.id);
        if (nps2.length > 0 && nps2[0].player) {
          vetos.push({
            node: node,
            player: nps2[0].player,
            veto_type: "single_actor",
            score: positionToScore(nps2[0].player.Position_rating)
          });
        }
      }
    });

    return vetos;
  };

  /**
   * Strategy impact analysis.
   * For each PM5 strategy, look at which players it shifts (Affected_player),
   * then see which nodes those players sit at, and estimate the marginal
   * change in passage probability.
   */
  var strategyImpact = function () {
    var strategies = M().getStrategies();
    var nodes = M().getNodesSorted();
    var baseline = pathAnalysis();
    var impacts = [];

    strategies.forEach(function (strat) {
      // Find affected players for this strategy
      var affected = PF.Model.MODEL.Affected_player.filter(function (ap) {
        return ap.Strategy_ID === strat.Strategy_ID;
      });

      var nodeImpacts = [];
      nodes.forEach(function (node) {
        // Which affected players are at this node?
        var nodePlayerIds = M().getNodePlayers(node.id).map(function (np) {
          return np.player ? (np.player.Player_ID || np.player.id) : null;
        });

        var relevant = affected.filter(function (ap) {
          return nodePlayerIds.indexOf(ap.Player_ID) !== -1;
        });

        if (relevant.length > 0) {
          // Estimate marginal shift: average future position shift
          var avgShift = 0;
          relevant.forEach(function (ap) {
            if (ap.Future_position_rating !== undefined && ap.Future_position_rating !== null) {
              var player = M().getPlayer(ap.Player_ID);
              if (player) {
                var currentScore = positionToScore(player.Position_rating);
                var futureScore = positionToScore(ap.Future_position_rating);
                avgShift += (futureScore - currentScore);
              }
            }
          });
          avgShift = relevant.length > 0 ? avgShift / relevant.length : 0;

          nodeImpacts.push({
            node: node,
            affected_count: relevant.length,
            avg_position_shift: avgShift
          });
        } else {
          nodeImpacts.push({
            node: node,
            affected_count: 0,
            avg_position_shift: 0
          });
        }
      });

      impacts.push({
        strategy: strat,
        node_impacts: nodeImpacts
      });
    });

    return impacts;
  };

  // ── Public API ─────────────────────────────────────────────────
  return {
    positionToScore: positionToScore,
    powerToWeight: powerToWeight,
    nodePassage: nodePassage,
    pathAnalysis: pathAnalysis,
    vetoPoints: vetoPoints,
    strategyImpact: strategyImpact
  };
})();
