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
let head, ptrs, results;
let metrics = {}, metric_ranges = {};

// Global vars
let metric, weights, wmin, wmax;
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
let e_img_ptr = document.getElementById("img-ptr");
/*
let e_img_aws_cer = document.getElementById("img-aws-cer");
let e_img_azu_cer = document.getElementById("img-azu-cer");
let e_img_gcp_cer = document.getElementById("img-gcp-cer");
*/
let e_img_index = document.getElementById("img-index");
/*
let e_img_aws_time = document.getElementById("img-aws-time");
let e_img_azu_time = document.getElementById("img-azu-time");
let e_img_gcp_time = document.getElementById("img-gcp-time");
*/
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
  } else {
    console.warn("Invalid #metric", m);
  }
}

function set_metric(event) {
  set_weights(event.value);
  draw_grid(context.n_cells, context.fst, context.lst);
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

  draw_grid(n_cells, fst, lst);

  // Draw cell on grid
  e_canvas.highlight_square(row, col);
}
e_back_button.addEventListener('click', back, false);

// main function
(async () => {
  [head, results] = await Promise.all([
    fetch('data/head.csv').then(r => r.text()).then(t => t.trim().split("\n").map(x => x.split(","))),
    fetch('data/results.csv').then(r => r.text()).then(t => t.trim().split("\n").map(x => x.split(","))),
  ]);
  ptrs = results[0].slice(1);

  // Expects results to already be in row-order. No need to transpose
  // Transpose from https://stackoverflow.com/a/17428705
  // let transpose = (x) => x[0].map((_, coli) => x.map(row => row[coli]));

  for (let i = 1; i < results.length; i++) {
    metrics[results[i][0]] = results[i].slice(1).map(x => parseFloat(x));
    metric_ranges[results[i][0]] = [Math.min(...metrics[results[i][0]]), Math.max(...metrics[results[i][0]])];
  }

  metrics["Index"] = [...Array(ptrs.length).keys()];
  metric_ranges["Index"] = [0, ptrs.length-1];

  set_weights(Object.keys(metrics)[0]);
  draw_grid(n_cells, 0, ptrs.length - 1);
})();

