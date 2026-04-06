/**
 * pf.ui.js -- UI controller for PolicyMaker Formal.
 *
 * Handles navigation, dialogs, import/export, and event wiring.
 */

var PF = PF || {};

PF.UI = (function () {
  "use strict";

  var M = function () { return PF.Model; };

  // ── Navigation ─────────────────────────────────────────────────
  var switchView = function (viewName) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
    document.querySelectorAll(".nav-item").forEach(function (n) { n.classList.remove("active"); });

    var view = document.getElementById("view-" + viewName);
    if (view) view.classList.add("active");

    var nav = document.querySelector('.nav-item[data-view="' + viewName + '"]');
    if (nav) nav.classList.add("active");

    // Refresh data when switching to a data view
    if (viewName === "pipeline") {
      PF.Vis.drawPipeline("pipeline-svg-container", PF.Vis.showNodeDetail);
      PF.Vis.showPipelineSummary();
    } else if (viewName === "nodes") {
      PF.Vis.renderNodesTable();
    } else if (viewName === "players") {
      PF.Vis.renderPlayersTable();
    } else if (viewName === "analysis") {
      PF.Vis.renderAnalysis();
    }
  };

  // ── Import PM5 JSON ────────────────────────────────────────────
  var handleImport = function () {
    document.getElementById("file-input").click();
  };

  var onFileSelected = function (event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        M().importPM5(data);
        PF.Vis.refreshAll();
        switchView("pipeline");
      } catch (err) {
        alert("Error parsing JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ""; // reset for re-import
  };

  // ── Export enriched JSON ───────────────────────────────────────
  var handleExport = function () {
    var json = M().exportJSON();
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    var proj = M().getProject();
    a.download = (proj.User_label || "policymaker-formal").replace(/\s+/g, "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Load demo ──────────────────────────────────────────────────
  var loadDemo = function () {
    M().importPM5(PF.DemoProject);
    PF.Vis.refreshAll();
    switchView("pipeline");
  };

  // ── Node editor dialog ─────────────────────────────────────────
  var _editingNodeId = null;

  var openNodeDialog = function (nodeId) {
    _editingNodeId = nodeId || null;
    var dialog = document.getElementById("node-dialog");
    var form = document.getElementById("node-form");
    var title = document.getElementById("node-dialog-title");

    // Populate gate-control player dropdown
    var gateSelect = form.querySelector('[name="gate_control_player_id"]');
    gateSelect.innerHTML = '<option value="">None</option>';
    M().getPlayers().forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.Player_ID || p.id;
      opt.textContent = p.Player_name || p.Player_abbrev;
      gateSelect.appendChild(opt);
    });

    if (nodeId) {
      title.textContent = "Edit Node";
      var node = M().getNode(nodeId);
      if (node) {
        form.name.value = node.name || "";
        form.branch.value = node.branch || "legislative";
        form.level.value = node.level || "national";
        form.decision_rule.value = node.decision_rule || "majority";
        form.threshold.value = node.threshold || 0.5;
        form.veto_type.value = node.veto_type || "none";
        form.amendment_power.checked = !!node.amendment_power;
        form.sequence_order.value = node.sequence_order || 1;
        form.parallel_group.value = node.parallel_group || "";
        form.gate_control_player_id.value = node.gate_control_player_id || "";
      }
    } else {
      title.textContent = "Add Node";
      form.reset();
      form.threshold.value = 0.5;
      form.sequence_order.value = M().getNodesSorted().length + 1;
    }

    dialog.style.display = "flex";
  };

  var closeNodeDialog = function () {
    document.getElementById("node-dialog").style.display = "none";
    _editingNodeId = null;
  };

  var saveNodeForm = function (event) {
    event.preventDefault();
    var form = document.getElementById("node-form");
    var fields = {
      name: form.name.value,
      branch: form.branch.value,
      level: form.level.value,
      decision_rule: form.decision_rule.value,
      threshold: parseFloat(form.threshold.value) || 0.5,
      veto_type: form.veto_type.value,
      amendment_power: form.amendment_power.checked,
      sequence_order: parseInt(form.sequence_order.value) || 1,
      parallel_group: form.parallel_group.value || null,
      gate_control_player_id: form.gate_control_player_id.value ?
        parseInt(form.gate_control_player_id.value) : null
    };

    if (_editingNodeId) {
      M().updateNode(_editingNodeId, fields);
    } else {
      M().addNode(fields);
    }

    closeNodeDialog();
    PF.Vis.refreshAll();
  };

  // ── Player-Node assignment dialog ──────────────────────────────
  var _assignNodeId = null;

  var openAssignDialog = function (nodeId) {
    _assignNodeId = nodeId;
    var dialog = document.getElementById("assign-dialog");
    var node = M().getNode(nodeId);
    document.getElementById("assign-node-name").textContent = node ? node.name : "";

    var list = document.getElementById("assign-player-list");
    list.innerHTML = "";

    var currentAssignments = {};
    M().getNodePlayers(nodeId).forEach(function (np) {
      if (np.player) {
        currentAssignments[np.player.Player_ID || np.player.id] = np.assignment;
      }
    });

    M().getPlayers().forEach(function (p) {
      if (!p.Include && p.Include !== undefined) return;
      var pid = p.Player_ID || p.id;
      var assignment = currentAssignments[pid];
      var isAssigned = !!assignment;
      var role = assignment ? assignment.role : "voter";
      var cls = M().stanceClass(p.Position_rating);

      var row = document.createElement("div");
      row.className = "assign-row";
      row.innerHTML =
        '<label><input type="checkbox" data-pid="' + pid + '"' +
        (isAssigned ? " checked" : "") + '></label>' +
        '<span class="player-name">' + (p.Player_name || p.Player_abbrev) + '</span>' +
        '<span class="player-stance stance-' + cls + '">' + M().stanceLabel(p.Position_rating) + '</span>' +
        '<select data-pid-role="' + pid + '">' +
        '<option value="voter"' + (role === "voter" ? " selected" : "") + '>Voter</option>' +
        '<option value="chair"' + (role === "chair" ? " selected" : "") + '>Chair</option>' +
        '<option value="veto_holder"' + (role === "veto_holder" ? " selected" : "") + '>Veto holder</option>' +
        '<option value="agenda_setter"' + (role === "agenda_setter" ? " selected" : "") + '>Agenda setter</option>' +
        '<option value="implementer"' + (role === "implementer" ? " selected" : "") + '>Implementer</option>' +
        '</select>';
      list.appendChild(row);
    });

    dialog.style.display = "flex";
  };

  var closeAssignDialog = function () {
    document.getElementById("assign-dialog").style.display = "none";
    _assignNodeId = null;
  };

  var saveAssignments = function () {
    if (!_assignNodeId) return;

    // Remove all current assignments for this node
    PF.Model.MODEL.NodePlayer = PF.Model.MODEL.NodePlayer.filter(function (np) {
      return np.node_id !== _assignNodeId;
    });

    // Add checked players
    var checkboxes = document.querySelectorAll('#assign-player-list input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
      if (cb.checked) {
        var pid = parseInt(cb.getAttribute("data-pid"));
        var roleSelect = document.querySelector('select[data-pid-role="' + pid + '"]');
        var role = roleSelect ? roleSelect.value : "voter";
        M().assignPlayer(_assignNodeId, pid, role, 1.0);
      }
    });

    closeAssignDialog();
    PF.Vis.refreshAll();
  };

  // ── Wire up events ─────────────────────────────────────────────
  var init = function () {
    // Nav
    document.querySelectorAll(".nav-item").forEach(function (item) {
      item.addEventListener("click", function () {
        switchView(this.getAttribute("data-view"));
      });
    });

    // Toolbar
    document.getElementById("btn-import").addEventListener("click", handleImport);
    document.getElementById("btn-export").addEventListener("click", handleExport);
    document.getElementById("btn-demo").addEventListener("click", loadDemo);
    document.getElementById("file-input").addEventListener("change", onFileSelected);

    // Reset layout
    document.getElementById("btn-reset-layout").addEventListener("click", function () {
      M().getNodesSorted().forEach(function (n) {
        delete n.x_pos;
        delete n.y_pos;
      });
      PF.Vis.drawPipeline("pipeline-svg-container", PF.Vis.showNodeDetail);
      PF.Vis.showPipelineSummary();
    });

    // Node dialog
    document.getElementById("btn-add-node").addEventListener("click", function () { openNodeDialog(null); });
    document.getElementById("btn-cancel-node").addEventListener("click", closeNodeDialog);
    document.getElementById("node-form").addEventListener("submit", saveNodeForm);

    // Assign dialog
    document.getElementById("btn-cancel-assign").addEventListener("click", closeAssignDialog);
    document.getElementById("btn-save-assign").addEventListener("click", saveAssignments);

    // Close dialogs on overlay click
    document.querySelectorAll(".dialog-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          overlay.style.display = "none";
        }
      });
    });
  };

  return {
    init: init,
    switchView: switchView,
    loadDemo: loadDemo,
    openNodeDialog: openNodeDialog,
    openAssignDialog: openAssignDialog
  };
})();
