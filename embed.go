package explorer

import _ "embed"

//go:embed index.html
var Index []byte

//go:embed style.css
var Style []byte

//go:embed js/main.js
var Main []byte

//go:embed js/grid.js
var Grid []byte
