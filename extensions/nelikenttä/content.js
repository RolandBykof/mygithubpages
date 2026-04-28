/**
 * Yle Vaalikone – Saavutettava nelikenttä  v1.5
 *
 * Koordinaattiratkaisu (todennettu diagnostiikkadatalla):
 *
 *   Ongelma: tick-viivojen getBoundingClientRect() palauttaa 0×0 (viivat
 *   ovat visibility:hidden tai muuten piilotettuja piirtotasolla).
 *
 *   Ratkaisu: käytetään tick-viivojen SVG-attribuutteja (x1/y1) sellaisenaan
 *   SVG-koordinaatistossa, ja muunnetaan symbolin screen-koordinaatit SVG-
 *   koordinaatistoon vähentämällä svg.getBoundingClientRect().left/top.
 *   Molemmat ovat nyt samassa koordinaatistossa → interpolointi toimii.
 *
 *   Tarkistus diagnostiikkadatalla (ehdokas 18843):
 *     SVG screen-offset: left=24, top=3584.65
 *     Symboli screen-center: (273, 3905.65)
 *     Symboli SVG-koordinaateissa: (249, 321)
 *     x: tick -4→x1=24, +4→x1=624, arvo 249 → interpoloi -1.0  ✓
 *     y: tick -4→y1=618, +4→y1=24, arvo 321 → osuu täsmälleen 0  ✓
 */

(function () {
  'use strict';

  var INJECTED_ID = 'yle-nelikentta-saavutettava';

  // ── Koordinaattilogiikka ──────────────────────────────────────────────────

  /**
   * Palauttaa scatter-symbolin keskipisteen SVG:n omassa koordinaatistossa.
   * getBoundingClientRect() toimii symbolilla (se on oikea DOM-elementti
   * jolla on koko), mutta tick-viivoilla ei → muunnetaan yhteiseen
   * SVG-koordinaatistoon vähentämällä SVG:n screen-offset.
   */
  function resolveSymbolSvgPosition(svg) {
    var symbol = svg.querySelector('.recharts-scatter-symbol');
    if (!symbol) return null;

    // Etsitään ensimmäinen elementti jolla on oikeat mitat
    var targets = [symbol.querySelector('svg'), symbol.querySelector('image'), symbol];
    var sr = null;
    for (var i = 0; i < targets.length; i++) {
      if (!targets[i]) continue;
      var r = targets[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { sr = r; break; }
    }
    if (!sr) return null;

    var svgRect = svg.getBoundingClientRect();
    return {
      x: (sr.left + sr.width / 2) - svgRect.left,
      y: (sr.top + sr.height / 2) - svgRect.top
    };
  }

  /**
   * Rakentaa akselin skaalan SVG-attribuuteista (x1 tai y1).
   * Nämä ovat jo SVG:n omassa koordinaatistossa – sama kuin symbolilla
   * resolveSymbolSvgPosition:n jälkeen.
   */
  function buildAxisScale(svg, tickSelector, attrName) {
    var ticks = Array.from(svg.querySelectorAll(tickSelector));
    var scale = [];
    for (var i = 0; i < ticks.length; i++) {
      var line = ticks[i].querySelector('line');
      var tspan = ticks[i].querySelector('tspan');
      if (!line || !tspan) continue;
      var px = parseFloat(line.getAttribute(attrName));
      var val = parseFloat(tspan.textContent.trim());
      if (!isNaN(px) && !isNaN(val)) scale.push({ px: px, val: val });
    }
    scale.sort(function (a, b) { return a.px - b.px; });
    return scale;
  }

  function interpolate(scale, px) {
    if (!scale.length) return null;
    if (px <= scale[0].px) return scale[0].val;
    if (px >= scale[scale.length - 1].px) return scale[scale.length - 1].val;
    for (var i = 0; i < scale.length - 1; i++) {
      var a = scale[i], b = scale[i + 1];
      if (px >= a.px && px <= b.px) {
        return a.val + (px - a.px) / (b.px - a.px) * (b.val - a.val);
      }
    }
    return null;
  }

  function readPoliticalPosition() {
    var svg = document.querySelector('.recharts-wrapper svg.recharts-surface');
    if (!svg) return null;

    var sym = resolveSymbolSvgPosition(svg);
    if (!sym) return null;

    // x-akseli: käytetään x1-attribuuttia (pystyviiva tick-kohdassa)
    var xScale = buildAxisScale(svg, '.recharts-xAxis .recharts-cartesian-axis-tick', 'x1');
    // y-akseli: käytetään y1-attribuuttia
    var yScale = buildAxisScale(svg, '.recharts-yAxis .recharts-cartesian-axis-tick', 'y1');

    if (xScale.length < 2 || yScale.length < 2) return null;

    var x = interpolate(xScale, sym.x);
    var y = interpolate(yScale, sym.y);
    if (x === null || y === null) return null;
    return { x: x, y: y };
  }

  // ── Tekstin muodostaminen ─────────────────────────────────────────────────

  function formatNum(n) { return n.toFixed(1).replace('.', ','); }

  function describeAxis(val, negLabel, posLabel) {
    var abs = Math.abs(val);
    if (abs < 0.25) return 'tasan keskell\u00e4 ' + negLabel + '\u2013' + posLabel + '-akselilla';
    var dir = val < 0 ? negLabel : posLabel;
    var deg = abs < 1.0 ? 'hyvin liev\u00e4sti' : abs < 2.0 ? 'liev\u00e4sti' : abs < 3.0 ? 'selv\u00e4sti' : 'vahvasti';
    return deg + ' ' + dir + ' (' + formatNum(val) + ')';
  }

  function quadrantName(x, y) {
    var xW = x < -0.25 ? 'vasemmisto' : x > 0.25 ? 'oikeisto' : null;
    var yW = y < -0.25 ? 'liberaali' : y > 0.25 ? 'konservatiivi' : null;
    if (xW && yW) return yW + '\u2013' + xW;
    if (xW) return xW + ', l\u00e4hell\u00e4 liberaali\u2013konservatiivi-akselin keskikohtaa';
    if (yW) return yW + ', l\u00e4hell\u00e4 vasemmisto\u2013oikeisto-akselin keskikohtaa';
    return 'kaikkien akselien keskikohdassa';
  }

  function buildDescription(pos) {
    var x = pos.x, y = pos.y;
    var selitysOsa =
      'Nelik\u00e4ntt\u00e4 on poliittinen kartta, joka kuvaa ehdokkaan arvojen sijaintia ' +
      'kahdella akselilla. ' +
      'Vaaka-akseli kuvaa talous- ja yhteiskuntapoliittista suuntausta: ' +
      'vasemmalla p\u00e4\u00e4ss\u00e4 on vasemmisto, oikealla p\u00e4\u00e4ss\u00e4 on oikeisto. ' +
      'Pystyakseli kuvaa arvoliberalismin ja arvokonservatismin v\u00e4list\u00e4 eroa: ' +
      'ylh\u00e4\u00e4ll\u00e4 on konservatiivi ja alhaalla on liberaali. ' +
      'Sijainti perustuu ehdokkaan omaan arvioon.';
    return {
      selitysOsa: selitysOsa,
      sijaintiLohko: 'Ehdokkaan sijainti kartalla: ' + quadrantName(x, y) + '.',
      sijaintiX: 'Vaaka-akseli, vasemmisto–oikeisto: ' + describeAxis(x, 'vasemmisto', 'oikeisto') + '.',
      sijaintiY: 'Pystyakseli, liberaali–konservatiivi: ' + describeAxis(y, 'liberaali', 'konservatiivi') + '.'
    };
  }

  // ── DOM-injektio ──────────────────────────────────────────────────────────

  function injectDescription(desc) {
    var old = document.getElementById(INJECTED_ID);
    if (old) old.parentNode.removeChild(old);

    var wrapper = document.querySelector('.recharts-wrapper');
    if (!wrapper) return false;

    // Lisätään aria-label suoraan SVG-elementille
    var svg = wrapper.querySelector('svg.recharts-surface');
    if (svg) {
      var ariaText = desc.sijaintiLohko + ' ' + desc.sijaintiX + ' ' + desc.sijaintiY;
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', ariaText);
    }

    var chartSection = wrapper.closest('section') || wrapper.closest('div');
    if (!chartSection) return false;

    var div = document.createElement('div');
    div.id = INJECTED_ID;
    div.setAttribute('role', 'region');
    div.setAttribute('aria-label', 'Sijainti poliittisella kartalla \u2013 tekstikuvaus');
    div.style.cssText = 'margin:8px 0;padding:12px 16px;border:1px solid #767676;' +
      'border-radius:4px;background:#f5f5f5;font-size:0.95em;line-height:1.6;color:#111;';

    var h1 = document.createElement('h3');
    h1.textContent = 'Mit\u00e4 poliittinen nelik\u00e4ntt\u00e4 tarkoittaa?';
    h1.style.cssText = 'margin:0 0 4px 0;font-size:1em;';
    var p1 = document.createElement('p');
    p1.textContent = desc.selitysOsa;
    p1.style.cssText = 'margin:0 0 12px 0;';

    var h2 = document.createElement('h3');
    h2.textContent = 'Ehdokkaan sijainti';
    h2.style.cssText = 'margin:0 0 4px 0;font-size:1em;';
    var p2a = document.createElement('p');
    p2a.textContent = desc.sijaintiLohko;
    p2a.style.cssText = 'margin:0;';
    var p2b = document.createElement('p');
    p2b.textContent = desc.sijaintiX;
    p2b.style.cssText = 'margin:0;';
    var p2c = document.createElement('p');
    p2c.textContent = desc.sijaintiY;
    p2c.style.cssText = 'margin:0;';

    div.appendChild(h1); div.appendChild(p1);
    div.appendChild(h2); div.appendChild(p2a); div.appendChild(p2b); div.appendChild(p2c);
    chartSection.insertAdjacentElement('afterend', div);
    return true;
  }

  // ── Päälogiikka ja SPA-tuki ───────────────────────────────────────────────

  var lastInjectedPos = null;
  var chartObserver = null;

  function posKey(pos) { return pos ? pos.x.toFixed(1) + '_' + pos.y.toFixed(1) : null; }

  function tryProcess() {
    var pos = readPoliticalPosition();
    if (!pos) return false;
    if (posKey(pos) === posKey(lastInjectedPos) && document.getElementById(INJECTED_ID)) return true;
    var ok = injectDescription(buildDescription(pos));
    if (ok) lastInjectedPos = pos;
    return ok;
  }

  var retryTimer = null;
  function scheduleRetries() {
    clearTimeout(retryTimer);
    var attempts = 0;
    function attempt() {
      if (tryProcess()) return;
      attempts++;
      if (attempts < 12) retryTimer = setTimeout(attempt, 300 * attempts);
    }
    attempt();
  }

  function attachChartObserver() {
    if (chartObserver) { chartObserver.disconnect(); chartObserver = null; }
    var wrapper = document.querySelector('.recharts-wrapper');
    if (!wrapper) return false;
    var debounceTimer = null;
    chartObserver = new MutationObserver(function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(tryProcess, 150);
    });
    chartObserver.observe(wrapper, { subtree: true, attributes: true, childList: true });
    return true;
  }

  var lastUrl = location.href;
  var bodyObserver = new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastInjectedPos = null;
      var old = document.getElementById(INJECTED_ID);
      if (old) old.parentNode.removeChild(old);
      if (chartObserver) { chartObserver.disconnect(); chartObserver = null; }
      scheduleRetries();
      return;
    }
    if (!chartObserver || !document.querySelector('.recharts-wrapper')) {
      if (attachChartObserver()) tryProcess();
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
  scheduleRetries();
  attachChartObserver();
})();
