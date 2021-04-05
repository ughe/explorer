"use strict";

// Constants
const max_n_cells = 44*44;
const margin_len = 1; // cell margin
// Colors
const background = "#DEADBE";
const highlight = "#66FF00";
const cer_range = [0.0, 1.0];     // 100% CER max
const dur_range = [0, 12 * 1000]; // 12 seconds max

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
// img navigation
let e_left_button = document.getElementById("left-button");
let e_right_button = document.getElementById("right-button");
// results table and transcription panes
let e_table = document.getElementById("results-table");
let e_transcriptions = {};
let e_dashboard = document.getElementById("dashboard");

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

// Given index into ptrs global array, load the main image and transcriptions
function load_image(i) {
  /* Open image */
  let ptr = ptrs[i];
  e_img.src = ptr_to_url(ptr);
  e_img.alt = ptr;

  // Display image metadata
  e_img_ptr.innerHTML = ptr;
  e_img_index.innerHTML = i;
  e_img_val_lbl.innerHTML = metric_name;
  e_img_val.innerHTML = weights[i];
  e_img_val.style.borderColor = hotiron(weights[i], wmin, wmax);
  // Show the results table
  e_table.innerHTML = '';
  for (const m of Object.keys(metrics)) {
    let tr = document.createElement("tr")
    let key = document.createElement("td");
    key.innerHTML = m;
    let val = document.createElement("td");
    val.className = "big-border";
    val.innerHTML = metrics[m][i];
    val.style.borderColor = hotiron(metrics[m][i], metric_ranges[m][0], metric_ranges[m][1]);
    tr.appendChild(key);
    tr.appendChild(val);
    e_table.appendChild(tr);
  }

  for (const dir of config["txts-dirs"]) {
    fetch(`data/txts/${dir}/${ptr}.txt`)
      .then(response => response.text())
      .then(text => e_transcriptions[dir].innerHTML = text.split("\n").join("<br><br>"));
  }
}

// Navigate to the requested image on the dashboard
function nav_image(i, redraw=true) {
  let [fst, lst, cells_per_row, cell_len, em, side_len, row, col] = index_to_range(i);
  let n_cells = lst-fst+1;

  // Make back button return to the original state
  zoom_stack = [];
  e_back_button.style.display = "block";
  let top_per_cell = Math.ceil(ptrs.length / max_n_cells);
  let top_n_cells = Math.ceil(ptrs.length / top_per_cell);
  let top_cells_per_row = Math.ceil(Math.sqrt(top_n_cells));
  let [top_row, top_col] = [Math.floor(i/n_cells/top_cells_per_row), Math.floor(i/n_cells)%top_cells_per_row];
  zoom_stack.push([max_n_cells, [top_row, top_col], [0, ptrs.length-1]]);

  remove_last_outline();
  // Draw the grid itself
  if (redraw == true) {
    draw_grid(n_cells, fst, lst);
  }

  // Draw highlight around selected image
  draw_outline(highlight, row, col, cell_len, em, side_len); // Add new
  remove_last_outline = function() {
    draw_outline(background, row, col, cell_len, em, side_len); // Remove
  }

  // Load the image
  load_image(i);

  // Change the URL to reflect the latest image
  let sanitized_metric = metric_name.toLowerCase().replace(/ /g,'');
  window.history.pushState(0, document.title, `?ptr=${ptrs[i]}&metric=${sanitized_metric}`);
}

function back(event) {
  remove_last_outline = function() {};
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

function flip_page(diff) {
  let i = parseInt(e_img_index.innerHTML), next;
  if (diff != -1 && diff != 1) {
    return; // Only allow flipping 1 page forward or back
  }

  let length = context.lst - context.fst + 1;
  let per_cell = Math.ceil(length / max_n_cells);
  if (per_cell != 1 && !isNaN(i)) {
    return; // Abort page turn if not at 1-page zoom (unless first time)
  }

  if (isNaN(i)) {
    next = context.fst;
    if (next == undefined) {
      next = 0;
    }
  } else {
    next = i + diff;
  }
  if (next < 0 || next >= ptrs.length) {
    return; // No flipping page out of bounds
  }

  // Only redraw if the image is old
  let redraw = isNaN(i) || next < context.fst || next > context.lst; // first time or out of range
  // If the change is more than one, then switch to current view
  if (next < context.fst - 1 || next > context.lst + 1) {
    if (diff == 1) {
      next = context.fst;
    } else {
      next = context.lst;
    }
  }
  nav_image(next, redraw);
}
e_left_button.addEventListener('click', (e) => flip_page(-1), false);
e_right_button.addEventListener('click', (e) => flip_page(1), false);

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
    if (key.substr(0,2) == "[]") {
      if (Array.isArray(config[key])) {
        config[key].push(val);
      } else {
        config[key] = [val];
      }
    } else {
      config[key] = val;
    }
  }
  config["txts-dirs"] = config["txts-dirs"].split(";");
  if ("title" in config) {
    document.title = config["title"];
    document.getElementById("title").innerHTML = config["title"];
  }
  if ("[]links" in config) {
    for (let i = 0; i < config["[]links"].length; i++) {
      let namehref = config["[]links"][i].split(";");
      let button = document.createElement("a");
      button.className = "button";
      button.innerHTML = namehref[0];
      button.href = namehref[1];
      document.getElementById("links").appendChild(button);
    }
  }
  let confnames = [];
  let confrange = [];
  if ("[]range" in config) {
    for (let i = 0; i < config["[]range"].length; i++) {
      let namelohi = config["[]range"][i].split(";");
      confnames.push(namelohi[0].toLowerCase());
      confrange.push([parseFloat(namelohi[1]), parseFloat(namelohi[2])]);
    }
  }

  // Handle the results file
  ptrs = results[0].slice(1);
  for (let i = 1; i < results.length; i++) {
    let m = results[i][0];
    let mlc = m.toLowerCase();
    metrics[m] = results[i].slice(1).map(x => parseFloat(x));
    let found = false;
    for (let j = 0; j < confnames.length; j++) {
      if (mlc.includes(confnames[j])) {
        metric_ranges[m] = confrange[j];
        found = true;
        break;
      }
    }
    if (!found) {
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
      metric_ranges[m] = [min, max];
    }
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

  // Let the routing begin...
  let args = window.location.search.substring(1).split("&").map(x => x.split("="));
  let metric = args.reduce((acc, x) => x.length == 2 && x[0] == "metric" ? x[1] : acc, undefined);
  let [route, arg] = args.reduce((acc, x) => x.length == 2 && ["id", "ptr"].includes(x[0]) ? x : acc, ["", undefined]);

  if (metric != undefined) {
    if (!(metric in metrics)) {
      let keys = Object.keys(metrics);
      let i = keys.map(x => x.toLowerCase().replace(/ /g, '')).indexOf(metric.toLowerCase()); // similar string editing to `sanitized_metric` in grid.js
      if (i != -1) {
        metric = keys[i];
      }
    }
    set_weights(metric);

    // Update the visual selector
    if (metric in metrics) {
      let selector = document.getElementById("metric");
      selector.value = metric;
    }
  }

  if (arg == undefined) {
    route = ""; // Abort navigation on empty arg
  }
  switch (route.toLowerCase()) {
    case 'ptr':
      let i = ptrs.indexOf(arg);
      if (i == -1) {
        console.error(`Expected '${arg}' to be a valid ptr.`)
        break;
      }
      arg = i;
      /* fallthrough */
    case 'id':
      arg = parseInt(arg);
      if (arg < 0 || arg >= ptrs.length) {
        console.error(`Expected 0 <= id < ${ptrs.length}, but id == ${arg}`);
        break;
      }
      nav_image(arg); // Load the grid to the correct image
      return;
  }

  // After all that routing, this is the default alternative:
  draw_grid(max_n_cells, 0, ptrs.length - 1);
})();
