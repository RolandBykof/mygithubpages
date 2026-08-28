// =========================================================
// Funbridge Accessibility Extension – library data bridge
// =========================================================
// Tämä tiedosto ajetaan SIVUN omassa JS-maailmassa. Se lukee
// kirjaston jakoluettelon Reactin Fiber-puusta ja julkaisee sen
// JSONina elementtiin <script id="fb-a11y-library-data">, josta
// content.js lukee sen. Content script ei itse näe sivun
// __reactFiber$-ominaisuuksia, koska se ajetaan eristetyssä
// maailmassa.
//
// Asennus, vaihtoehto A (suositeltavin, Chrome 111+ / MV3):
//   "content_scripts": [
//     { "matches": ["https://play.funbridge.com/*"],
//       "js": ["content.js"] },
//     { "matches": ["https://play.funbridge.com/*"],
//       "js": ["fb-library-bridge.js"],
//       "world": "MAIN", "run_at": "document_idle" }
//   ]
//
// Asennus, vaihtoehto B (content.js injektoi tiedoston itse):
//   "web_accessible_resources": [
//     { "resources": ["fb-library-bridge.js"],
//       "matches": ["https://play.funbridge.com/*"] }
//   ]
//
// Jos sivun CSP sallii inline-skriptit, content.js pärjää ilman
// tätä tiedostoa – silloin se injektoi saman koodin itse.
// =========================================================

(function fbLibBridgeMain(silent) {
    // Näitä avaimia ei seurata koskaan (DOM-solmut, React-sisäiset viitteet).
    var SKIP = {
        stateNode: 1, _owner: 1, _store: 1, _debugOwner: 1, _debugSource: 1,
        _debugHookTypes: 1, containerInfo: 1, ownerDocument: 1, _reactInternals: 1
    };

    // Fiber-puun rakenteelliset linkit: seurataan vasta viimeisessä
    // vaiheessa, muuten sama data käydään läpi kymmeniä kertoja.
    var LINKS = {
        'return': 1, child: 1, sibling: 1, alternate: 1,
        firstEffect: 1, nextEffect: 1, dependencies: 1
    };

    function findFiber(el) {
        if (!el) return null;

        var targets = [el];
        // Firefox: sivun ominaisuudet näkyvät wrappedJSObjectin kautta.
        try { if (el.wrappedJSObject) targets.push(el.wrappedJSObject); } catch (e) {}

        for (var t = 0; t < targets.length; t++) {
            var keys;
            try { keys = Object.getOwnPropertyNames(targets[t]); } catch (e2) { continue; }
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('__reactFiber$') === 0 ||
                    keys[i].indexOf('__reactInternalInstance$') === 0) {
                    return targets[t][keys[i]];
                }
            }
        }
        return null;
    }

    function isDeal(o) {
        return !!o && typeof o === 'object' && !Array.isArray(o) &&
               Object.prototype.hasOwnProperty.call(o, 'dealId') &&
               (o.playerHands || o.distribution || typeof o.name === 'string');
    }

    // Iteratiivinen läpikäynti: rajattu syvyys ja solmubudjetti, jotta
    // sivu ei jumitu. Palauttaa jäljelle jääneen budjetin.
    function scan(rootObj, out, seen, budget, maxDepth, followLinks) {
        if (!rootObj || typeof rootObj !== 'object') return budget;

        var stack = [{ v: rootObj, d: 0 }];

        while (stack.length) {
            if (budget-- <= 0) break;

            var item = stack.pop();
            var v = item.v;
            var d = item.d;

            if (!v || typeof v !== 'object' || d > maxDepth) continue;
            if (seen.has(v)) continue;
            seen.add(v);

            if (v === window || (typeof Node !== 'undefined' && v instanceof Node)) continue;

            if (Array.isArray(v)) {
                if (v.length && isDeal(v[0])) out.push(v);
                for (var i = 0; i < v.length && i < 500; i++) {
                    if (v[i] && typeof v[i] === 'object') stack.push({ v: v[i], d: d + 1 });
                }
                continue;
            }

            if (isDeal(v)) { out.push([v]); continue; }

            var keys;
            try { keys = Object.keys(v); } catch (e) { continue; }

            for (var k = 0; k < keys.length && k < 300; k++) {
                var key = keys[k];
                if (SKIP[key]) continue;
                if (!followLinks && LINKS[key]) continue;

                var child;
                try { child = v[key]; } catch (e2) { continue; }
                if (!child || typeof child !== 'object') continue;

                // Hook- ja efektiketjut kulkevat next-linkkiä pitkin ja voivat
                // olla kymmeniä alkioita pitkiä, joten ne eivät saa kuluttaa
                // syvyysbudjettia.
                stack.push({ v: child, d: (key === 'next') ? d : d + 1 });
            }
        }

        return budget;
    }

    function collect() {
        var container = document.getElementById('infinite-scroll-list-container');
        var fiber = findFiber(container) ||
                    findFiber(document.querySelector('.fb-table')) ||
                    findFiber(document.getElementById('root'));

        if (!fiber) return { source: 'no-fiber', deals: [] };

        var arrays = [];
        var source = 'none';

        // Vaihe 1: vanhempien hook-tila ja efektit (nopein, tavallisin).
        var seen1 = new WeakSet();
        var node = fiber;
        var levels = 0;
        while (node && levels < 40) {
            var alt = node.alternate;
            var roots = [node.memoizedState, node.updateQueue,
                         alt && alt.memoizedState, alt && alt.updateQueue];
            for (var r = 0; r < roots.length; r++) {
                if (roots[r] && typeof roots[r] === 'object') {
                    scan(roots[r], arrays, seen1, 20000, 14, false);
                }
            }
            node = node['return'];
            levels++;
        }
        if (arrays.length) source = 'react-state';

        // Vaihe 2: vanhempien propsit.
        if (!arrays.length) {
            var seen2 = new WeakSet();
            var node2 = fiber;
            var lev2 = 0;
            while (node2 && lev2 < 40) {
                var alt2 = node2.alternate;
                var roots2 = [node2.memoizedProps, node2.pendingProps,
                              alt2 && alt2.memoizedProps];
                for (var r2 = 0; r2 < roots2.length; r2++) {
                    if (roots2[r2] && typeof roots2[r2] === 'object') {
                        scan(roots2[r2], arrays, seen2, 20000, 12, false);
                    }
                }
                node2 = node2['return'];
                lev2++;
            }
            if (arrays.length) source = 'react-props';
        }

        // Vaihe 3: koko Fiber-puu (raskain, mutta varmin).
        if (!arrays.length) {
            scan(fiber, arrays, new WeakSet(), 250000, 20, true);
            if (arrays.length) source = 'react-tree';
        }

        // Pisin taulukko ensin: se on todennäköisimmin koko lista.
        arrays.sort(function (a, b) { return b.length - a.length; });

        var byId = {};
        var list = [];

        arrays.forEach(function (arr) {
            arr.forEach(function (deal) {
                if (!isDeal(deal)) return;
                var id = String(deal.dealId);
                if (byId[id]) return;
                byId[id] = deal;
                list.push(deal);
            });
        });

        return { source: source, deals: list };
    }

    // Vain tarvittavat kentät ja vain yksinkertaisia arvoja: tulos
    // siirtyy JSONina maailmasta toiseen.
    function pick(d) {
        function str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
        function num(v) { return typeof v === 'number' ? v : 0; }

        var hands = d.playerHands || {};

        return {
            dealId       : (typeof d.dealId === 'number' || typeof d.dealId === 'string') ? d.dealId : String(d.dealId),
            name         : str(d.name),
            description  : str(d.description),
            tags         : Array.isArray(d.tags) ? d.tags.map(str).slice(0, 30) : [],
            creationDate : num(d.creationDate),
            lastPlayedDate: num(d.lastPlayedDate),
            gameMode     : num(d.gameMode),
            dealer       : str(d.dealer),
            vulnerability: str(d.vulnerability),
            bids         : str(d.bids),
            sharedUrl    : str(d.sharedUrl),
            distribution : str(d.distribution),
            playerHands  : {
                north: str(hands.north), east: str(hands.east),
                south: str(hands.south), west: str(hands.west)
            }
        };
    }

    // -----------------------------------------------------
    // Jaon aktivointi (rivin klikkaus sivun omassa maailmassa)
    // -----------------------------------------------------
    // Virtualisoidussa listassa rivin DOM-elementti ei aina ole
    // löydettävissä tekstin perusteella, ja klikkauksen käsittelijä on
    // Reactin propseissa. Siksi rivi etsitään Fiber-puusta: haetaan
    // syvin komponentti, jonka propseissa on juuri tämä jako, ja
    // klikataan sen host-elementtiä oikealla tapahtumasarjalla.

    function objHasDeal(o, id, depth) {
        if (!o || typeof o !== 'object' || depth > 3) return false;

        if (Array.isArray(o)) {
            // Koko listan sisältävä taulukko ei ole yksittäinen rivi.
            if (o.length > 1 && isDeal(o[0])) return false;
            for (var i = 0; i < o.length && i < 40; i++) {
                if (objHasDeal(o[i], id, depth + 1)) return true;
            }
            return false;
        }

        if (isDeal(o)) return String(o.dealId) === id;

        var keys;
        try { keys = Object.keys(o); } catch (e) { return false; }

        for (var k = 0; k < keys.length && k < 60; k++) {
            var key = keys[k];
            if (SKIP[key] || LINKS[key]) continue;
            var v;
            try { v = o[key]; } catch (e2) { continue; }
            if (v && typeof v === 'object' && objHasDeal(v, id, depth + 1)) return true;
        }
        return false;
    }

    function hostElementOf(fiber) {
        if (fiber.stateNode && fiber.stateNode.nodeType === 1) return fiber.stateNode;

        var queue = [fiber.child];
        var guard = 0;
        while (queue.length && guard++ < 800) {
            var f = queue.shift();
            if (!f) continue;
            if (f.stateNode && f.stateNode.nodeType === 1) return f.stateNode;
            if (f.child) queue.push(f.child);
            if (f.sibling) queue.push(f.sibling);
        }
        return null;
    }

    // Etsii SYVIMMÄN komponentin, jonka propseissa on kyseinen jako.
    function findRowElement(dealId) {
        var startEl = document.getElementById('infinite-scroll-list-container') ||
                      document.getElementById('root');
        var fiber = findFiber(startEl);
        if (!fiber) return null;

        var root = fiber;
        var up = 0;
        while (root['return'] && up++ < 300) root = root['return'];

        var id = String(dealId);
        var best = null;
        var bestDepth = -1;

        var stack = [{ f: root, d: 0 }];
        var visited = 0;

        while (stack.length && visited++ < 40000) {
            var item = stack.pop();
            var f = item.f;
            if (!f) continue;

            var match = false;
            try { match = objHasDeal(f.memoizedProps, id, 0); } catch (e) { match = false; }

            if (match && item.d > bestDepth) {
                var el = hostElementOf(f);
                if (el) { best = el; bestDepth = item.d; }
            }

            if (f.child)   stack.push({ f: f.child,   d: item.d + 1 });
            if (f.sibling) stack.push({ f: f.sibling, d: item.d });
        }

        return best;
    }

    function clickElement(el) {
        try { el.scrollIntoView({ block: 'center' }); } catch (e) {}

        var rect = el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var base = {
            bubbles: true, cancelable: true, view: window,
            clientX: cx, clientY: cy, button: 0, buttons: 1,
            pointerId: 1, isPrimary: true, pointerType: 'mouse'
        };

        var sequence = [
            ['pointerover', base], ['pointerenter', base],
            ['mouseover', base], ['pointerdown', base], ['mousedown', base],
            ['pointerup', Object.assign({}, base, { buttons: 0 })],
            ['mouseup',   Object.assign({}, base, { buttons: 0 })],
            ['click',     Object.assign({}, base, { buttons: 0 })]
        ];

        for (var i = 0; i < sequence.length; i++) {
            var type = sequence[i][0];
            var opts = sequence[i][1];
            var Ctor = (type.indexOf('pointer') === 0 && typeof PointerEvent !== 'undefined')
                ? PointerEvent : MouseEvent;
            try { el.dispatchEvent(new Ctor(type, opts)); } catch (e2) {}
        }
    }

    // Rivi voi löytyä kolmella tavalla. Ensimmäinen on tarkin, mutta jos
    // rivikomponentti ei kanna koko jako-oliota propseissaan, käytetään
    // renderöityjen elementtien omia fibereitä tai lopuksi nimen tekstiä.
    // Kerää elementit myös shadow DOMin sisältä: virtualisoitu lista voi
    // renderöityä varjojuureen, jolloin tavallinen querySelectorAll ei
    // näe rivejä lainkaan.
    function allElements(root, out, cap) {
        var els;
        try { els = root.querySelectorAll('*'); } catch (e) { return out; }
        for (var i = 0; i < els.length; i++) {
            if (out.length >= cap) return out;
            var el = els[i];
            out.push(el);
            if (el.shadowRoot) allElements(el.shadowRoot, out, cap);
        }
        return out;
    }

    function rowSearchElements(cap) {
        var scope = document.getElementById('infinite-scroll-list-container');
        var out = [];
        if (scope) allElements(scope, out, cap);
        // Rivit voivat olla myös listan ulkopuolella (portaali, varjojuuri).
        if (out.length < cap) allElements(document.body, out, cap);
        return out;
    }

    function findRowByRenderedFibers(id) {
        var els = rowSearchElements(6000);
        var limit = els.length;

        for (var i = 0; i < limit; i++) {
            var el = els[i];
            if (el.closest('#fb-library-dialog, #fb-help-dialog, #fb-a11y-live, [data-fb-a11y]')) continue;

            var f = findFiber(el);
            var up = 0;

            while (f && up++ < 8) {
                var hit = false;
                try {
                    hit = objHasDeal(f.memoizedProps, id, 0) ||
                          objHasDeal(f.memoizedState, id, 0);
                } catch (e) { hit = false; }
                if (hit) return el;
                f = f['return'];
            }
        }
        return null;
    }

    function findRowByText(id) {
        var deal = lastDealsById[String(id)];
        var name = deal && deal.name ? String(deal.name).replace(/\s+/g, ' ').trim() : '';
        if (!name) return null;

        var els = rowSearchElements(6000);
        var limit = els.length;

        for (var i = 0; i < limit; i++) {
            var el = els[i];
            if (el.children.length) continue;
            if (el.closest('#fb-library-dialog, #fb-help-dialog, #fb-a11y-live, [data-fb-a11y]')) continue;
            var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (text === name) return el;
        }
        return null;
    }

    function rowAncestor(el) {
        try {
            var row = el.closest('[class*="row"], [class*="line"], [class*="item"], tr, li, a, button');
            if (row) return row;
        } catch (e) {}
        return el;
    }

    function locateRow(dealId) {
        var id = String(dealId);
        var el = null;

        try { el = findRowElement(id); } catch (e) {}
        if (el) return { el: el, how: 'fiber-props' };

        try { el = findRowByRenderedFibers(id); } catch (e2) {}
        if (el) return { el: el, how: 'rendered-fiber' };

        try { el = findRowByText(id); } catch (e3) {}
        if (el) return { el: el, how: 'text' };

        return null;
    }

    function activateDeal(dealId) {
        var found = locateRow(dealId);
        if (!found) return 'not-found';

        clickElement(rowAncestor(found.el));
        return 'clicked:' + found.how;
    }

    var lastDealsById = {};

    function payload() {
        var res;
        try {
            res = collect();
        } catch (e) {
            res = { source: 'error', deals: [], error: String(e && e.message ? e.message : e) };
        }
        return {
            source: res.source,
            error : res.error || null,
            deals : res.deals.map(function (d) {
                try {
                    var picked = pick(d);
                    lastDealsById[String(picked.dealId)] = picked;
                    return picked;
                } catch (e2) { return null; }
            }).filter(Boolean)
        };
    }

    // Hiljainen tila: palautetaan rajapinta ilman kuuntelijoita.
    // Tätä käyttää content script siltä varalta, että se sattuu jo
    // ajautumaan sivun omassa maailmassa (tai Firefoxin wrappedJSObject
    // riittää).
    if (silent) return { collect: payload, activate: activateDeal };

    function publish() {
        var data = payload();
        var node = document.getElementById('fb-a11y-library-data');
        if (!node) {
            node = document.createElement('script');
            node.type = 'application/json';
            node.id   = 'fb-a11y-library-data';
            document.documentElement.appendChild(node);
        }
        node.textContent = JSON.stringify(data);
        return data;
    }

    document.addEventListener('fb-a11y-collect-deals', function () { publish(); });

    // Content script pyytää jaon avaamista: haluttu dealId luetaan
    // jaetusta DOM-attribuutista ja tulos kirjoitetaan takaisin.
    document.addEventListener('fb-a11y-activate-deal', function () {
        var node = document.getElementById('fb-a11y-library-data');
        var id   = node ? node.getAttribute('data-fb-request-deal') : null;
        var result = 'not-found';
        if (id) {
            try { result = activateDeal(id); }
            catch (e) { result = 'error'; }
        }
        document.documentElement.setAttribute('data-fb-activate-result', result);
    });
    document.documentElement.setAttribute('data-fb-a11y-bridge', '1');

    // Kertoo, löytyykö tietty jako sivulta ja millä keinolla.
    window.fbLibDebugOpen = function (dealId) {
        payload();   // varmistetaan että nimet ovat välimuistissa
        var found = null;
        try { found = locateRow(dealId); } catch (e) {}
        var info = {
            dealId: String(dealId),
            found: !!found,
            how: found ? found.how : null,
            element: found ? found.el : null,
            renderedRowCandidates: (document.getElementById('infinite-scroll-list-container') ||
                                    document.body).querySelectorAll('*').length
        };
        console.log('Funbridge a11y open debug:', info);
        return info;
    };

    window.fbLibDebug = function () {
        var data = publish();
        var info = {
            containerFound: !!document.getElementById('infinite-scroll-list-container'),
            source: data.source,
            error: data.error,
            deals: data.deals.length,
            firstDeal: data.deals[0] || null
        };
        console.log('Funbridge a11y library bridge:', info);
        return info;
    };

    publish();
})();
