/**
 * pf.model.js -- Data model for PolicyMaker Formal.
 *
 * Manages the internal state (MODEL), PM5 JSON import/export,
 * and CRUD operations for institutional entities.
 */

var PF = PF || {};

PF.Model = (function () {
  "use strict";

  // ── Internal state ──────────────────────────────────────────────
  var MODEL = {
    // PM5-origin tables (imported as-is)
    Project: [],
    Player: [],
    Strategy: [],
    Affected_player: [],
    Policy_Goal: [],
    Coalition: [],
    Consequences: [],
    Objectives: [],

    // PolicyMaker Formal tables
    InstitutionalNode: [],
    NodePlayer: [],
    Edge: [],
    InstitutionalPath: [],
    VetoOverride: []
  };

  // ── Helpers ─────────────────────────────────────────────────────
  var _nextId = function (table) {
    if (MODEL[table].length === 0) return 1;
    return Math.max.apply(null, MODEL[table].map(function (r) { return r.id || 0; })) + 1;
  };

  // Position rating → human label
  var STANCE_MAP = {
    1: "High support",
    2: "Moderate support",
    3: "Low support",
    4: "Non-mobilized",
    5: "Low opposition",
    6: "Moderate opposition",
    7: "High opposition"
  };

  var stanceClass = function (posRating) {
    if (posRating <= 3) return "support";
    if (posRating === 4) return "neutral";
    return "oppose";
  };

  var stanceLabel = function (posRating) {
    return STANCE_MAP[posRating] || "Unknown";
  };

  // ── PM5 Import ──────────────────────────────────────────────────
  var importPM5 = function (jsonObj) {
    // Carry over PM5 tables
    var pm5Tables = [
      "Project", "Player", "Strategy", "Affected_player",
      "Policy_Goal", "Coalition", "Consequences", "Objectives"
    ];
    pm5Tables.forEach(function (t) {
      if (jsonObj[t]) MODEL[t] = jsonObj[t];
    });

    // Carry over PF tables if present (re-import of enriched file)
    var pfTables = ["InstitutionalNode", "NodePlayer", "Edge", "InstitutionalPath", "VetoOverride"];
    pfTables.forEach(function (t) {
      if (jsonObj[t]) MODEL[t] = jsonObj[t];
    });

    // Ensure all players have an id field
    MODEL.Player.forEach(function (p, i) {
      if (p.id === undefined) p.id = p.Player_ID || (i + 1);
    });
  };

  // ── Export ──────────────────────────────────────────────────────
  var exportJSON = function () {
    return JSON.stringify(MODEL, null, 2);
  };

  // ── Institutional Node CRUD ────────────────────────────────────
  var addNode = function (node) {
    node.id = _nextId("InstitutionalNode");
    node.node_id = node.id;
    MODEL.InstitutionalNode.push(node);
    return node;
  };

  var updateNode = function (id, fields) {
    var node = getNode(id);
    if (!node) return null;
    Object.keys(fields).forEach(function (k) { node[k] = fields[k]; });
    return node;
  };

  var deleteNode = function (id) {
    MODEL.InstitutionalNode = MODEL.InstitutionalNode.filter(function (n) { return n.id !== id; });
    MODEL.NodePlayer = MODEL.NodePlayer.filter(function (np) { return np.node_id !== id; });
    MODEL.Edge = MODEL.Edge.filter(function (e) { return e.from_node_id !== id && e.to_node_id !== id; });
  };

  var getNode = function (id) {
    return MODEL.InstitutionalNode.find(function (n) { return n.id === id; }) || null;
  };

  var getNodesSorted = function () {
    return MODEL.InstitutionalNode.slice().sort(function (a, b) {
      return (a.sequence_order || 0) - (b.sequence_order || 0);
    });
  };

  // ── NodePlayer CRUD ────────────────────────────────────────────
  var assignPlayer = function (nodeId, playerId, role, voteWeight) {
    // Remove existing assignment if any
    MODEL.NodePlayer = MODEL.NodePlayer.filter(function (np) {
      return !(np.node_id === nodeId && np.player_id === playerId);
    });
    MODEL.NodePlayer.push({
      id: _nextId("NodePlayer"),
      node_id: nodeId,
      player_id: playerId,
      role: role || "voter",
      vote_weight: voteWeight || 1.0,
      gate_control: (role === "chair" || role === "agenda_setter")
    });
  };

  var unassignPlayer = function (nodeId, playerId) {
    MODEL.NodePlayer = MODEL.NodePlayer.filter(function (np) {
      return !(np.node_id === nodeId && np.player_id === playerId);
    });
  };

  var getNodePlayers = function (nodeId) {
    var npRows = MODEL.NodePlayer.filter(function (np) { return np.node_id === nodeId; });
    return npRows.map(function (np) {
      var player = MODEL.Player.find(function (p) { return (p.Player_ID || p.id) === np.player_id; });
      return { assignment: np, player: player || null };
    });
  };

  var getPlayerNodes = function (playerId) {
    return MODEL.NodePlayer.filter(function (np) { return np.player_id === playerId; })
      .map(function (np) { return np.node_id; });
  };

  // ── Edge CRUD ───────────────────────────────────────────────────
  var addEdge = function (fromNodeId, toNodeId) {
    // Don't duplicate
    var exists = MODEL.Edge.some(function (e) {
      return e.from_node_id === fromNodeId && e.to_node_id === toNodeId;
    });
    if (exists) return null;
    var edge = { id: _nextId("Edge"), from_node_id: fromNodeId, to_node_id: toNodeId };
    MODEL.Edge.push(edge);
    return edge;
  };

  var removeEdge = function (fromNodeId, toNodeId) {
    MODEL.Edge = MODEL.Edge.filter(function (e) {
      return !(e.from_node_id === fromNodeId && e.to_node_id === toNodeId);
    });
  };

  var removeEdgeById = function (id) {
    MODEL.Edge = MODEL.Edge.filter(function (e) { return e.id !== id; });
  };

  var getEdges = function () { return MODEL.Edge; };

  var getOutEdges = function (nodeId) {
    return MODEL.Edge.filter(function (e) { return e.from_node_id === nodeId; });
  };

  var getInEdges = function (nodeId) {
    return MODEL.Edge.filter(function (e) { return e.to_node_id === nodeId; });
  };

  // ── Player CRUD ────────────────────────────────────────────────
  var getPlayer = function (id) {
    return MODEL.Player.find(function (p) { return (p.Player_ID || p.id) === id; }) || null;
  };

  var addPlayer = function (fields) {
    var id = _nextId("Player");
    var player = {
      Player_ID: id, id: id,
      Player_name: fields.name || "New Player",
      Player_abbrev: fields.abbrev || "",
      Position_rating: fields.position || 4,
      Power_rating: fields.power || 4,
      Support_vs_opposition: (fields.position || 4) <= 3 ? 1 : ((fields.position || 4) >= 5 ? 2 : 3),
      Sector: fields.sector || "",
      Level: fields.level || "National",
      Org_or_indiv: fields.org ? 1 : 2,
      Player_obstacle: fields.obstacle || "",
      Player_opportunity: fields.opportunity || "",
      Include: true
    };
    MODEL.Player.push(player);
    return player;
  };

  var updatePlayer = function (id, fields) {
    var player = getPlayer(id);
    if (!player) return null;
    Object.keys(fields).forEach(function (k) { player[k] = fields[k]; });
    if (fields.Position_rating !== undefined) {
      player.Support_vs_opposition = fields.Position_rating <= 3 ? 1 : (fields.Position_rating >= 5 ? 2 : 3);
    }
    return player;
  };

  var getPlayers = function () { return MODEL.Player; };
  var getStrategies = function () { return MODEL.Strategy; };
  var getProject = function () { return MODEL.Project[0] || {}; };

  // ── Public API ─────────────────────────────────────────────────
  return {
    MODEL: MODEL,
    importPM5: importPM5,
    exportJSON: exportJSON,
    addNode: addNode,
    updateNode: updateNode,
    deleteNode: deleteNode,
    getNode: getNode,
    getNodesSorted: getNodesSorted,
    assignPlayer: assignPlayer,
    unassignPlayer: unassignPlayer,
    getNodePlayers: getNodePlayers,
    getPlayerNodes: getPlayerNodes,
    getPlayer: getPlayer,
    addPlayer: addPlayer,
    updatePlayer: updatePlayer,
    getPlayers: getPlayers,
    getStrategies: getStrategies,
    getProject: getProject,
    addEdge: addEdge,
    removeEdge: removeEdge,
    removeEdgeById: removeEdgeById,
    getEdges: getEdges,
    getOutEdges: getOutEdges,
    getInEdges: getInEdges,
    stanceClass: stanceClass,
    stanceLabel: stanceLabel,
    STANCE_MAP: STANCE_MAP
  };
})();
