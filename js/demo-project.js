/**
 * demo-project.js -- Clinton Health Security Act (1993-94) demo.
 *
 * Contains PM5-format player/strategy data AND the institutional
 * pathway through the 103rd Congress.
 */

var PF = PF || {};

PF.DemoProject = {
  // ────────────────────────────────────────────────────────────────
  // PM5-compatible tables
  // ────────────────────────────────────────────────────────────────

  Project: [{
    Project_ID: 1,
    User_label: "Clinton Health Security Act (1993-94)",
    System_label: "demo",
    Analyst: "PolicyMaker Formal Demo",
    Client: "",
    Analysis_Date: "1993-09-01",
    Policy_Date: "1993-09-22",
    notTheExampleProject: false,
    id: 1
  }],

  Player: [
    {
      Player_ID: 1, Player_name: "President Clinton", Player_abbrev: "POTUS",
      Position_rating: 1, Power_rating: 7, Support_vs_opposition: 1,
      Sector: "Governmental", Level: "National",
      Player_obstacle: "Declining approval; divided focus (NAFTA, Somalia)",
      Player_opportunity: "Bully pulpit; strong public mandate on health",
      Org_or_indiv: 2, Include: true, id: 1
    },
    {
      Player_ID: 2, Player_name: "Hillary Clinton / Task Force", Player_abbrev: "HRC",
      Position_rating: 1, Power_rating: 5, Support_vs_opposition: 1,
      Sector: "Governmental", Level: "National",
      Player_obstacle: "Task force secrecy backlash; complexity of plan",
      Player_opportunity: "Direct White House channel; high-profile advocate",
      Org_or_indiv: 2, Include: true, id: 2
    },
    {
      Player_ID: 3, Player_name: "Congressional Democrats", Player_abbrev: "DEM",
      Position_rating: 2, Power_rating: 6, Support_vs_opposition: 1,
      Sector: "Political", Level: "National",
      Player_obstacle: "Multiple competing bills; regional differences",
      Player_opportunity: "Majorities in both chambers",
      Org_or_indiv: 1, Include: true, id: 3
    },
    {
      Player_ID: 4, Player_name: "Congressional Republicans", Player_abbrev: "GOP",
      Position_rating: 6, Power_rating: 5, Support_vs_opposition: 2,
      Sector: "Political", Level: "National",
      Player_obstacle: "Internal moderates favor some reform",
      Player_opportunity: "Unified opposition strategy (Kristol memo)",
      Org_or_indiv: 1, Include: true, id: 4
    },
    {
      Player_ID: 5, Player_name: "Sen. Daniel Patrick Moynihan", Player_abbrev: "MOYN",
      Position_rating: 4, Power_rating: 6, Support_vs_opposition: 3,
      Sector: "Political", Level: "National",
      Player_obstacle: "Skeptical of employer mandate; wanted welfare reform first",
      Player_opportunity: "Chair of Senate Finance — controls Senate pathway",
      Org_or_indiv: 2, Include: true, id: 5
    },
    {
      Player_ID: 6, Player_name: "Rep. John Dingell", Player_abbrev: "DING",
      Position_rating: 2, Power_rating: 5, Support_vs_opposition: 1,
      Sector: "Political", Level: "National",
      Player_obstacle: "Energy & Commerce Committee deeply divided",
      Player_opportunity: "Committee chair; family legacy on health reform",
      Org_or_indiv: 2, Include: true, id: 6
    },
    {
      Player_ID: 7, Player_name: "Rep. Dan Rostenkowski", Player_abbrev: "ROST",
      Position_rating: 3, Power_rating: 5, Support_vs_opposition: 1,
      Sector: "Political", Level: "National",
      Player_obstacle: "Indicted on corruption charges mid-process",
      Player_opportunity: "Chair of Ways & Means; experienced dealmaker",
      Org_or_indiv: 2, Include: true, id: 7
    },
    {
      Player_ID: 8, Player_name: "Sen. Bob Dole", Player_abbrev: "DOLE",
      Position_rating: 6, Power_rating: 6, Support_vs_opposition: 2,
      Sector: "Political", Level: "National",
      Player_obstacle: "Initially co-sponsored Chafee alternative",
      Player_opportunity: "Senate Minority Leader; 1996 presidential ambitions drive opposition",
      Org_or_indiv: 2, Include: true, id: 8
    },
    {
      Player_ID: 9, Player_name: "Health Insurance Assn (HIAA)", Player_abbrev: "HIAA",
      Position_rating: 7, Power_rating: 5, Support_vs_opposition: 2,
      Sector: "Commercial", Level: "National",
      Player_obstacle: "",
      Player_opportunity: "'Harry and Louise' ad campaign enormously effective",
      Org_or_indiv: 1, Include: true, id: 9
    },
    {
      Player_ID: 10, Player_name: "American Medical Association", Player_abbrev: "AMA",
      Position_rating: 5, Power_rating: 4, Support_vs_opposition: 2,
      Sector: "Professional", Level: "National",
      Player_obstacle: "Membership divided on employer mandate",
      Player_opportunity: "Credible voice; could shift to support with concessions",
      Org_or_indiv: 1, Include: true, id: 10
    },
    {
      Player_ID: 11, Player_name: "AFL-CIO / Labor Unions", Player_abbrev: "AFL",
      Position_rating: 1, Power_rating: 4, Support_vs_opposition: 1,
      Sector: "Social", Level: "National",
      Player_obstacle: "Some unions prefer single-payer only",
      Player_opportunity: "Strong grassroots mobilization capacity",
      Org_or_indiv: 1, Include: true, id: 11
    },
    {
      Player_ID: 12, Player_name: "AARP", Player_abbrev: "AARP",
      Position_rating: 3, Power_rating: 4, Support_vs_opposition: 1,
      Sector: "Social", Level: "National",
      Player_obstacle: "Cautious; worried about prescription drug coverage gaps",
      Player_opportunity: "35 million members; powerful lobbying arm",
      Org_or_indiv: 1, Include: true, id: 12
    },
    {
      Player_ID: 13, Player_name: "NFIB / Small Business", Player_abbrev: "NFIB",
      Position_rating: 7, Power_rating: 4, Support_vs_opposition: 2,
      Sector: "Commercial", Level: "National",
      Player_obstacle: "",
      Player_opportunity: "Employer mandate existentially threatening; intense lobbying",
      Org_or_indiv: 1, Include: true, id: 13
    },
    {
      Player_ID: 14, Player_name: "Large Employers / Chamber", Player_abbrev: "CHAM",
      Position_rating: 5, Power_rating: 4, Support_vs_opposition: 2,
      Sector: "Commercial", Level: "National",
      Player_obstacle: "Initially open to managed competition",
      Player_opportunity: "Shifted to opposition as details emerged; deep pockets",
      Org_or_indiv: 1, Include: true, id: 14
    },
    {
      Player_ID: 15, Player_name: "General Public", Player_abbrev: "PUB",
      Position_rating: 2, Power_rating: 3, Support_vs_opposition: 1,
      Sector: "Social", Level: "National",
      Player_obstacle: "Support eroded as plan complexity became salient",
      Player_opportunity: "Initial 60%+ support for universal coverage",
      Org_or_indiv: 1, Include: true, id: 15
    },
    {
      Player_ID: 16, Player_name: "Sen. Ted Kennedy", Player_abbrev: "KENN",
      Position_rating: 1, Power_rating: 5, Support_vs_opposition: 1,
      Sector: "Political", Level: "National",
      Player_obstacle: "Preferred single-payer; had to compromise",
      Player_opportunity: "Chair of Senate HELP Committee; lifelong champion",
      Org_or_indiv: 2, Include: true, id: 16
    },
    {
      Player_ID: 17, Player_name: "Pharmaceutical Industry (PhRMA)", Player_abbrev: "PHRM",
      Position_rating: 6, Power_rating: 4, Support_vs_opposition: 2,
      Sector: "Commercial", Level: "National",
      Player_obstacle: "",
      Player_opportunity: "Price control fears; heavy campaign contributions",
      Org_or_indiv: 1, Include: true, id: 17
    },
    {
      Player_ID: 18, Player_name: "Conservative Democrats (Blue Dogs)", Player_abbrev: "BDOG",
      Position_rating: 4, Power_rating: 4, Support_vs_opposition: 3,
      Sector: "Political", Level: "National",
      Player_obstacle: "Employer mandate unpopular in rural districts",
      Player_opportunity: "Needed for majority; could be won with modifications",
      Org_or_indiv: 1, Include: true, id: 18
    }
  ],

  Strategy: [
    {
      Strategy_ID: 1, Strategy_name: "Rally public support via media campaign",
      Problem: "Public support eroding under opposition ads",
      Action: "National speaking tour; counter-ads; town halls",
      Benefit: "Restore public mandate for reform",
      Cost: 0, Timeline: "Oct 1993 - Mar 1994", Pct_Success: 40,
      Implications: "Commits political capital", id: 1
    },
    {
      Strategy_ID: 2, Strategy_name: "Negotiate with moderate Republicans",
      Problem: "Need bipartisan cover in Senate",
      Action: "Offer concessions on employer mandate scope",
      Benefit: "Break filibuster; bipartisan legitimacy",
      Cost: 0, Timeline: "Jan - Jun 1994", Pct_Success: 25,
      Implications: "May lose liberal Democrats", id: 2
    },
    {
      Strategy_ID: 3, Strategy_name: "Pressure committee chairs to advance bill",
      Problem: "Moynihan slow-walking Senate Finance markup",
      Action: "White House lobbying; public pressure on committee schedule",
      Benefit: "Bill reaches Senate floor before recess",
      Cost: 0, Timeline: "Mar - Jul 1994", Pct_Success: 35,
      Implications: "Risk alienating Moynihan further", id: 3
    },
    {
      Strategy_ID: 4, Strategy_name: "Offer small-business exemptions",
      Problem: "NFIB and small business coalition intensely opposed",
      Action: "Exempt firms under 25 employees; phase-in schedule",
      Benefit: "Neutralize most intense opposition bloc",
      Cost: 0, Timeline: "Concurrent with markup", Pct_Success: 30,
      Implications: "Weakens universal coverage claim", id: 4
    },
    {
      Strategy_ID: 5, Strategy_name: "Use reconciliation to bypass filibuster",
      Problem: "Cannot reach 60 votes in Senate",
      Action: "Package health reform as budget reconciliation",
      Benefit: "Only need 51 Senate votes",
      Cost: 0, Timeline: "If normal path fails", Pct_Success: 20,
      Implications: "Procedural controversy; limited policy scope under Byrd rule", id: 5
    }
  ],

  Affected_player: [
    // Strategy 1 (public campaign) affects public opinion and indirectly legislators
    { Affected_player_ID: 1, Strategy_ID: 1, Player_ID: 15, Future_position_rating: 1, id: 1 },
    { Affected_player_ID: 2, Strategy_ID: 1, Player_ID: 18, Future_position_rating: 3, id: 2 },
    // Strategy 2 (negotiate with GOP) might shift some Republicans, risk Dems
    { Affected_player_ID: 3, Strategy_ID: 2, Player_ID: 4, Future_position_rating: 5, id: 3 },
    { Affected_player_ID: 4, Strategy_ID: 2, Player_ID: 3, Future_position_rating: 3, id: 4 },
    // Strategy 3 (pressure chairs) targets Moynihan
    { Affected_player_ID: 5, Strategy_ID: 3, Player_ID: 5, Future_position_rating: 3, id: 5 },
    // Strategy 4 (small biz exemptions) targets NFIB, AMA
    { Affected_player_ID: 6, Strategy_ID: 4, Player_ID: 13, Future_position_rating: 5, id: 6 },
    { Affected_player_ID: 7, Strategy_ID: 4, Player_ID: 10, Future_position_rating: 4, id: 7 },
    // Strategy 5 (reconciliation) -- procedural, doesn't shift player positions
  ],

  Policy_Goal: [
    { Goal_ID: 1, Goal: "Universal health insurance coverage", Indicator: "% uninsured drops to 0", Mechanism: "Employer mandate + individual mandate + subsidies", Rel_priority: 10, id: 1 },
    { Goal_ID: 2, Goal: "Cost containment", Indicator: "Premium growth ≤ CPI", Mechanism: "Managed competition + regional health alliances", Rel_priority: 8, id: 2 },
    { Goal_ID: 3, Goal: "Preserve employer-based system", Indicator: "Employer coverage maintained", Mechanism: "Build on existing employer plans", Rel_priority: 7, id: 3 }
  ],

  Coalition: [],
  Consequences: [],
  Objectives: [],

  // ────────────────────────────────────────────────────────────────
  // PolicyMaker Formal institutional tables
  // ────────────────────────────────────────────────────────────────

  InstitutionalNode: [
    {
      id: 1, node_id: 1,
      name: "House Energy & Commerce Committee",
      branch: "legislative", level: "national",
      decision_rule: "majority", threshold: 0.5,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: 6,  // Dingell
      sequence_order: 1,
      parallel_group: "house_committees"
    },
    {
      id: 2, node_id: 2,
      name: "House Ways & Means Committee",
      branch: "legislative", level: "national",
      decision_rule: "majority", threshold: 0.5,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: 7,  // Rostenkowski
      sequence_order: 1,
      parallel_group: "house_committees"
    },
    {
      id: 3, node_id: 3,
      name: "House Floor Vote",
      branch: "legislative", level: "national",
      decision_rule: "majority", threshold: 0.5,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: null,
      sequence_order: 2,
      parallel_group: null
    },
    {
      id: 4, node_id: 4,
      name: "Senate Finance Committee",
      branch: "legislative", level: "national",
      decision_rule: "majority", threshold: 0.5,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: 5,  // Moynihan
      sequence_order: 1,
      parallel_group: "senate_committees"
    },
    {
      id: 5, node_id: 5,
      name: "Senate HELP Committee",
      branch: "legislative", level: "national",
      decision_rule: "majority", threshold: 0.5,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: 16,  // Kennedy
      sequence_order: 1,
      parallel_group: "senate_committees"
    },
    {
      id: 6, node_id: 6,
      name: "Senate Floor Vote (Cloture)",
      branch: "legislative", level: "national",
      decision_rule: "supermajority", threshold: 0.6,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: null,
      sequence_order: 3,
      parallel_group: null
    },
    {
      id: 7, node_id: 7,
      name: "Conference Committee",
      branch: "legislative", level: "national",
      decision_rule: "majority", threshold: 0.5,
      veto_type: "none", amendment_power: true,
      gate_control_player_id: null,
      sequence_order: 4,
      parallel_group: null
    },
    {
      id: 8, node_id: 8,
      name: "Presidential Signature",
      branch: "executive", level: "national",
      decision_rule: "single_actor", threshold: 0.5,
      veto_type: "absolute", amendment_power: false,
      gate_control_player_id: null,
      sequence_order: 5,
      parallel_group: null
    }
  ],

  NodePlayer: [
    // House Energy & Commerce: Dingell (chair), Dems, GOP, Blue Dogs
    { id: 1, node_id: 1, player_id: 6,  role: "chair",    vote_weight: 1.0, gate_control: true },
    { id: 2, node_id: 1, player_id: 3,  role: "voter",    vote_weight: 1.5, gate_control: false },
    { id: 3, node_id: 1, player_id: 4,  role: "voter",    vote_weight: 1.0, gate_control: false },
    { id: 4, node_id: 1, player_id: 18, role: "voter",    vote_weight: 0.5, gate_control: false },

    // House Ways & Means: Rostenkowski (chair), Dems, GOP
    { id: 5, node_id: 2, player_id: 7,  role: "chair",    vote_weight: 1.0, gate_control: true },
    { id: 6, node_id: 2, player_id: 3,  role: "voter",    vote_weight: 1.5, gate_control: false },
    { id: 7, node_id: 2, player_id: 4,  role: "voter",    vote_weight: 1.0, gate_control: false },

    // House Floor: Dems, GOP, Blue Dogs, influenced by public, NFIB, labor
    { id: 8,  node_id: 3, player_id: 3,  role: "voter",   vote_weight: 2.0, gate_control: false },
    { id: 9,  node_id: 3, player_id: 4,  role: "voter",   vote_weight: 1.5, gate_control: false },
    { id: 10, node_id: 3, player_id: 18, role: "voter",   vote_weight: 0.8, gate_control: false },

    // Senate Finance: Moynihan (chair), Dems, GOP, Dole
    { id: 11, node_id: 4, player_id: 5,  role: "chair",   vote_weight: 1.0, gate_control: true },
    { id: 12, node_id: 4, player_id: 3,  role: "voter",   vote_weight: 1.0, gate_control: false },
    { id: 13, node_id: 4, player_id: 4,  role: "voter",   vote_weight: 1.0, gate_control: false },
    { id: 14, node_id: 4, player_id: 8,  role: "voter",   vote_weight: 0.8, gate_control: false },

    // Senate HELP: Kennedy (chair), Dems, GOP
    { id: 15, node_id: 5, player_id: 16, role: "chair",   vote_weight: 1.0, gate_control: true },
    { id: 16, node_id: 5, player_id: 3,  role: "voter",   vote_weight: 1.2, gate_control: false },
    { id: 17, node_id: 5, player_id: 4,  role: "voter",   vote_weight: 0.8, gate_control: false },

    // Senate Floor (Cloture): need 60 — Dems, GOP, Dole, Blue Dogs, Moynihan
    { id: 18, node_id: 6, player_id: 3,  role: "voter",   vote_weight: 2.0, gate_control: false },
    { id: 19, node_id: 6, player_id: 4,  role: "voter",   vote_weight: 1.8, gate_control: false },
    { id: 20, node_id: 6, player_id: 8,  role: "voter",   vote_weight: 1.0, gate_control: false },
    { id: 21, node_id: 6, player_id: 18, role: "voter",   vote_weight: 0.8, gate_control: false },
    { id: 22, node_id: 6, player_id: 5,  role: "voter",   vote_weight: 0.6, gate_control: false },

    // Conference: Dems, Moynihan, Dingell, Kennedy
    { id: 23, node_id: 7, player_id: 3,  role: "voter",   vote_weight: 1.5, gate_control: false },
    { id: 24, node_id: 7, player_id: 5,  role: "voter",   vote_weight: 1.0, gate_control: false },
    { id: 25, node_id: 7, player_id: 6,  role: "voter",   vote_weight: 1.0, gate_control: false },
    { id: 26, node_id: 7, player_id: 16, role: "voter",   vote_weight: 1.0, gate_control: false },

    // Presidential signature: Clinton
    { id: 27, node_id: 8, player_id: 1,  role: "veto_holder", vote_weight: 1.0, gate_control: false }
  ],

  Edge: [
    // House committees → House Floor
    { id: 1, from_node_id: 1, to_node_id: 3 },  // House E&C → House Floor
    { id: 2, from_node_id: 2, to_node_id: 3 },  // House W&M → House Floor
    // Senate committees → Senate Floor
    { id: 3, from_node_id: 4, to_node_id: 6 },  // Senate Finance → Senate Cloture
    { id: 4, from_node_id: 5, to_node_id: 6 },  // Senate HELP → Senate Cloture
    // Both chambers → Conference
    { id: 5, from_node_id: 3, to_node_id: 7 },  // House Floor → Conference
    { id: 6, from_node_id: 6, to_node_id: 7 },  // Senate Cloture → Conference
    // Conference → President
    { id: 7, from_node_id: 7, to_node_id: 8 }   // Conference → Pres. Signature
  ],

  InstitutionalPath: [
    {
      id: 1,
      name: "Standard Legislative Route (103rd Congress)",
      node_sequence: [1, 2, 3, 4, 5, 6, 7, 8]
    }
  ],

  VetoOverride: [
    { node_id: 8, override_node_id: null, override_threshold: 0.67 }
  ]
};
