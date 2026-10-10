// Quasi-3D rotating render of the `source` face.
// The face silhouette is treated as a flattened ellipsoid (a head): the front
// dome carries the features as recessed grooves, the back dome is plain.
// Points are spun around the Y axis, z-buffered and shaded with a char ramp
// whose brightest glyph is the original 'Æ'.
(function() {
    var RAMP = '.:-=+*#%@Æ';
    var COLORS = ['yellow', 'white'];
    var ASPECT = 2;          // a character cell is ~2x taller than wide
    var SPIN_SECONDS = 10;   // one full revolution
    var FPS = 24;
    var RECESS = 2.5;        // how far the features sink into the face
    var LIGHT = norm([-0.35, -0.4, 1]);
    var STRIDE = 8;          // x, y, z, nx, ny, nz, color, hole

    function norm(v) {
        var l = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / l, v[1] / l, v[2] / l];
    }

    // Per-cell colour, same rule the flat face used: outer, middle and last
    // runs of a row are yellow, the rest white.
    function cellColors(line) {
        var colors = [], re = /(\s+|\S+)/g, segs = [], m;
        while ((m = re.exec(line)) !== null) segs.push(m[0]);
        var n = segs.filter(function(s) { return /\S/.test(s); }).length;
        var mid = Math.floor(n / 2), i = 0;
        segs.forEach(function(s) {
            var isRun = /\S/.test(s);
            var c = (!isRun || n < 4 || i === 0 || i === n - 1 || i === mid) ? 0 : 1;
            if (isRun) i++;
            for (var k = 0; k < s.length; k++) colors.push(c);
        });
        return colors;
    }

    function buildModel(lines) {
        var rows = lines.length;
        var cols = Math.max.apply(null, lines.map(function(l) { return l.length; }));
        var spans = lines.map(function(l) {
            var a = l.search(/\S/);
            return a < 0 ? null : [a, l.replace(/\s+$/, '').length - 1];
        });
        var used = spans.map(function(s, r) { return s ? r : -1; }).filter(function(r) { return r >= 0; });
        var top = used[0], bottom = used[used.length - 1];
        var halfW = 0, sumC = 0;
        used.forEach(function(r) {
            halfW = Math.max(halfW, (spans[r][1] - spans[r][0] + 1) / 2);
            sumC += (spans[r][0] + spans[r][1] + 1) / 2;
        });
        var cx = sumC / used.length, cy = (top + bottom + 1) / 2 * ASPECT;
        var rx = halfW, ry = (bottom - top + 1) / 2 * ASPECT, D = rx * 0.55;

        var pts = [];
        var S = 2;
        for (var r = 0; r < rows; r++) {
            if (!spans[r]) continue;
            var colors = cellColors(lines[r]);
            for (var c = spans[r][0]; c <= spans[r][1]; c++) {
                var hole = lines[r][c] === ' ';
                for (var i = 0; i < S; i++) {
                    for (var j = 0; j < S; j++) {
                        var x = c + (i + 0.5) / S - cx;
                        var y = (r + (j + 0.5) / S) * ASPECT - cy;
                        var q = Math.max(0, 1 - (x * x) / (rx * rx) - (y * y) / (ry * ry));
                        var z = D * Math.sqrt(q);
                        var n = norm([x / (rx * rx), y / (ry * ry), z / (D * D) + 1e-6]);
                        pts.push(x, y, hole ? z - RECESS : z, n[0], n[1], n[2], hole ? 0 : colors[c], hole ? 1 : 0);
                        pts.push(x, y, -z, n[0], n[1], -n[2], 0, 0);
                        // Rim strip joining front and back domes at the silhouette edge.
                        if ((c === spans[r][0] && i === 0) || (c === spans[r][1] && i === S - 1)) {
                            for (var k = 0; k < z; k += 0.5) {
                                var side = x > 0 ? 1 : -1;
                                pts.push(x, y, k, side, 0, 0, 0, 0);
                                pts.push(x, y, -k, side, 0, 0, 0, 0);
                            }
                        }
                    }
                }
            }
        }
        return { pts: pts, rows: rows, cols: cols, cx: cx, cy: cy };
    }

    function render(model, yaw) {
        var W = model.cols, H = model.rows;
        var zbuf = new Float32Array(W * H).fill(-Infinity);
        var chars = new Array(W * H).fill(' ');
        var color = new Uint8Array(W * H);
        var cyw = Math.cos(yaw), syw = Math.sin(yaw);
        var P = model.pts;
        for (var i = 0; i < P.length; i += STRIDE) {
            var nz = -P[i + 3] * syw + P[i + 5] * cyw;
            if (nz < -0.15) continue; // back-facing
            if (P[i + 7] && nz < 0.2) continue; // grooves only read from the front
            var x = P[i] * cyw + P[i + 2] * syw;
            var z = -P[i] * syw + P[i + 2] * cyw;
            var col = Math.floor(x + model.cx), row = Math.floor((P[i + 1] + model.cy) / ASPECT);
            if (col < 0 || col >= W || row < 0 || row >= H) continue;
            var idx = row * W + col;
            if (z <= zbuf[idx]) continue;
            zbuf[idx] = z;
            color[idx] = P[i + 6];
            if (P[i + 7]) { chars[idx] = ' '; continue; }
            var nx = P[i + 3] * cyw + P[i + 5] * syw;
            var lum = Math.max(0, nx * LIGHT[0] + P[i + 4] * LIGHT[1] + nz * LIGHT[2]);
            chars[idx] = RAMP[Math.round((0.12 + 0.88 * lum) * (RAMP.length - 1))];
        }
        // Plug single-cell gaps left by sparse sampling near the rim.
        for (var k = 1; k < W * H - 1; k++) {
            if (zbuf[k] === -Infinity && zbuf[k - 1] !== -Infinity && zbuf[k + 1] !== -Infinity && k % W) {
                chars[k] = chars[k - 1]; color[k] = color[k - 1];
            }
        }
        var lines = [];
        for (var r = 0; r < H; r++) {
            var html = '', run = '', runColor = -1;
            for (var c = 0; c < W; c++) {
                var idx2 = r * W + c;
                if (color[idx2] !== runColor && run) {
                    html += '<span style="color:' + COLORS[runColor] + '">' + run + '</span>';
                    run = '';
                }
                runColor = color[idx2];
                run += chars[idx2];
            }
            if (run) html += '<span style="color:' + COLORS[runColor] + '">' + run + '</span>';
            lines.push(html);
        }
        return lines;
    }

    // Ease so the spin lingers face-on and whips around the back.
    function yawAt(seconds) {
        var p = (seconds / SPIN_SECONDS) % 1;
        return 2 * Math.PI * p - Math.sin(2 * Math.PI * p);
    }

    var model = null, last = 0, start = 0;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick(now) {
        requestAnimationFrame(tick);
        if (now - last < 1000 / FPS) return;
        last = now;
        var els = document.querySelectorAll('.face-3d');
        if (!els.length) return;
        var frame = render(model, yawAt((now - start) / 1000));
        els.forEach(function(el) {
            var rows = el.children;
            for (var i = 0; i < rows.length && i < frame.length; i++) {
                if (rows[i]._html !== frame[i]) { rows[i].innerHTML = frame[i]; rows[i]._html = frame[i]; }
            }
        });
    }

    // Returns HTML for one face instance; all instances share a single animation loop.
    window.face3d = function(art) {
        var lines = art.split('\n');
        if (!model) {
            model = buildModel(lines);
            if (!reduceMotion) { start = performance.now(); requestAnimationFrame(tick); }
        }
        return '<div class="face-3d" style="font-size:25%;line-height:1;font-family:inherit;white-space:pre;">' +
               render(model, 0).map(function(l) { return '<div>' + l + '</div>'; }).join('') +
               '</div>';
    };
})();
