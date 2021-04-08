"use strict";

// Professor Kernighan's hotiron code
function hotiron(x, xmin, xmax) {
  let r, g, b;
  let h = (x - xmin) / (xmax - xmin);
  h = Math.floor(100 * h + 0.5);
  if (h < 0)
    h = 0;
  if (h <= 33.3333) {
    r = Math.floor(h * 255 / 33.333); g = b = 0;
  } else if (h <= 66.6667) {
    r = 255; g = Math.floor((h - 33.3333)*255 / 33.3333); b = 0;
  } else if (h <= 100) {
    r = g = 255; b = Math.floor((h - 66.6667)*255 / 33.3333);
  } else {
    r = g = b = 255;
  }
  return "rgb("+r+", "+g+", "+b+")";
}

// Return the local path to the image pointer. Uses global var `config`
function ptr_to_url(ptr) {
  return `data/imgs/${ptr}.${config["imgs-fmt"]}`;
}

let pad = (n, m, pre) => ("" + n).padStart(m, pre); // pads n to width m with pre

// Convert from (x,y) to row, col, index, and pointer subrange
// Reference: https://stackoverflow.com/a/17130415
function row_of_y(canvas, cell_len, cells_per_row, extra_margin, y) {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  let y2 = (y - rect.top - window.scrollY - extra_margin) * scaleY;
  if (y2 < 0) {
    y2 = 0;
  } else if (y2 > cells_per_row * cell_len - 0.5) {
    y2 = cells_per_row * cell_len - 0.5;
  }
  return Math.floor(y2 / cell_len);
}
function col_of_x(canvas, cell_len, cells_per_row, extra_margin, x) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  let x2 = (x - rect.left - window.scrollX - extra_margin) * scaleX;
  if (x2 < 0) {
    x2 = 0;
  } else if (x2 > cells_per_row * cell_len - 0.5) {
    x2 = cells_per_row * cell_len - 0.5;
  }
  return Math.floor(x2 / cell_len);
}
function coor_of_event(canvas, cl, cpr, em, event) {
  let r = row_of_y(canvas, cl, cpr, em, event.pageY);
  let c = col_of_x(canvas, cl, cpr, em, event.pageX);
  return [r, c];
}
function index_of_event(canvas, cl, cpr, em, event) {
  let [r, c] = coor_of_event(canvas, cl, cpr, em, event);
  let fc = (r, c) => (c + r * cpr);
  let i = fc(r, c); // flatten coordinates
  return i;
}
// With an x,y mouse event, extract the first and last element in range of length
// within the range indicated by cl (cell_len), cpr (cells_per_row),
// per_cell, and em (extra_margin).
function range_of_event(length, canvas, cl, cpr, per_cell, em, event) {
  let i = index_of_event(canvas, cl, cpr, em, event);
  let fst = i * per_cell;
  if (fst >= length) {
    fst = length - 1;
  }
  let lst = (i+1) * per_cell - 1;
  if (lst >= length) {
    lst = length - 1;
  }
  return [fst, lst];
}

// Returns range containing ptr as well as useful calculations for rendering
function index_to_range(i) {
  let [fst, lst] = [0, ptrs.length-1];
  let n_cells = max_n_cells, length = 1, per_cell, cells_per_row = 1;
  per_cell = lst - fst + 1; // inits length start of loop
  while (per_cell > 1) {
    length = per_cell;
    per_cell = Math.ceil(length / n_cells);
    n_cells = Math.ceil(length / per_cell);
    cells_per_row = Math.ceil(Math.sqrt(n_cells));
  }
  // Calculate appropriate fst, lst:
  let j = Math.floor(i / length);
  let first = j*length;
  let last = Math.min((j+1)*length-1, ptrs.length-1);
  let [row, col] = [Math.floor(i%n_cells/cells_per_row), i%n_cells%cells_per_row];

  // Final page of results needs special treatment for highlighting
  if (i >= Math.floor(ptrs.length / n_cells)*n_cells) {
    first = Math.floor(ptrs.length / n_cells)*n_cells;
    last = ptrs.length-1;
    length = last - first + 1;
    per_cell = Math.ceil(length / length);
    cells_per_row = Math.ceil(Math.sqrt(length));
    [row, col] = [Math.floor((i - first)/cells_per_row), (i - first)%cells_per_row];
  }

  const cell_len = Math.floor(grid_len / cells_per_row);
  let side_len = cell_len - margin_len*2; // since per_cell == 1
  const extra_margin = grid_len - (cell_len * cells_per_row);
  const em = Math.floor(extra_margin / 2);

  return [first, last, cells_per_row, cell_len, em, side_len, row, col];
}

function draw_grid(n_cells, fst, lst, skip_img=false) {
  zoom_lock += 1;
  let _zoom_lock = zoom_lock;

  if (n_cells > max_n_cells) {
    n_cells = max_n_cells;
  }
  let length = lst - fst + 1;
  let per_cell = Math.ceil(length / n_cells);
  n_cells = Math.ceil(length / per_cell);
  let cells_per_row = Math.ceil(Math.sqrt(n_cells));
  //let unused_cells = cells_per_row*cells_per_row - n_cells; // Unused
  const cell_len = Math.floor(grid_len / cells_per_row);
  let side_len = cell_len - margin_len;
  if (per_cell == 1) {
    side_len = cell_len - margin_len*2;
  }

  const extra_margin = grid_len - (cell_len * cells_per_row);
  const em = Math.floor(extra_margin / 2);

  let fc = (r, c) => (c + r * cells_per_row); // flatten coordinates

  // save params
  context.n_cells = n_cells;
  context.fst = fst;
  context.lst = lst;

  context.fillStyle = background;
  if (!skip_img) {
    context.fillRect(0, 0, grid_len, grid_len);
  }
  for (let i = 0; i < cells_per_row; i += 1) {
    for (let j = 0; j < cells_per_row && fc(i, j) < n_cells; j += 1) {
      let key = "" + fc(i, j) + "_" + per_cell;
      let index = fc(i, j)*cells_per_row;
      let ws = weights.slice(fst + fc(i, j)*per_cell, fst + (fc(i, j) + 1)*per_cell);
      let avgw = ws.reduce((a, w) => a + parseFloat(w), 0) / ws.length;
      let color = hotiron(avgw, wmin, wmax);
      const strip_width = 5;
      if (per_cell == 1) {
        // draw image on each cell
        let img = new Image;
        img.onload = () => {
          if (zoom_lock != _zoom_lock) { return; }
          let s = Math.min(img.width, img.height);
          context.fillStyle = color;
          context.fillRect(em + j*cell_len, em + i*cell_len, strip_width, side_len);
          context.drawImage(img, 0, 0, s, s,
                            em + j*cell_len + strip_width + margin_len,
                            em + i*cell_len, side_len - strip_width - margin_len, side_len);
        };
        if (skip_img) {
          // Draw color strip beside image
          let s = Math.min(img.width, img.height);
          context.fillStyle = color;
          context.fillRect(em + j*cell_len, em + i*cell_len, strip_width, side_len);
        } else {
          img.src = ptr_to_url(ptrs[fst + fc(i, j)]);
        }
      } else {
        context.fillStyle = color;
        context.fillRect(em + j*cell_len, em + i*cell_len, side_len, side_len);
      }
    }
  }

  if (skip_img) {
    return; // Finished with the metric color update. Prevents adding event listeners below
  }

  e_ptr.innerHTML = `${ptrs[fst]} to ${ptrs[lst]}`;
  e_nimgs.innerHTML = length;

  function hover(event) {
    let [row, col] = coor_of_event(e_canvas, cell_len, cells_per_row, em, event);
    let index = index_of_event(e_canvas, cell_len, cells_per_row, em, event);
    e_row.innerHTML = pad(row, 2, "0");
    e_col.innerHTML = pad(col, 2, "0");
    e_index.innerHTML = pad(index, 4, "0");

    let [_fst, _lst] = range_of_event(length, e_canvas, cell_len, cells_per_row, per_cell, em, event);
    let dst = _lst - _fst + 1;
    if (dst > 1) {
      e_ptr_hover.innerHTML = `${ptrs[fst + _fst]} to ${ptrs[fst + _lst]}`;
      let ws = weights.slice(fst + _fst, fst + _lst + 1);
      let avgw = ws.reduce((a, w) => a + parseFloat(w), 0) / ws.length;
      e_val_hover.innerHTML = avgw.toFixed(2); // Avg is calculated every hover!
    } else {
      e_ptr_hover.innerHTML = `${ptrs[fst + _fst]}`;
      e_val_hover.innerHTML = weights[fst + _fst];
    }
    e_val_hover_lbl.innerHTML = metric_name;
  }

  function select(event) {
    let [row, col] = coor_of_event(e_canvas, cell_len, cells_per_row, em, event);
    let index = index_of_event(e_canvas, cell_len, cells_per_row, em, event);
    let [_fst, _lst] = range_of_event(length, e_canvas, cell_len, cells_per_row, per_cell, em, event);
    let dst = _lst - _fst + 1;

    if (dst > 1) {
      // unregister previous handlers
      e_canvas.removeEventListener('click', select, false);
      e_canvas.removeEventListener('mousemove', hover, false);
      /* Launch new grid */
      e_back_button.style.display = "block";
      let peek = zoom_stack[zoom_stack.length-1];
      if (peek == undefined || peek[0] != n_cells || peek[1][0] != row || peek[1][1] != col || peek [2][0] != fst || peek[2][0] != lst) { // Only redraw if different
        zoom_stack.push([n_cells, [row, col], [fst, lst]]);
        draw_grid(per_cell, _fst, _lst);
      }
    } else {
      // Draw outline around image
      remove_last_outline();
      draw_outline(highlight, row, col, cell_len, em, side_len); // Add new
      remove_last_outline = function() {
        draw_outline(background, row, col, cell_len, em, side_len); // Remove
      }

      load_image(fst + _fst);

      // Change the URL to reflect the latest image
      let sanitized_metric = metric_name.toLowerCase().replace(/ /g,'');
      window.history.pushState(0, document.title, `?ptr=${ptrs[fst+_fst]}&metric=${sanitized_metric}`);
    }
  }

  function highlight_square(row, col) {
    let bw = 1; // border width
    context.fillStyle = highlight;
    context.fillRect(em + col*cell_len + bw/2,
                     em + row*cell_len + bw/2,
                     side_len - bw, side_len - bw);
  }

  e_canvas.addEventListener('click', select, false);
  e_canvas.addEventListener('mousemove', hover, false);

  e_canvas.hover = hover;
  e_canvas.select = select;
  e_canvas.highlight_square = highlight_square;
}

let remove_last_outline = function() {}; // Removes outline around selected img

function draw_outline(color, row, col, cell_len, em, side_len) {
  let m = margin_len;
  context.fillStyle = color; // fillRect order: left, top, right, bottom
  context.fillRect(em+col*cell_len-m*2, em+row*cell_len-m*2, m*2, side_len+m*2);
  context.fillRect(em+col*cell_len-m*2, em+row*cell_len-m*2, side_len+m*4, m*2);
  context.fillRect(em+col*cell_len+side_len, em+row*cell_len, m*2, side_len+m*2);
  context.fillRect(em+col*cell_len-m*2, em+row*cell_len+side_len, side_len+m*4, m*2);
}
