/**
 * pf.agent.js -- AI chat agent for PolicyMaker Formal.
 *
 * Sends user messages to an OpenAI-compatible endpoint (HDSI / proxy),
 * executes tool calls against PF.Model, and displays responses.
 */

var PF = PF || {};

PF.Agent = (function () {
  "use strict";

  var M = function () { return PF.Model; };
  var E = function () { return PF.Engine; };

  // ── Config (persisted in localStorage) ─────────────────────────
  var _config = {
    proxyUrl: "https://policymaker-formal-proxy.bbdaniels.workers.dev/",
    apiKey: "",          // direct HDSI key (only if no proxy)
    baseUrl: "",         // direct HDSI base URL
    model: "gpt-4o-mini"
  };

  var _messages = [];  // conversation history

  var loadConfig = function () {
    try {
      var saved = JSON.parse(localStorage.getItem("pf_agent_config") || "{}");
      Object.keys(saved).forEach(function (k) { if (_config[k] !== undefined) _config[k] = saved[k]; });
    } catch (e) {}
  };

  var saveConfig = function () {
    localStorage.setItem("pf_agent_config", JSON.stringify(_config));
  };

  // ── System prompt ──────────────────────────────────────────────
  var SYSTEM_PROMPT = [
    "You are the PolicyMaker Formal assistant -- an AI that helps users build and analyze institutional pathway models for policy analysis.",
    "",
    "The tool models policies traveling through sequential institutional decision points (committee votes, floor votes, vetoes, etc). Each node has authorized players with positions (1=high support to 7=high opposition) and power ratings. The engine computes passage probabilities at each node and overall.",
    "",
    "When the user asks you to do something, use the available tools. After making changes, briefly confirm what you did. When analyzing, explain the results in plain language.",
    "",
    "Position ratings: 1=High support, 2=Moderate support, 3=Low support, 4=Non-mobilized, 5=Low opposition, 6=Moderate opposition, 7=High opposition.",
    "Power ratings: 1 (low) to 7 (high).",
    "Decision rules: majority, supermajority, unanimity, single_actor, qualified_majority.",
    "Veto types: none, absolute, suspensive, pocket.",
    "Player roles at nodes: voter, chair, veto_holder, agenda_setter, implementer.",
    "",
    "Keep responses concise. Use the tools -- don't just describe what you would do."
  ].join("\n");

  // ── Tool definitions (OpenAI function calling format) ──────────
  var TOOLS = [
    {
      type: "function",
      function: {
        name: "list_nodes",
        description: "List all institutional nodes with their properties and passage probabilities",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "list_players",
        description: "List all players with their position, power, stance, and node assignments",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "list_edges",
        description: "List all edges (connections between nodes)",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "add_node",
        description: "Add a new institutional decision node",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Node name, e.g. 'Senate Finance Committee'" },
            branch: { type: "string", enum: ["legislative", "executive", "judicial", "regulatory", "subnational"] },
            level: { type: "string", enum: ["national", "state", "local"], default: "national" },
            decision_rule: { type: "string", enum: ["majority", "supermajority", "unanimity", "single_actor", "qualified_majority"] },
            threshold: { type: "number", description: "Required support fraction, e.g. 0.5 for majority, 0.6 for cloture" },
            veto_type: { type: "string", enum: ["none", "absolute", "suspensive", "pocket"], default: "none" },
            amendment_power: { type: "boolean", default: true }
          },
          required: ["name", "branch", "decision_rule", "threshold"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "edit_node",
        description: "Edit properties of an existing node. Find the node by name or ID.",
        parameters: {
          type: "object",
          properties: {
            node_name: { type: "string", description: "Name (or partial name) of the node to edit" },
            node_id: { type: "integer", description: "Node ID (alternative to name)" },
            name: { type: "string" },
            branch: { type: "string" },
            level: { type: "string" },
            decision_rule: { type: "string" },
            threshold: { type: "number" },
            veto_type: { type: "string" },
            amendment_power: { type: "boolean" }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_node",
        description: "Delete a node and all its edges and player assignments",
        parameters: {
          type: "object",
          properties: {
            node_name: { type: "string" },
            node_id: { type: "integer" }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "add_edge",
        description: "Connect two nodes with a directed edge (from → to)",
        parameters: {
          type: "object",
          properties: {
            from_name: { type: "string", description: "Source node name" },
            to_name: { type: "string", description: "Target node name" },
            from_id: { type: "integer" },
            to_id: { type: "integer" }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "remove_edge",
        description: "Remove the edge between two nodes",
        parameters: {
          type: "object",
          properties: {
            from_name: { type: "string" },
            to_name: { type: "string" },
            from_id: { type: "integer" },
            to_id: { type: "integer" }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "assign_player",
        description: "Assign a player to a node with a specific role",
        parameters: {
          type: "object",
          properties: {
            player_name: { type: "string", description: "Player name or abbreviation" },
            node_name: { type: "string", description: "Node name" },
            role: { type: "string", enum: ["voter", "chair", "veto_holder", "agenda_setter", "implementer"], default: "voter" },
            vote_weight: { type: "number", default: 1.0 }
          },
          required: ["player_name", "node_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "unassign_player",
        description: "Remove a player from a node",
        parameters: {
          type: "object",
          properties: {
            player_name: { type: "string" },
            node_name: { type: "string" }
          },
          required: ["player_name", "node_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_analysis",
        description: "Get the full pathway analysis: per-node passage probabilities, overall probability, bottleneck, and veto points",
        parameters: { type: "object", properties: {}, required: [] }
      }
    }
  ];

  // ── Node/player lookup helpers ─────────────────────────────────
  var findNode = function (name, id) {
    if (id) return M().getNode(id);
    if (!name) return null;
    var lower = name.toLowerCase();
    return M().getNodesSorted().find(function (n) {
      return (n.name || "").toLowerCase().indexOf(lower) !== -1;
    }) || null;
  };

  var findPlayer = function (name) {
    if (!name) return null;
    var lower = name.toLowerCase();
    return M().getPlayers().find(function (p) {
      return (p.Player_name || "").toLowerCase().indexOf(lower) !== -1 ||
             (p.Player_abbrev || "").toLowerCase() === lower;
    }) || null;
  };

  // ── Tool execution ─────────────────────────────────────────────
  var executeTool = function (name, args) {
    switch (name) {
      case "list_nodes":
        return M().getNodesSorted().map(function (n) {
          var r = E().nodePassage(n.id);
          return {
            id: n.id, name: n.name, branch: n.branch,
            decision_rule: n.decision_rule, threshold: n.threshold,
            veto_type: n.veto_type,
            players: M().getNodePlayers(n.id).length,
            passage_prob: r.prob !== null ? Math.round(r.prob * 100) + "%" : "unmapped",
            detail: r.detail
          };
        });

      case "list_players":
        return M().getPlayers().filter(function (p) { return p.Include !== false; }).map(function (p) {
          var nodeIds = M().getPlayerNodes(p.Player_ID || p.id);
          return {
            id: p.Player_ID || p.id,
            name: p.Player_name, abbrev: p.Player_abbrev,
            position: p.Position_rating, power: p.Power_rating,
            stance: M().stanceLabel(p.Position_rating),
            sector: p.Sector,
            assigned_nodes: nodeIds.map(function (nid) { var n = M().getNode(nid); return n ? n.name : nid; })
          };
        });

      case "list_edges":
        return M().getEdges().map(function (e) {
          var from = M().getNode(e.from_node_id);
          var to = M().getNode(e.to_node_id);
          return {
            id: e.id,
            from: from ? from.name : e.from_node_id,
            to: to ? to.name : e.to_node_id
          };
        });

      case "add_node":
        var node = M().addNode({
          name: args.name,
          branch: args.branch || "legislative",
          level: args.level || "national",
          decision_rule: args.decision_rule || "majority",
          threshold: args.threshold || 0.5,
          veto_type: args.veto_type || "none",
          amendment_power: args.amendment_power !== false
        });
        return { success: true, node_id: node.id, name: node.name };

      case "edit_node":
        var en = findNode(args.node_name, args.node_id);
        if (!en) return { error: "Node not found: " + (args.node_name || args.node_id) };
        var fields = {};
        ["name", "branch", "level", "decision_rule", "threshold", "veto_type", "amendment_power"].forEach(function (k) {
          if (args[k] !== undefined) fields[k] = args[k];
        });
        M().updateNode(en.id, fields);
        return { success: true, node_id: en.id, updated_fields: Object.keys(fields) };

      case "delete_node":
        var dn = findNode(args.node_name, args.node_id);
        if (!dn) return { error: "Node not found" };
        M().deleteNode(dn.id);
        return { success: true, deleted: dn.name };

      case "add_edge":
        var fromN = findNode(args.from_name, args.from_id);
        var toN = findNode(args.to_name, args.to_id);
        if (!fromN) return { error: "Source node not found: " + (args.from_name || args.from_id) };
        if (!toN) return { error: "Target node not found: " + (args.to_name || args.to_id) };
        var edge = M().addEdge(fromN.id, toN.id);
        return edge ? { success: true, from: fromN.name, to: toN.name } : { error: "Edge already exists" };

      case "remove_edge":
        var reFrom = findNode(args.from_name, args.from_id);
        var reTo = findNode(args.to_name, args.to_id);
        if (!reFrom || !reTo) return { error: "Node(s) not found" };
        M().removeEdge(reFrom.id, reTo.id);
        return { success: true, removed: reFrom.name + " → " + reTo.name };

      case "assign_player":
        var ap = findPlayer(args.player_name);
        var an = findNode(args.node_name);
        if (!ap) return { error: "Player not found: " + args.player_name };
        if (!an) return { error: "Node not found: " + args.node_name };
        M().assignPlayer(an.id, ap.Player_ID || ap.id, args.role || "voter", args.vote_weight || 1.0);
        return { success: true, player: ap.Player_name, node: an.name, role: args.role || "voter" };

      case "unassign_player":
        var up = findPlayer(args.player_name);
        var un = findNode(args.node_name);
        if (!up || !un) return { error: "Player or node not found" };
        M().unassignPlayer(un.id, up.Player_ID || up.id);
        return { success: true, removed: up.Player_name + " from " + un.name };

      case "get_analysis":
        var analysis = E().pathAnalysis();
        var vetos = E().vetoPoints();
        return {
          overall_passage_probability: Math.round(analysis.overall * 100) + "%",
          bottleneck: analysis.bottleneck ? {
            node: analysis.bottleneck.node.name,
            probability: Math.round(analysis.bottleneck.result.prob * 100) + "%",
            detail: analysis.bottleneck.result.detail
          } : null,
          nodes: analysis.nodes.map(function (nr) {
            return {
              name: nr.node.name,
              probability: nr.result.prob !== null ? Math.round(nr.result.prob * 100) + "%" : "unmapped",
              failure_mode: nr.result.failure_mode
            };
          }),
          veto_points: vetos.map(function (v) {
            return {
              player: v.player.Player_name,
              node: v.node.name,
              type: v.veto_type,
              stance: v.score >= 0 ? "supportive" : "opposing"
            };
          })
        };

      default:
        return { error: "Unknown tool: " + name };
    }
  };

  // ── API call ───────────────────────────────────────────────────
  var callAPI = function (messages, onDone) {
    var url, headers, body;

    if (_config.proxyUrl) {
      // Proxy mode: send to our backend
      url = _config.proxyUrl;
      headers = { "Content-Type": "application/json" };
    } else if (_config.apiKey && _config.baseUrl) {
      // Direct HDSI mode
      url = _config.baseUrl.replace(/\/$/, "") + "/chat/completions";
      headers = {
        "Content-Type": "application/json",
        "api-key": _config.apiKey
      };
    } else {
      onDone({ error: "No API configured. Open Settings to enter your endpoint." });
      return;
    }

    body = {
      model: _config.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }].concat(messages),
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 1024
    };

    fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    })
    .then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error("API " + res.status + ": " + t); });
      return res.json();
    })
    .then(function (data) {
      onDone(null, data);
    })
    .catch(function (err) {
      onDone({ error: err.message });
    });
  };

  // ── Chat loop (handles tool calls recursively) ─────────────────
  var sendMessage = function (userText, onUpdate, onComplete) {
    _messages.push({ role: "user", content: userText });
    onUpdate({ role: "user", content: userText });

    var loop = function () {
      callAPI(_messages, function (err, data) {
        if (err) {
          onUpdate({ role: "error", content: err.error });
          onComplete();
          return;
        }

        var choice = data.choices && data.choices[0];
        if (!choice) {
          onUpdate({ role: "error", content: "No response from API" });
          onComplete();
          return;
        }

        var msg = choice.message;
        _messages.push(msg);

        // Check for tool calls
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          var modelChanged = false;
          msg.tool_calls.forEach(function (tc) {
            var args = {};
            try { args = JSON.parse(tc.function.arguments || "{}"); } catch (e) {}

            var result = executeTool(tc.function.name, args);
            if (tc.function.name !== "list_nodes" && tc.function.name !== "list_players" &&
                tc.function.name !== "list_edges" && tc.function.name !== "get_analysis") {
              modelChanged = true;
            }

            _messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result)
            });
          });

          // Refresh viz if model changed
          if (modelChanged) {
            PF.Vis.refreshAll();
          }

          // Continue the loop — model may want to make more tool calls or respond
          loop();
        } else {
          // Text response — display it
          if (msg.content) {
            onUpdate({ role: "assistant", content: msg.content });
          }
          onComplete();
        }
      });
    };

    loop();
  };

  // ── Reset conversation ─────────────────────────────────────────
  var resetConversation = function () {
    _messages = [];
  };

  // ── Public API ─────────────────────────────────────────────────
  return {
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    config: function () { return _config; },
    setConfig: function (c) { Object.keys(c).forEach(function (k) { _config[k] = c[k]; }); saveConfig(); },
    sendMessage: sendMessage,
    resetConversation: resetConversation
  };
})();
