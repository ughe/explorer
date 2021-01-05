"use strict";

// Constants
const n_cells = 1936;
const max_cells_per_row = 250;
const margin_len = 1; // cell margin
// Colors
const highlight = "#DEADBE";
const cer_range = [0.0, 1.0];
const dur_range = [0, 12 * 1000];

// Datafile global vars
let config = {}, ptrs;
let metrics = {}, metric_ranges = {};

// Global vars
let metric, weights, wmin, wmax, metric_name;
let zoom_lock = 0; // Used to stop rendering on zoom change
let zoom_stack = [];

// Bind html elements
let e_canvas = document.getElementById("grid");
let context = e_canvas.getContext("2d");
let grid_len = Math.min(window.innerWidth / 2, window.innerHeight - 53*3);
e_canvas.width = grid_len;
e_canvas.height = grid_len;
// canvas toolbar element
let e_back_button = document.getElementById("back-button");
let e_ptr = document.getElementById("ptr");
let e_nimgs = document.getElementById("nimgs");
let e_metric = document.getElementById("metric");
// canvas .toolbar-mini elements
let e_row = document.getElementById("row");
let e_col = document.getElementById("col");
let e_index = document.getElementById("index");
let e_ptr_hover = document.getElementById("ptr-hover");
let e_val_hover = document.getElementById("val-hover");
let e_val_hover_lbl = document.getElementById("val-hover-lbl");
// img elements
let e_img = document.getElementById("preview-img");
let e_img_ptr = document.getElementById("img-ptr");
let e_img_index = document.getElementById("img-index");
let e_img_val = document.getElementById("img-val");
let e_img_val_lbl = document.getElementById("img-val-lbl");
// results table and transcription panes
let e_table = document.getElementById("results-table");
let e_transcriptions = {};
let e_dashboard = document.getElementById("dashboard");
// transcriptions
let e_human_trans = document.getElementById("human-trans");
let e_aws_trans = document.getElementById("aws-trans");
let e_azu_trans = document.getElementById("azu-trans");
let e_gcp_trans = document.getElementById("gcp-trans");
let e_aws_cer = document.getElementById("aws-cer");
let e_azu_cer = document.getElementById("azu-cer");
let e_gcp_cer = document.getElementById("gcp-cer");

// Load the datafiles (more global vars)
let set_weights = (m) => {
  if (m in metrics) {
    weights = metrics[m];
    wmin = metric_ranges[m][0];
    wmax = metric_ranges[m][1];
    metric_name = m;
  } else {
    console.warn("Invalid #metric", m);
  }
}

function set_metric(event) {
  set_weights(event.value);
  draw_grid(context.n_cells, context.fst, context.lst, true);
}

function back(event) {
  let select = e_canvas.select;
  let hover = e_canvas.hover;
  let redraw = e_canvas.redraw;
  e_canvas.removeEventListener('click', select, false);
  e_canvas.removeEventListener('mousemove', hover, false);
  let n_cells, row, col, fst, lst;
  [n_cells, [row, col], [fst, lst]] = zoom_stack.pop();

  // Remove button if stack is empty
  if (zoom_stack.length == 0) {
    e_back_button.style.display = "none";
  }

  draw_grid(n_cells, fst, lst)

  // Draw cell on grid
  e_canvas.highlight_square(row, col);
}
e_back_button.addEventListener('click', back, false);

// main function
(async () => {
  let conf, results;
  [conf, results] = await Promise.all([
    fetch('data/config.csv').then(r => r.text()).then(t => t.trim().split("\n").map(x => x.split(","))),
    fetch('data/results.csv').then(r => r.text()).then(t => t.trim().split("\n").map(x => x.split(","))),
  ]);

  // Handle the configuration file. Two keys are mandatory: imgs-fmt and txts-dirs
  for (let i = 0; i < conf.length; i++) {
    let key = conf[i][0], val = conf[i][1];
    config[key] = val;
  }
  config["txts-dirs"] = config["txts-dirs"].split(";");
  if ("title" in config) {
    document.title = config["title"];
    document.getElementById("title").innerHTML = config["title"];
  }
  if ("code" in config) {
    let button = document.createElement("a");
    button.className = "button";
    button.innerHTML = "Code";
    button.href = config["code"];
    document.getElementById("links").prepend(button);
  }
  if ("license" in config) {
    let button = document.createElement("a");
    button.className = "button";
    button.innerHTML = "License";
    button.href = config["license"];
    document.getElementById("links").appendChild(button);
  }

  // Handle the results file
  ptrs = results[0].slice(1);
  for (let i = 1; i < results.length; i++) {
    let m = results[i][0];
    metrics[m] = results[i].slice(1).map(x => parseFloat(x));
    // Calculate min and max for each metric
    let min = metrics[m][0], max = metrics[m][0];
    for (let j = 1; j < metrics[m].length; j++) {
      let jv = metrics[m][j];
      if (jv < min) {
        min = jv;
      } else if (jv > max) {
        max = jv;
      }
    }
    metric_ranges[results[i][0]] = [min, max];
  }

  metrics["Index"] = [...Array(ptrs.length).keys()];
  metric_ranges["Index"] = [0, ptrs.length-1];

  // Initialize metrics
  let selector = document.getElementById("metric");
  for (const m of Object.keys(metrics)) {
    let option = document.createElement("option");
    option.value = m;
    option.innerHTML = m;
    selector.appendChild(option);
  }

  // Initialize transcription panes
  for (const dir of config["txts-dirs"]) {
    let div = document.createElement("div");
    div.className = "pane";
    let toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    let title = document.createElement("div");
    title.innerHTML = dir + " Transcription";
    toolbar.appendChild(title);
    div.appendChild(toolbar);
    let e_transcript = document.createElement("div");
    e_transcript.className = "transcription";
    div.appendChild(e_transcript);
    e_dashboard.appendChild(div);
    e_transcriptions[dir] = e_transcript;
  }

  metric_name = Object.keys(metrics)[0];
  set_weights(metric_name);
  draw_grid(n_cells, 0, ptrs.length - 1);
})();

