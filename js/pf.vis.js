/**
 * pf.vis.js -- D3 visualizations for PolicyMaker Formal.
 *
 * Pipeline diagram, node detail panel, and analysis charts.
 */

var PF = PF || {};

PF.Vis = (function () {
  "use strict";

  var M = function () { return PF.Model; };
  var E = function () { return PF.Engine; };

  // ── Color helpers ──────────────────────────────────────────────
  var probColor = function (p) {
    if (p === null) return "#94a3b8";
    if (p >= 0.75) return "#22c55e";
    if (p >= 0.50) return "#eab308";
    return "#ef4444";
  };

  var probClass = function (p) {
    if (p === null) return "";
    if (p >= 0.75) return "prob-high";
    if (p >= 0.50) return "prob-med";
    return "prob-low";
  };

  var branchIcon = function (branch) {
    var icons = {
      legislative: "\u2696",  // balance scale
      executive: "\u270D",    // writing hand
      judicial: "\u2694",     // crossed swords
      regulatory: "\u2699",   // gear
      subnational: "\u2302"   // house
    };
    return icons[branch] || "\u25CF";
  };

  // ── Pipeline SVG ───────────────────────────────────────────────
  var drawPipeline = function (containerId, onNodeClick) {
    var container = document.getElementById(containerId);
    container.innerHTML = "";

    var nodes = M().getNodesSorted();
    if (nodes.length === 0) {
      container.innerHTML = '<p style="color:#6b7685;padding:2rem;text-align:center;">No institutional nodes defined. Add nodes or load the demo project.</p>';
      return;
    }

    var analysis = E().pathAnalysis();
    var resultMap = {};
    analysis.nodes.forEach(function (nr) { resultMap[nr.node.id] = nr.result; });

    // Dimensions
    var nodeW = 180, nodeH = 72, padX = 80, padY = 24;
    var marginTop = 30, marginLeft = 40;

    // Derive column layout from edge topology (longest-path / topological depth)
    var edges = M().getEdges();
    var inDegree = {}, depth = {};
    nodes.forEach(function (n) { inDegree[n.id] = 0; depth[n.id] = 0; });
    edges.forEach(function (e) {
      if (inDegree[e.to_node_id] !== undefined) inDegree[e.to_node_id]++;
    });

    // Longest-path BFS: depth = max(depth of all predecessors) + 1
    var changed = true;
    var iterations = 0;
    while (changed && iterations < 100) {
      changed = false;
      iterations++;
      edges.forEach(function (e) {
        if (depth[e.from_node_id] !== undefined && depth[e.to_node_id] !== undefined) {
          var newDepth = depth[e.from_node_id] + 1;
          if (newDepth > depth[e.to_node_id]) {
            depth[e.to_node_id] = newDepth;
            changed = true;
          }
        }
      });
    }

    // Group nodes by depth column
    var colGroups = {};
    nodes.forEach(function (n) {
      var col = depth[n.id] || 0;
      if (!colGroups[col]) colGroups[col] = [];
      colGroups[col].push(n);
    });
    var colKeys = Object.keys(colGroups).sort(function (a, b) { return a - b; });

    // Sort nodes within each column by sequence_order (as vertical hint)
    colKeys.forEach(function (k) {
      colGroups[k].sort(function (a, b) { return (a.sequence_order || 0) - (b.sequence_order || 0); });
    });

    // Compute max stack height
    var maxStack = 0;
    colKeys.forEach(function (k) { maxStack = Math.max(maxStack, colGroups[k].length); });

    var svgW = marginLeft + colKeys.length * (nodeW + padX) + 40;
    var svgH = marginTop + maxStack * (nodeH + padY) + 40;

    var svg = d3.select("#" + containerId)
      .append("svg")
      .attr("width", svgW)
      .attr("height", svgH)
      .attr("viewBox", "0 0 " + svgW + " " + svgH);

    // Assign positions (use saved x_pos/y_pos if available)
    var nodePositions = {};
    colKeys.forEach(function (colKey, colIdx) {
      var group = colGroups[colKey];
      var groupH = group.length * (nodeH + padY) - padY;
      var startY = marginTop + (svgH - marginTop - 40 - groupH) / 2;

      group.forEach(function (node, row) {
        var x = (node.x_pos != null) ? node.x_pos : marginLeft + colIdx * (nodeW + padX);
        var y = (node.y_pos != null) ? node.y_pos : startY + row * (nodeH + padY);
        nodePositions[node.id] = { x: x, y: y, col: colIdx };
      });
    });

    // Nearest-side anchor: pick the pair of points (source side, target side) that minimizes distance
    var anchorPoints = function (fromId, toId) {
      var fp = nodePositions[fromId], tp = nodePositions[toId];
      if (!fp || !tp) return { x1: 0, y1: 0, x2: 0, y2: 0 };

      var sides = [
        { label: "right",  sx: fp.x + nodeW,     sy: fp.y + nodeH / 2, tx: tp.x,             ty: tp.y + nodeH / 2 },
        { label: "bottom", sx: fp.x + nodeW / 2, sy: fp.y + nodeH,     tx: tp.x + nodeW / 2, ty: tp.y },
        { label: "top",    sx: fp.x + nodeW / 2, sy: fp.y,             tx: tp.x + nodeW / 2, ty: tp.y + nodeH },
        { label: "left",   sx: fp.x,             sy: fp.y + nodeH / 2, tx: tp.x + nodeW,     ty: tp.y + nodeH / 2 }
      ];

      // For each source side, pick the nearest target side
      var best = null, bestDist = Infinity;
      var srcSides = [
        { x: fp.x + nodeW,     y: fp.y + nodeH / 2 },  // right
        { x: fp.x + nodeW / 2, y: fp.y + nodeH },       // bottom
        { x: fp.x + nodeW / 2, y: fp.y },                // top
        { x: fp.x,             y: fp.y + nodeH / 2 }    // left
      ];
      var tgtSides = [
        { x: tp.x,             y: tp.y + nodeH / 2 },  // left
        { x: tp.x + nodeW / 2, y: tp.y },                // top
        { x: tp.x + nodeW / 2, y: tp.y + nodeH },       // bottom
        { x: tp.x + nodeW,     y: tp.y + nodeH / 2 }   // right
      ];

      srcSides.forEach(function (s) {
        tgtSides.forEach(function (t) {
          var dx = t.x - s.x, dy = t.y - s.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist) {
            bestDist = dist;
            best = { x1: s.x, y1: s.y, x2: t.x, y2: t.y };
          }
        });
      });

      return best || { x1: fp.x + nodeW, y1: fp.y + nodeH / 2, x2: tp.x, y2: tp.y + nodeH / 2 };
    };

    // Edge-drawing state
    var _connectFrom = null;

    // Use explicit edges from model
    var edgeData = M().getEdges().map(function (e) {
      return { id: e.id, from: e.from_node_id, to: e.to_node_id };
    });

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 6")
      .attr("refX", 10).attr("refY", 3)
      .attr("markerWidth", 8).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L10,3 L0,6 Z")
      .attr("fill", "#cbd5e1");

    // Visible edge lines
    var edgeGroups = svg.selectAll(".pipeline-edge")
      .data(edgeData)
      .enter()
      .append("g")
      .attr("class", "pipeline-edge");

    // Thick invisible hit area for clicking
    edgeGroups.append("line")
      .attr("class", "edge-hitarea")
      .each(function (d) {
        var a = anchorPoints(d.from, d.to);
        d3.select(this).attr("x1", a.x1).attr("y1", a.y1).attr("x2", a.x2).attr("y2", a.y2);
      })
      .attr("stroke", "transparent")
      .attr("stroke-width", 14)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        event.stopPropagation();
        M().removeEdgeById(d.id);
        drawPipeline(containerId, onNodeClick);
        showPipelineSummary();
      });

    // Visible line
    var edgeLines = edgeGroups.append("line")
      .attr("class", "edge-line")
      .each(function (d) {
        var a = anchorPoints(d.from, d.to);
        d3.select(this).attr("x1", a.x1).attr("y1", a.y1).attr("x2", a.x2).attr("y2", a.y2);
      })
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)")
      .style("pointer-events", "none");

    // Helper to update all edge positions from nodePositions (during drag)
    var updateEdges = function () {
      edgeGroups.each(function (d) {
        var a = anchorPoints(d.from, d.to);
        d3.select(this).selectAll("line")
          .attr("x1", a.x1).attr("y1", a.y1)
          .attr("x2", a.x2).attr("y2", a.y2);
      });
    };

    // Drag behavior — purely visual repositioning (structure is defined by edges)
    var _dragDidMove = false;
    var dragBehavior = d3.drag()
      .on("start", function (event, d) {
        _dragDidMove = false;
        d3.select(this).raise().classed("dragging", true);
      })
      .on("drag", function (event, d) {
        _dragDidMove = true;
        var newX = event.x - nodeW / 2;
        var newY = event.y - nodeH / 2;
        nodePositions[d.id].x = newX;
        nodePositions[d.id].y = newY;
        d3.select(this).attr("transform", "translate(" + newX + "," + newY + ")");
        updateEdges();
      })
      .on("end", function (event, d) {
        d3.select(this).classed("dragging", false);
        if (_dragDidMove) {
          // Save position to node object
          var node = M().getNode(d.id);
          if (node) {
            node.x_pos = nodePositions[d.id].x;
            node.y_pos = nodePositions[d.id].y;
          }
          // Grow SVG if needed
          var maxX = 0, maxY = 0;
          Object.keys(nodePositions).forEach(function (k) {
            maxX = Math.max(maxX, nodePositions[k].x + nodeW + 40);
            maxY = Math.max(maxY, nodePositions[k].y + nodeH + 40);
          });
          if (maxX > svgW || maxY > svgH) {
            svgW = Math.max(svgW, maxX);
            svgH = Math.max(svgH, maxY);
            svg.attr("width", svgW).attr("height", svgH)
               .attr("viewBox", "0 0 " + svgW + " " + svgH);
          }
        }
      });

    // Draw nodes
    var nodeGroups = svg.selectAll(".pipeline-node")
      .data(nodes, function (d) { return d.id; })
      .enter()
      .append("g")
      .attr("class", "pipeline-node")
      .attr("transform", function (d) {
        var p = nodePositions[d.id];
        return "translate(" + p.x + "," + p.y + ")";
      })
      .on("click", function (event, d) {
        // Only fire click if not dragging
        if (_dragDidMove) return;

        // Shift-click: connect mode
        if (event.shiftKey && _connectFrom !== null) {
          if (_connectFrom !== d.id) {
            M().addEdge(_connectFrom, d.id);
          }
          _connectFrom = null;
          svg.select(".connect-preview").remove();
          svg.on("mousemove.connect", null);
          svg.selectAll(".pipeline-node").classed("connecting", false);
          drawPipeline(containerId, onNodeClick);
          showPipelineSummary();
          return;
        }
        if (event.shiftKey) {
          // Start connect mode
          _connectFrom = d.id;
          svg.selectAll(".pipeline-node").classed("selected", false);
          d3.select(this).classed("connecting", true);
          // Preview line follows mouse
          var preview = svg.append("line")
            .attr("class", "connect-preview")
            .attr("x1", nodePositions[d.id].x + nodeW)
            .attr("y1", nodePositions[d.id].y + nodeH / 2)
            .attr("stroke", "#2563eb").attr("stroke-width", 2)
            .attr("stroke-dasharray", "6 3")
            .attr("marker-end", "url(#arrow)");
          svg.on("mousemove.connect", function (ev) {
            var pt = d3.pointer(ev);
            preview.attr("x2", pt[0]).attr("y2", pt[1]);
          });
          return;
        }

        // Normal click: select + show detail
        // Cancel any in-progress connect
        _connectFrom = null;
        svg.select(".connect-preview").remove();
        svg.on("mousemove.connect", null);
        svg.selectAll(".pipeline-node").classed("connecting", false);

        svg.selectAll(".pipeline-node").classed("selected", false);
        d3.select(this).classed("selected", true);
        if (onNodeClick) onNodeClick(d);
      })
      .call(dragBehavior);

    // Node rectangle
    nodeGroups.append("rect")
      .attr("width", nodeW)
      .attr("height", nodeH)
      .attr("rx", 8).attr("ry", 8)
      .attr("fill", "#fff")
      .attr("stroke", function (d) { return probColor(resultMap[d.id] ? resultMap[d.id].prob : null); })
      .attr("stroke-width", 2);

    // Probability bar at bottom of node
    nodeGroups.append("rect")
      .attr("x", 4).attr("y", nodeH - 10)
      .attr("width", function (d) {
        var r = resultMap[d.id];
        var p = r ? r.prob : 0;
        if (p === null) p = 0;
        return Math.max(0, (nodeW - 8) * p);
      })
      .attr("height", 6)
      .attr("rx", 3)
      .attr("fill", function (d) { return probColor(resultMap[d.id] ? resultMap[d.id].prob : null); })
      .attr("opacity", 0.5);

    // Branch icon
    nodeGroups.append("text")
      .attr("x", 10).attr("y", 18)
      .attr("font-size", "13px")
      .text(function (d) { return branchIcon(d.branch); });

    // Node name (truncated)
    nodeGroups.append("text")
      .attr("x", 26).attr("y", 18)
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#1a2332")
      .text(function (d) {
        var name = d.name || "";
        return name.length > 20 ? name.substring(0, 18) + "\u2026" : name;
      });

    // Second line: decision rule
    nodeGroups.append("text")
      .attr("x", 10).attr("y", 34)
      .attr("font-size", "10px")
      .attr("fill", "#6b7685")
      .text(function (d) {
        var rule = (d.decision_rule || "").replace("_", " ");
        var thresh = d.threshold ? " (" + Math.round(d.threshold * 100) + "%)" : "";
        return rule + thresh;
      });

    // Probability label
    nodeGroups.append("text")
      .attr("x", 10).attr("y", 50)
      .attr("font-size", "14px")
      .attr("font-weight", "700")
      .attr("fill", function (d) { return probColor(resultMap[d.id] ? resultMap[d.id].prob : null); })
      .text(function (d) {
        var r = resultMap[d.id];
        if (!r || r.prob === null) return "—";
        return Math.round(r.prob * 100) + "%";
      });

    // Failure mode indicator
    nodeGroups.append("text")
      .attr("x", 60).attr("y", 50)
      .attr("font-size", "9px")
      .attr("fill", "#ef4444")
      .text(function (d) {
        var r = resultMap[d.id];
        if (!r || !r.failure_mode) return "";
        var labels = { gate: "\u26D4 gate", veto: "\u2718 veto", vote: "\u2718 vote" };
        return labels[r.failure_mode] || "";
      });

    // Parallel group indicator
    nodeGroups.filter(function (d) { return d.parallel_group; })
      .append("text")
      .attr("x", nodeW - 8).attr("y", 18)
      .attr("text-anchor", "end")
      .attr("font-size", "8px")
      .attr("fill", "#94a3b8")
      .text("\u2225"); // parallel symbol

    // Bottleneck highlight
    if (analysis.bottleneck) {
      var bnId = analysis.bottleneck.node.id;
      nodeGroups.filter(function (d) { return d.id === bnId; })
        .append("rect")
        .attr("x", -3).attr("y", -3)
        .attr("width", nodeW + 6).attr("height", nodeH + 6)
        .attr("rx", 10).attr("ry", 10)
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 2");
    }
  };

  // ── Node Detail Panel ──────────────────────────────────────────
  var showNodeDetail = function (node) {
    var panel = document.getElementById("pipeline-detail");
    var result = E().nodePassage(node.id);
    var nps = M().getNodePlayers(node.id);

    var html = '<h4>' + branchIcon(node.branch) + ' ' + (node.name || "Node " + node.id) + '</h4>';
    html += '<dl class="detail-grid">';
    html += '<dt>Branch</dt><dd>' + (node.branch || "—") + '</dd>';
    html += '<dt>Level</dt><dd>' + (node.level || "—") + '</dd>';
    html += '<dt>Decision Rule</dt><dd>' + (node.decision_rule || "—").replace("_", " ") + '</dd>';
    html += '<dt>Threshold</dt><dd>' + (node.threshold ? Math.round(node.threshold * 100) + "%" : "—") + '</dd>';
    html += '<dt>Veto Type</dt><dd>' + (node.veto_type || "none") + '</dd>';
    html += '<dt>Can Amend</dt><dd>' + (node.amendment_power ? "Yes" : "No") + '</dd>';
    html += '<dt>Passage Prob.</dt><dd class="' + probClass(result.prob) + '">' +
            (result.prob !== null ? Math.round(result.prob * 100) + "%" : "—") + '</dd>';
    html += '<dt>Detail</dt><dd>' + result.detail + '</dd>';
    html += '</dl>';

    // Gate controller
    if (node.gate_control_player_id) {
      var gp = M().getPlayer(node.gate_control_player_id);
      if (gp) {
        html += '<div style="font-size:0.8rem;margin-bottom:0.5rem;">';
        html += '<strong>Gate controller:</strong> ' + (gp.Player_name || gp.Player_abbrev);
        html += ' <span class="' + M().stanceClass(gp.Position_rating) + '">';
        html += '(' + M().stanceLabel(gp.Position_rating) + ')</span></div>';
      }
    }

    // Player chips
    if (nps.length > 0) {
      html += '<div style="font-size:0.8rem;font-weight:600;margin-bottom:0.3rem;">Authorized Players:</div>';
      html += '<div class="player-chips">';
      nps.forEach(function (np) {
        if (!np.player) return;
        var cls = M().stanceClass(np.player.Position_rating);
        html += '<span class="player-chip ' + cls + '">';
        html += (np.player.Player_abbrev || np.player.Player_name);
        if (np.assignment.role !== "voter") {
          html += ' <span class="chip-role">' + np.assignment.role + '</span>';
        }
        html += '</span>';
      });
      html += '</div>';
    }

    html += '<button class="btn-assign-players" id="btn-edit-node-' + node.id + '">Edit node</button> ';
    html += '<button class="btn-assign-players" id="btn-assign-node-' + node.id + '">Edit player assignments</button>';

    panel.innerHTML = html;

    document.getElementById('btn-edit-node-' + node.id).addEventListener('click', function () {
      PF.UI.openNodeDialog(node.id);
    });
    document.getElementById('btn-assign-node-' + node.id).addEventListener('click', function () {
      PF.UI.openAssignDialog(node.id);
    });
  };

  // ── Pipeline Summary ───────────────────────────────────────────
  var showPipelineSummary = function () {
    var panel = document.getElementById("pipeline-summary");
    var analysis = E().pathAnalysis();

    var html = '<div class="overall-prob ' + probClass(analysis.overall) + '">';
    html += Math.round(analysis.overall * 100) + '%</div>';
    html += '<div style="font-size:0.82rem;color:#6b7685;">Overall passage probability (product of all nodes)</div>';

    if (analysis.bottleneck) {
      html += '<div style="margin-top:0.5rem;" class="bottleneck">';
      html += 'Bottleneck: <strong>' + analysis.bottleneck.node.name + '</strong>';
      html += ' (' + Math.round(analysis.bottleneck.result.prob * 100) + '% — ';
      html += analysis.bottleneck.result.detail + ')';
      html += '</div>';
    }

    panel.innerHTML = html;
  };

  // ── Nodes Table ────────────────────────────────────────────────
  var renderNodesTable = function () {
    var tbody = document.querySelector("#nodes-table tbody");
    tbody.innerHTML = "";

    var nodes = M().getNodesSorted();
    nodes.forEach(function (node) {
      var result = E().nodePassage(node.id);
      var nps = M().getNodePlayers(node.id);
      var tr = document.createElement("tr");

      tr.innerHTML =
        '<td class="num">' + (node.sequence_order || "—") + '</td>' +
        '<td><strong>' + (node.name || "—") + '</strong></td>' +
        '<td>' + (node.branch || "—") + '</td>' +
        '<td>' + (node.level || "—") + '</td>' +
        '<td>' + (node.decision_rule || "—").replace("_", " ") + '</td>' +
        '<td class="num">' + (node.threshold ? Math.round(node.threshold * 100) + "%" : "—") + '</td>' +
        '<td>' + (node.veto_type || "none") + '</td>' +
        '<td>' + (node.amendment_power ? "\u2713" : "") + '</td>' +
        '<td class="num">' + nps.length + '</td>' +
        '<td class="num prob-cell ' + probClass(result.prob) + '">' +
        (result.prob !== null ? Math.round(result.prob * 100) + "%" : "—") + '</td>';

      tr.style.cursor = "pointer";
      tr.addEventListener("click", (function (nid) {
        return function () { PF.UI.openNodeDialog(nid); };
      })(node.id));
      tbody.appendChild(tr);
    });
  };

  // ── Players Table ──────────────────────────────────────────────
  var renderPlayersTable = function () {
    var tbody = document.querySelector("#players-table tbody");
    tbody.innerHTML = "";

    var players = M().getPlayers();
    document.getElementById("player-count").textContent = players.length + " players";

    players.forEach(function (p) {
      if (!p.Include && p.Include !== undefined) return;
      var nodeIds = M().getPlayerNodes(p.Player_ID || p.id);
      var nodeNames = nodeIds.map(function (nid) {
        var n = M().getNode(nid);
        return n ? n.name : nid;
      });

      var cls = M().stanceClass(p.Position_rating);
      var stanceText = M().stanceLabel(p.Position_rating);

      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><strong>' + (p.Player_name || "—") + '</strong></td>' +
        '<td>' + (p.Player_abbrev || "") + '</td>' +
        '<td class="num">' + (p.Position_rating || "—") + '</td>' +
        '<td class="num">' + (p.Power_rating || "—") + '</td>' +
        '<td class="stance-' + cls + '">' + stanceText + '</td>' +
        '<td>' + (p.Sector || "—") + '</td>' +
        '<td>' + (nodeNames.length > 0 ? nodeNames.join("; ") : '<span class="muted">none</span>') + '</td>';

      tbody.appendChild(tr);
    });
  };

  // ── Analysis View ──────────────────────────────────────────────
  var renderAnalysis = function () {
    var analysis = E().pathAnalysis();
    var vetos = E().vetoPoints();
    var impacts = E().strategyImpact();

    // Overall
    var overallCard = document.querySelector("#card-overall .card-body");
    overallCard.innerHTML =
      '<div class="big-number ' + probClass(analysis.overall) + '">' +
      Math.round(analysis.overall * 100) + '%</div>' +
      '<div class="label">Product of ' + analysis.nodes.length + ' node probabilities</div>';

    // Bottleneck
    var bnCard = document.querySelector("#card-bottleneck .card-body");
    if (analysis.bottleneck) {
      bnCard.innerHTML =
        '<div class="big-number prob-low">' + (analysis.bottleneck.node.name || "—") + '</div>' +
        '<div class="label">' + Math.round(analysis.bottleneck.result.prob * 100) +
        '% passage — ' + analysis.bottleneck.result.detail + '</div>';
    } else {
      bnCard.innerHTML = '<div class="label">No bottleneck identified</div>';
    }

    // Veto points
    var vetoCard = document.querySelector("#card-veto .card-body");
    if (vetos.length === 0) {
      vetoCard.innerHTML = '<div class="label">No veto points</div>';
    } else {
      var html = '<ul>';
      vetos.forEach(function (v) {
        var scoreLabel = v.score >= 0 ? "supportive" : "opposing";
        html += '<li><strong>' + v.player.Player_name + '</strong> at ' +
                v.node.name + ' (' + v.veto_type.replace("_", " ") + ', ' + scoreLabel + ')</li>';
      });
      html += '</ul>';
      vetoCard.innerHTML = html;
    }

    // Strategy impact heatmap
    var stratCard = document.querySelector("#card-strategies .card-body");
    if (impacts.length === 0) {
      stratCard.innerHTML = '<div class="label">No strategies defined</div>';
    } else {
      stratCard.innerHTML = '<div class="label">' + impacts.length + ' strategies analyzed — see table below</div>';
    }

    // Strategy × Node impact table
    var detail = document.getElementById("analysis-detail");
    if (impacts.length === 0) {
      detail.innerHTML = "";
      return;
    }

    var nodes = M().getNodesSorted();
    var tHtml = '<h3>Strategy Impact by Node</h3>';
    tHtml += '<table class="impact-table"><thead><tr><th>Strategy</th>';
    nodes.forEach(function (n) {
      tHtml += '<th>' + (n.name ? n.name.substring(0, 15) : n.id) + '</th>';
    });
    tHtml += '</tr></thead><tbody>';

    impacts.forEach(function (imp) {
      tHtml += '<tr><td>' + (imp.strategy.Strategy_name || "—") + '</td>';
      imp.node_impacts.forEach(function (ni) {
        var shift = ni.avg_position_shift;
        var color = shift > 0.1 ? "#22c55e" : (shift < -0.1 ? "#ef4444" : "#94a3b8");
        var label = shift === 0 ? "—" : (shift > 0 ? "+" : "") + shift.toFixed(2);
        tHtml += '<td><span class="impact-heatcell" style="background:' + color + '">' + label + '</span></td>';
      });
      tHtml += '</tr>';
    });
    tHtml += '</tbody></table>';
    detail.innerHTML = tHtml;
  };

  // ── Full refresh ───────────────────────────────────────────────
  var refreshAll = function () {
    drawPipeline("pipeline-svg-container", showNodeDetail);
    showPipelineSummary();
    renderNodesTable();
    renderPlayersTable();
    renderAnalysis();

    // Update header
    var proj = M().getProject();
    document.getElementById("project-name").textContent = proj.User_label || "Untitled Project";
    document.getElementById("project-date").textContent = proj.Analysis_Date || "";
  };

  return {
    drawPipeline: drawPipeline,
    showNodeDetail: showNodeDetail,
    showPipelineSummary: showPipelineSummary,
    renderNodesTable: renderNodesTable,
    renderPlayersTable: renderPlayersTable,
    renderAnalysis: renderAnalysis,
    refreshAll: refreshAll,
    probColor: probColor,
    probClass: probClass
  };
})();
