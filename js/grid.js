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

function ptr_to_url(ptr) {
  return `/data/imgs/${ptr}.${config["imgs-fmt"]}`;
}

let pad = (n, m, pre) => ("" + n).padStart(m, pre); // helper for padding text

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
  if (i >= n_cells) {
    i = n_cells - 1;
  }
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

function draw_grid(n_cells, fst, lst, skip_img=false) {
  let length = lst - fst + 1;
  let per_cell = Math.ceil(length / n_cells);
  n_cells = Math.ceil(length / per_cell);
  const cells_per_row = Math.ceil(Math.sqrt(n_cells));
  let unused_cells = cells_per_row*cells_per_row - n_cells;
  const cell_len = Math.floor(grid_len / cells_per_row);
  let side_len = cell_len - margin_len;
  if (per_cell == 1) {
    side_len = cell_len - margin_len*2;
  }

  const extra_margin = grid_len - (cell_len * cells_per_row);
  const em = Math.floor(extra_margin / 2);

  let fc = (r, c) => (c + r * cells_per_row);

  // save params
  context.n_cells = n_cells;
  context.fst = fst;
  context.lst = lst;

  context.fillStyle = highlight;
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
          let s = Math.min(img.width, img.height);
          context.fillStyle = color;
          context.fillRect(em + j*cell_len, em + i*cell_len, strip_width, side_len);
          context.drawImage(img, 0, 0, s, s,
                            em + j*cell_len + strip_width + margin_len,
                            em + i*cell_len, side_len - strip_width - margin_len, side_len);
        };
        if (!skip_img) {
          img.src = ptr_to_url(ptrs[fst + fc(i, j)]);
        } else {
          let s = Math.min(img.width, img.height);
          context.fillStyle = color;
          context.fillRect(em + j*cell_len, em + i*cell_len, strip_width, side_len);
        }
      } else {
        context.fillStyle = color;
        context.fillRect(em + j*cell_len, em + i*cell_len, side_len, side_len);
      }
    }
  }

  e_ptr.innerHTML = `${ptrs[fst]} to ${ptrs[lst]}`;
  e_nimgs.innerHTML = length;

  function hover(event) {
    let [row, col] = coor_of_event(e_canvas, cell_len, cells_per_row, em, event);
    let index = index_of_event(e_canvas, cell_len, cells_per_row, em, event);
    e_row.innerHTML = pad(row, 4, "0");
    e_col.innerHTML = pad(col, 4, "0");
    e_index.innerHTML = pad(index, 4, "0");

    let [_fst, _lst] = range_of_event(length, e_canvas, cell_len, cells_per_row, per_cell, em, event);
    let dst = _lst - _fst + 1;
    if (dst > 1) {
      e_ptr_hover.innerHTML = `${ptrs[fst + _fst]} to ${ptrs[fst + _lst]}`;
    } else {
      e_ptr_hover.innerHTML = `${ptrs[fst + _fst]}`;
    }
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
      zoom_stack.push([n_cells, [row, col], [fst, lst]]);
      draw_grid(per_cell, _fst, _lst);
    } else {
      /* Open image */
      let ptr = ptrs[fst + _fst];
      let img = document.getElementById("preview-img");
      img.src = ptr_to_url(ptr);
      img.alt = ptr;

      // Display image metadata
      e_img_ptr.innerHTML = ptr;
      e_img_index.innerHTML = fst + _fst;
      e_img_aws_cer.innerHTML = (aws_cer[fst + _fst] * 100).toFixed(2) + "%";
      e_img_aws_cer.style.borderColor = hotiron(aws_cer[fst + _fst], wmin, wmax);
      e_img_azu_cer.innerHTML = (azu_cer[fst + _fst] * 100).toFixed(2) + "%";
      e_img_azu_cer.style.borderColor = hotiron(azu_cer[fst + _fst], wmin, wmax);
      e_img_gcp_cer.innerHTML = (gcp_cer[fst + _fst] * 100).toFixed(2) + "%";
      e_img_gcp_cer.style.borderColor = hotiron(gcp_cer[fst + _fst], wmin, wmax);

      e_img_aws_time.innerHTML = aws_dur[fst + _fst] / 1000;
      e_img_aws_time.style.borderColor = hotiron(aws_dur[fst + _fst] / 1000, wmin, wmax);
      e_img_azu_time.innerHTML = azu_dur[fst + _fst] / 1000;
      e_img_azu_time.style.borderColor = hotiron(azu_dur[fst + _fst] / 1000, wmin, wmax);
      e_img_gcp_time.innerHTML = gcp_dur[fst + _fst] / 1000;
      e_img_gcp_time.style.borderColor = hotiron(gcp_dur[fst + _fst] / 1000, wmin, wmax);

      fetch("data/explorer/human-transcription/" + pre + "/" + ptr + ".txt")
        .then(response => response.text())
        .then(text => e_human_trans.innerHTML = text.split("\n").join("<br><br>"));
      fetch("data/explorer/plaintext-ocr/" + pre + "/" + ptr + ".aws.txt")
        .then(response => response.text())
        .then(text => e_aws_trans.innerHTML = text.split("\n").join("<br><br>"));
      fetch("data/explorer/plaintext-ocr/" + pre + "/" + ptr + ".azure.txt")
        .then(response => response.text())
        .then(text => e_azu_trans.innerHTML = text.split("\n").join("<br><br>"));
      fetch("data/explorer/plaintext-ocr/" + pre + "/" + ptr + ".gcp.txt")
        .then(response => response.text())
        .then(text => e_gcp_trans.innerHTML = text.split("\n").join("<br><br>"));

      e_aws_cer.innerHTML = (aws_cer[fst + _fst] * 100).toFixed(2) + "%";
      e_aws_cer.style.borderColor = hotiron(aws_cer[fst + _fst], wmin, wmax);
      e_azu_cer.innerHTML = (azu_cer[fst + _fst] * 100).toFixed(2) + "%";
      e_azu_cer.style.borderColor = hotiron(azu_cer[fst + _fst], wmin, wmax);
      e_gcp_cer.innerHTML = (gcp_cer[fst + _fst] * 100).toFixed(2) + "%";
      e_gcp_cer.style.borderColor = hotiron(gcp_cer[fst + _fst], wmin, wmax);
    }
  }

  function highlight_square(row, col) {
    let bw = cell_len/3; // border width
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
