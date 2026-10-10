// Dripping / bleeding banner.
// Blood oozes out of the bottom of the solid letter strokes, runs down through
// the shaded "dust" below them, then detaches as a drop that falls (half-block
// steps for smooth motion) into a few extra rows and splashes out.
(function() {
    var RAMP = [' ', '░', '▒', '▓', '█'];
    var DENSITY = { '░': 1, '▒': 2, '▓': 3, '█': 4, '▄': 3, '▀': 3, '▌': 3, '▐': 3 };
    var EXTRA_ROWS = 4;      // room below the banner for drops to fall into
    var MAX_DRIPS = 6;
    var SPAWN_PER_SEC = 1.4;
    var GRAVITY = 28;        // rows / s^2
    var FPS = 30;

    var model = null, drips = [], splashes = [], last = 0, lastFrame = 0;

    function buildModel(lines) {
        var rows = lines.length, cols = Math.max.apply(null, lines.map(function(l) { return l.length; }));
        var base = lines.map(function(l) {
            var row = [];
            for (var c = 0; c < cols; c++) row.push(l[c] || ' ');
            return row;
        });
        // A column can bleed from the lowest solid cell of its letter stroke.
        var sources = [];
        for (var c = 0; c < cols; c++) {
            for (var r = rows - 1; r >= 0; r--) {
                if ((DENSITY[base[r][c]] || 0) >= 3) { sources.push({ c: c, r: r }); break; }
            }
        }
        return { base: base, rows: rows + EXTRA_ROWS, bannerRows: rows, cols: cols, sources: sources };
    }

    function spawn() {
        var busy = {};
        drips.forEach(function(d) { busy[d.c] = busy[d.c - 1] = busy[d.c + 1] = true; });
        var free = model.sources.filter(function(s) { return !busy[s.c]; });
        if (!free.length) return;
        var s = free[Math.floor(Math.random() * free.length)];
        var room = model.bannerRows - (s.r + 1);
        drips.push({
            c: s.c, r0: s.r + 1, len: 0,
            max: 1 + Math.random() * Math.max(1, room),
            speed: 0.7 + Math.random() * 1.6,
            falling: false, y: 0, v: 0
        });
    }

    function step(dt) {
        if (drips.length < MAX_DRIPS && Math.random() < SPAWN_PER_SEC * dt) spawn();
        drips.forEach(function(d) {
            if (!d.falling) {
                d.len += d.speed * dt;
                if (d.len >= d.max) { d.falling = true; d.y = d.r0 + d.len; d.v = 1; }
            } else {
                d.v += GRAVITY * dt;
                d.y += d.v * dt;
                d.len = Math.max(0, d.len - 3 * dt);  // the stream drains back
                if (d.y >= model.rows && !d.splashed) {
                    d.splashed = true;
                    splashes.push({ c: d.c, ttl: 0.25 });
                }
            }
        });
        drips = drips.filter(function(d) { return !(d.splashed && d.len <= 0); });
        splashes.forEach(function(s) { s.ttl -= dt; });
        splashes = splashes.filter(function(s) { return s.ttl > 0; });
    }

    function render() {
        var W = model.cols, H = model.rows;
        var grid = [];
        for (var r = 0; r < H; r++) grid.push(r < model.bannerRows ? model.base[r].slice() : new Array(W).fill(' '));
        var put = function(r, c, ch) {
            if (r < 0 || r >= H || c < 0 || c >= W) return;
            // Never paint over denser banner ink.
            if ((DENSITY[grid[r][c]] || 0) >= (DENSITY[ch] || 1)) return;
            grid[r][c] = ch;
        };
        drips.forEach(function(d) {
            var full = Math.floor(d.len);
            for (var k = 0; k < full; k++) put(d.r0 + k, d.c, RAMP[k < 1 ? 3 : 2]);
            // Swelling bulb at the tip while it oozes.
            if (!d.falling && d.len > 0) put(d.r0 + full, d.c, d.len - full < 0.5 ? '▀' : '▓');
            if (d.falling && !d.splashed) {
                var row = Math.floor(d.y);
                put(row, d.c, d.y - row < 0.5 ? '▀' : '▄');
                if (d.v > 10) put(row - 1, d.c, '░');  // motion streak
            }
        });
        splashes.forEach(function(s) {
            put(H - 1, s.c - 1, '▖');
            put(H - 1, s.c + 1, '▗');
        });
        return grid.map(function(row) { return row.join(''); });
    }

    function tick(now) {
        requestAnimationFrame(tick);
        if (now - lastFrame < 1000 / FPS) return;
        var dt = Math.min(0.1, (now - (last || now)) / 1000);
        last = lastFrame = now;
        var els = document.querySelectorAll('.banner-drip');
        if (!els.length) return;
        step(dt);
        var frame = render();
        els.forEach(function(el) {
            var spans = el.children;
            for (var i = 0; i < spans.length && i < frame.length; i++) {
                if (spans[i].textContent !== frame[i]) spans[i].textContent = frame[i];
            }
        });
    }

    // Returns HTML for one banner instance; all instances share a single animation loop.
    window.bannerDrip = function(lines) {
        if (!model) {
            model = buildModel(lines);
            var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!reduceMotion) requestAnimationFrame(tick);
        }
        var frame = render();
        return '<div class="banner-drip">' + frame.map(function(line, i) {
            var delay = -(i / model.bannerRows * 8).toFixed(2);
            var text = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
            return '<span class="banner-line" style="animation-delay:' + delay + 's">' + text + '</span>';
        }).join('') + '</div>';
    };
})();
