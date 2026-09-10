chrome.commands.onCommand.addListener((command) => {
  const queryOptions = { active: true, currentWindow: true };
  
  chrome.tabs.query(queryOptions, (tabs) => {
    if (!tabs[0]) return;

    let delayTime = 0;
    if (command === "delayed-freeze") {
      delayTime = 10000; 
    }

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      args: [delayTime],
      function: convertAndDownloadDOM,
      world: 'MAIN'
    });
  });
});

function convertAndDownloadDOM(delay) {
  const performCapture = () => {
    const focusedEl = document.activeElement;
    const hoveredEls = Array.from(document.querySelectorAll(':hover'));

    const SVG_NS = 'http://www.w3.org/2000/svg';

    // ─────────────────────────────────────────────────────────────
    // MUUTOS A: Laskettujen värien kerääminen (computed colors)
    // ─────────────────────────────────────────────────────────────
    // getComputedStyle palauttaa sen värin, jonka selain oikeasti piirtää
    // ruudulle — ei inline-style-arvoa eikä CSS-muuttujan nimeä.
    // Tämä vastaa täsmälleen sitä, mitä NVDA-lisäosa lukee textInfos-
    // värikenttiin, joten laajennus ja lisäosa tuottavat nyt vertailu-
    // kelpoista dataa samasta elementistä.
    //
    // fill ja stroke kerätään VAIN SVG-elementeiltä. Ne ovat SVG-grafiikan
    // varsinaiset väriominaisuudet — esim. varatun ja vapaan istumapaikan
    // ero näkyy yksinomaan fill-arvossa, ei color- tai background-arvossa.
    // HTML-elementeillä fillin alkuarvo on musta, joten ilman tätä rajausta
    // jokainen div raportoisi turhaan fill:#000000.
    //
    // display ja visibility kertovat, näkyykö elementti lainkaan. Tämä on
    // tieto, jota tallennetusta HTML-tiedostosta ei saa: siellä elementti
    // näyttää tavalliselta, vaikka selain ei piirrä sitä ollenkaan.
    // Fill periytyy, joten <svg> ja <g> raportoisivat aina saman perityn
    // arvon kuin lapsensa. Kerätään se vain varsinaisilta muotoelementeiltä,
    // joissa väri tosiasiassa näkyy — esim. path#seat_66_shape.
    const SVG_SHAPES = ['path', 'rect', 'circle', 'ellipse', 'polygon',
                        'polyline', 'line', 'text', 'tspan', 'use'];

    function getComputedVisuals(el) {
      try {
        const cs = window.getComputedStyle(el);
        const isSvgShape = el.namespaceURI === SVG_NS
          && SVG_SHAPES.includes(el.tagName.toLowerCase());
        return {
          fg: cs.color,
          bg: cs.backgroundColor,
          fill: isSvgShape ? cs.fill : null,
          stroke: isSvgShape ? cs.stroke : null,
          display: cs.display,
          visibility: cs.visibility
        };
      } catch (e) {
        return { fg: null, bg: null, fill: null, stroke: null, display: null, visibility: null };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS B: rgb()-merkkijonon muuntaminen #RRGGBB-muotoon
    // ─────────────────────────────────────────────────────────────
    // Selain palauttaa värit muodossa "rgb(R, G, B)" tai
    // "rgba(R, G, B, A)". Muunnetaan ne heksadesimaaliksi, jotta
    // ne voi liimata suoraan CSS:ään tai Tampermonkey-skriptiin
    // — täsmälleen sama logiikka kuin lisäosan _color_to_hex().
    // KORJAUS: selain palauttaa läpinäkyvän taustan muodossa
    // "rgba(0, 0, 0, 0)", ei sanana "transparent". Aiempi versio tulkitsi
    // sen mustaksi, jolloin jokainen tavallinen elementti sai raporttiin
    // merkinnän bg:#000000 — käytännössä koko raportin täyttävä kohina.
    // Nollainen alfa tarkoittaa "ei väriä" ja palauttaa nyt null.
    function rgbToHex(rgbStr) {
      if (!rgbStr || rgbStr === 'transparent' || rgbStr === 'none') return null;
      const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (!m) return null;
      if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
      const toHex = n => parseInt(n).toString(16).padStart(2, '0').toUpperCase();
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    }

    /**
     * fill ja stroke voivat olla muutakin kuin rgb-värejä: "none" tai
     * "url(#liukuvari)". Näissä tapauksissa palautetaan arvo sellaisenaan,
     * jottei tieto katoa raportista. "none" on stroken oletusarvo eikä
     * kerro mitään, joten se suodatetaan pois erikseen kutsukohdassa.
     */
    function colorLabel(str) {
      if (!str) return null;
      const hex = rgbToHex(str);
      if (hex) return hex;
      const trimmed = str.trim();
      if (!trimmed || trimmed === 'transparent') return null;
      // rgbToHex hylkäsi tämän, eli kyse on läpinäkyvästä rgba-arvosta
      if (/^rgba?\(/i.test(trimmed)) return null;
      // Muut merkitykselliset arvot säilytetään: "none", "url(#liukuvari)",
      // "currentcolor"
      return trimmed;
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS C: Fokusoitavuuden arviointi
    // ─────────────────────────────────────────────────────────────
    // Lisäosa varoittaa "EI_FOKUSOITAVISSA" jos elementillä ei ole
    // FOCUSABLE-tilaa. Sama logiikka toteutetaan tässä: tarkistetaan
    // natiivisti fokusoituvat tagit JA tabindex-attribuutti.
    // Varoitus on erityisen arvokas interaktiivisille elementeille
    // (esim. div[role="button"] ilman tabindex="0"), jotka näyttävät
    // toimivilta visuaalisesti mutta ovat näppäimistöllä saavuttamatto-
    // mia.
    function getFocusabilityWarning(el) {
      const tag = el.tagName.toLowerCase();
      const nativelyFocusable = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];
      if (nativelyFocusable.includes(tag) && !el.disabled) return null;
      if (el.hasAttribute('tabindex') && parseInt(el.getAttribute('tabindex')) >= 0) return null;

      // Onko elementillä rooli, joka edellyttää fokusoitavuutta?
      const interactiveRoles = [
        'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem',
        'option', 'switch', 'treeitem', 'gridcell', 'slider', 'spinbutton',
        'combobox', 'listbox', 'textbox', 'searchbox'
      ];
      const role = el.getAttribute('role');
      if (role && interactiveRoles.includes(role)) {
        return `EI_FOKUSOITAVISSA (role="${role}" mutta tabindex puuttuu!)`;
      }

      // onClick-attribuutti tai -kuuntelija havaittavissa DOMissa
      if (el.hasAttribute('onclick') || el.getAttribute('ng-click') || el.getAttribute('@click')) {
        return `EI_FOKUSOITAVISSA (klikattava elementti ilman tabindex-attribuuttia!)`;
      }

      return null;
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS D: Accessible name -varoitus
    // ─────────────────────────────────────────────────────────────
    // NVDA-lisäosa varoittaa "PUUTTUU (Ei saavutettavaa nimeä!)" kun
    // nav_obj.name on tyhjä. Sama tarkistus tehdään nyt laajennuksessa:
    // katsotaan löytyykö nimi aria-labelista, aria-labelledbysta tai
    // tekstisisällöstä. Varoitus koskee vain elementtejä, joilla on
    // interaktiivinen rooli tai tagi — muuten tulisi liikaa kohinaa.
    function getAccessibleNameWarning(el) {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || '';
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
      const interactiveRoles = [
        'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem',
        'switch', 'combobox', 'textbox', 'searchbox', 'slider'
      ];

      const isInteractive = interactiveTags.includes(tag) || interactiveRoles.includes(role);
      if (!isInteractive) return null;

      // KORJAUS: <label for="..."> on yleisin tapa nimetä lomakekenttä,
      // eikä se näy kentän omissa attribuuteissa lainkaan. Ilman tätä
      // tarkistusta jokainen oikein merkitty kenttä sai turhan varoituksen.
      let hasNativeLabel = false;
      try {
        hasNativeLabel = !!(el.labels && el.labels.length > 0);
      } catch (e) { /* ei labels-propertyä */ }

      const hasLabel =
        hasNativeLabel ||
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title') ||
        el.getAttribute('alt') ||
        el.textContent.trim().length > 0;

      if (!hasLabel) {
        return `VAROITUS: Ei saavutettavaa nimeä! (aria-label / tekstisisältö puuttuu)`;
      }
      return null;
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS G: Lomake-elementtien elävä tila (property, ei attribuutti)
    // ─────────────────────────────────────────────────────────────
    // Käyttäjän kirjoittama teksti ei näy value-ATTRIBUUTISSA, eikä
    // JavaScriptillä rastitettu valintaruutu checked-attribuutissa. Ne
    // elävät vain DOM-propertyinä. Siksi tallennetusta HTML-tiedostosta
    // ei näe lomakkeen todellista tilaa — tästä raportista näkee.
    // Salasanakentän arvoa ei kirjata.
    function getLiveState(el) {
      const tag = el.tagName.toLowerCase();
      const parts = [];

      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        const type = (el.type || '').toLowerCase();
        const isTicker = type === 'checkbox' || type === 'radio';
        if (type === 'password') {
          if (el.value) parts.push('value=<ei kirjata: salasanakenttä>');
        } else if (isTicker) {
          // valintaruudun value on lähes aina merkityksetön oletus "on"
        } else if (typeof el.value === 'string' && el.value !== '') {
          const v = el.value.length > 100 ? el.value.substring(0, 100) + '...' : el.value;
          parts.push(`value="${v}"`);
        }
        if (isTicker) parts.push(`checked=${el.checked}`);
        if (el.disabled) parts.push('disabled');
        if (el.readOnly) parts.push('readOnly');
        if (el.required) parts.push('required');
      }

      if (tag === 'details' || tag === 'dialog') parts.push(`open=${el.open}`);
      if (el.isContentEditable) parts.push('contentEditable');

      return parts.length > 0 ? ` **[TILA: ${parts.join(', ')}]**` : '';
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS E: CSS-selektorin ja Tampermonkey-snippetin generointi
    // ─────────────────────────────────────────────────────────────
    // Lisäosa generoi valmiin CSS- ja JS-koodin värien vaihtamiseksi.
    // Sama logiikka on nyt laajennuksessa: jokainen elementti, jolla on
    // poikkeavia värejä, saa raporttiin liimattavat code-snippetit.
    // Tämä lyhentää merkittävästi työvaiheita: ei tarvitse erikseen
    // rakentaa selektoria käsin DOM-puun perusteella.
    function buildCssSelector(el) {
      if (el.id) return `#${el.id}`;
      const tag = el.tagName.toLowerCase();
      if (el.classList && el.classList.length > 0) {
        const classes = Array.from(el.classList).join('.');
        return `${tag}.${classes}`;
      }
      return tag;
    }

    function buildColorSnippet(el, fgHex, bgHex, fillVal, strokeVal) {
      if (!fgHex && !bgHex && !fillVal && !strokeVal) return null;
      const sel = buildCssSelector(el);
      const lines = [];
      lines.push(`\n    [Värisnippetit]`);
      lines.push(`    CSS → ${sel} {`);
      if (fgHex) lines.push(`      color: ${fgHex}; /* vaihda tähän haluamasi */`);
      if (bgHex) lines.push(`      background-color: ${bgHex}; /* vaihda tähän haluamasi */`);
      if (fillVal) lines.push(`      fill: ${fillVal}; /* SVG-täyttöväri */`);
      if (strokeVal) lines.push(`      stroke: ${strokeVal}; /* SVG-viivaväri */`);
      lines.push(`    }`);
      lines.push(`    JS  → const el = document.querySelector('${sel}');`);
      if (fgHex) lines.push(`          if (el) el.style.color = '${fgHex}';`);
      if (bgHex) lines.push(`          if (el) el.style.backgroundColor = '${bgHex}';`);
      if (fillVal) lines.push(`          if (el) el.style.fill = '${fillVal}';`);
      if (strokeVal) lines.push(`          if (el) el.style.stroke = '${strokeVal}';`);
      return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────
    // Pääfunktio: kerää elementin tiedot rekursiivisesti
    // ─────────────────────────────────────────────────────────────
    function getElementData(el, depth = 0, hiddenAncestor = false) {
      if (!el || !el.tagName) return "";
      
      const ignore = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'DIV#dom-freeze-timer', 'DIV#freeze-overlay'];
      if (ignore.includes(el.tagName) || el.id === 'dom-freeze-timer' || el.id === 'freeze-overlay') return "";
  
      const indent = "  ".repeat(depth);
      const tag = el.tagName.toLowerCase();
      
      const id = el.id ? `#${el.id}` : "";
      let classes = "";
      if (el.classList && el.classList.length > 0) {
        classes = "." + Array.from(el.classList).join(".");
      }
      
      const importantAttrs = [
        'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
        'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-checked',
        'aria-pressed', 'aria-current', 'aria-disabled', 'aria-invalid',
        'aria-required', 'aria-live', 'aria-atomic', 'aria-modal',
        'aria-haspopup', 'aria-activedescendant', 'aria-level',
        'aria-owns', 'aria-controls',
        'href', 'src', 'alt', 'title', 'type', 'name', 'placeholder',
        'for', 'value', 'disabled', 'checked', 'readonly', 'lang',
        // SVG: fill-attribuutti kirjataan erikseen, koska CSS usein
        // ylikirjoittaa sen — vertaa tätä [VÄRIT: fill:...] -arvoon
        'fill', 'stroke',
        'data-testid', 'tabindex'
      ];
      let attrs = [];
      for (let attr of importantAttrs) {
        if (el.hasAttribute(attr)) {
          let value = el.getAttribute(attr);
          if (value && value.length > 300) value = value.substring(0, 300) + "...";
          attrs.push(`${attr}="${value}"`);
        }
      }
      const attrStr = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";

      if (tag === 'iframe') {
        return `${indent}- <iframe${id}${classes}>${attrStr} **[HUOM: IFRAME LÖYDETTY - SISÄLTÖÄ EI LUETA]**\n`;
      }
      
      let directText = "";
      for (let node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text.length > 0) {
            const truncated = text.length > 100 ? text.substring(0, 100) + "..." : text;
            directText += truncated + " ";
          }
        }
      }
      directText = directText.trim();
      let textPart = directText ? ` "${directText}"` : "";

      let statusTags = "";
      if (el === focusedEl) statusTags += " **[FOKUS]**"; 
      if (hoveredEls.includes(el) && el === hoveredEls[hoveredEls.length - 1]) statusTags += " **[HIIRI]**";

      // ── MUUTOS C: Lisätään fokusoitavuusvaroitus ──
      const focusWarn = getFocusabilityWarning(el);
      if (focusWarn) statusTags += ` **[${focusWarn}]**`;

      // ── MUUTOS D: Lisätään accessible name -varoitus ──
      const nameWarn = getAccessibleNameWarning(el);
      if (nameWarn) statusTags += ` **[${nameWarn}]**`;

      // ── MUUTOS G: Lomakkeen elävä tila ──
      statusTags += getLiveState(el);

      // ── MUUTOS A + B: Lasketut värit ──
      // bodyFgHex ja bodyBgHex lasketaan kerran performCapturen alussa,
      // ei enää jokaiselle elementille erikseen — getComputedStyle pakottaa
      // tyylien uudelleenlaskennan, ja isolla sivulla se maksoi tuhansia
      // turhia kutsuja.
      const vis = getComputedVisuals(el);
      const fgHex = rgbToHex(vis.fg);
      const bgHex = rgbToHex(vis.bg);

      // Värit kirjataan vain jos ne eroavat body:n väreistä, jotta
      // raportti pysyy luettavana — muuten jokainen div saisi samat
      // perityt arvot ja data olisi kohinaa.
      const hasCustomFg = fgHex && fgHex !== bodyFgHex;
      const hasCustomBg = bgHex && bgHex !== bodyBgHex;

      // fill ja stroke kirjataan aina kun ne on määritelty, koska SVG:llä
      // ne ovat se ainoa paikka, jossa tila (esim. varattu / vapaa) näkyy.
      // Stroken oletusarvo "none" jätetään pois kohinana.
      const fillVal = colorLabel(vis.fill);
      const strokeRaw = colorLabel(vis.stroke);
      const strokeVal = strokeRaw && strokeRaw !== 'none' ? strokeRaw : null;

      let colorPart = "";
      if (hasCustomFg || hasCustomBg || fillVal || strokeVal) {
        const parts = [];
        if (hasCustomFg) parts.push(`color:${fgHex}`);
        if (hasCustomBg) parts.push(`bg:${bgHex}`);
        if (fillVal) parts.push(`fill:${fillVal}`);
        if (strokeVal) parts.push(`stroke:${strokeVal}`);
        colorPart = ` **[VÄRIT: ${parts.join(", ")}]**`;
      }

      // ── MUUTOS H: Näkyykö elementti lainkaan? ──
      // Merkintä tehdään vain ylimmälle piilotetulle elementille, ei
      // jokaiselle sen lapselle — muuten piilotettu valikko täyttäisi
      // raportin samalla merkinnällä satoja kertoja.
      let isHidden = hiddenAncestor;
      if (!hiddenAncestor) {
        if (vis.display === 'none') {
          statusTags += ` **[PIILOTETTU: display:none]**`;
          isHidden = true;
        } else if (vis.visibility === 'hidden') {
          statusTags += ` **[PIILOTETTU: visibility:hidden]**`;
          isHidden = true;
        }
      }

      let info = `${indent}- <${tag}${id}${classes}>${attrStr}${textPart}${statusTags}${colorPart}\n`;

      // ── MUUTOS E: CSS/JS-snippetti, vain jos on räätälöityjä värejä ──
      const snippet = buildColorSnippet(el,
        hasCustomFg ? fgHex : null,
        hasCustomBg ? bgHex : null,
        fillVal,
        strokeVal
      );
      if (snippet) {
        info += `${indent}${snippet}\n`;
      }

      // Luetaan normaalit lapset (Light DOM)
      for (let child of el.children) {
        info += getElementData(child, depth + 1, isHidden);
      }

      // Luetaan Shadow DOM
      if (el.shadowRoot) {
        info += `${indent}  [SHADOW-ROOT]\n`;
        for (let child of el.shadowRoot.children) {
          info += getElementData(child, depth + 2, isHidden);
        }
      }
  
      return info;
    }
  
    if (!document.body) {
      alert("DOM ei ole vielä latautunut!");
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // Body-värit lasketaan KERRAN. Aiemmin getElementData laski nämä
    // uudelleen jokaiselle elementille, eli tuhansia turhia
    // getComputedStyle-kutsuja isolla sivulla.
    // ─────────────────────────────────────────────────────────────
    const bodyCs = window.getComputedStyle(document.body);
    const bodyFgHex = rgbToHex(bodyCs.color);
    const bodyBgHex = rgbToHex(bodyCs.backgroundColor);
  
    const pageTitle = document.title || "Ei otsikkoa";
    const pageUrl = window.location.href;
    
    let markdownContent = `# DOM-analyysi\n\n`;
    markdownContent += `**Sivu:** ${pageTitle}\n`;
    markdownContent += `**URL:** ${pageUrl}\n`;
    markdownContent += `**Aika:** ${new Date().toLocaleString('fi-FI')}\n`;
    
    if (document.activeElement) {
      let activeTag = document.activeElement.tagName.toLowerCase();
      let activeId = document.activeElement.id ? "#" + document.activeElement.id : "";
      markdownContent += `**Aktiivinen fokus:** <${activeTag}${activeId}>\n`;
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS F: Body-värit referenssinä raportin alkuun
    // ─────────────────────────────────────────────────────────────
    // Jotta elementtien väripoikkeamat ovat tulkittavissa, kirjataan
    // sivun oletusvärit ylös. Tämä auttaa kun analysoidaan esim.
    // kontrastisuhteita manuaalisesti tai vertaillaan NVDA-lisäosan
    // tuottamaan raporttiin.
    markdownContent += `**Body-värit (peritty oletusarvo):** color:${bodyFgHex || '?'} / background:${bodyBgHex || '?'}\n`;

    markdownContent += `\n---\n`;
    markdownContent += `## Merkinnät\n`;
    markdownContent += `- **[FOKUS]** — elementillä on fokus tallennushetkellä\n`;
    markdownContent += `- **[HIIRI]** — hiiri on elementin päällä\n`;
    markdownContent += `- **[EI_FOKUSOITAVISSA]** — interaktiivinen elementti ilman tabindex-attribuuttia\n`;
    markdownContent += `- **[VAROITUS: Ei saavutettavaa nimeä]** — aria-label / tekstisisältö puuttuu\n`;
    markdownContent += `- **[VÄRIT: ...]** — lasketut värit: color ja bg vain jos poikkeavat body-oletuksesta, fill ja stroke aina kun määritelty (SVG)\n`;
    markdownContent += `- **[TILA: ...]** — lomake-elementin elävä tila (value, checked, disabled) DOM-propertyistä, ei attribuuteista\n`;
    markdownContent += `- **[PIILOTETTU: ...]** — elementtiä ei piirretä ruudulle; merkintä vain ylimmällä piilotetulla tasolla\n`;
    markdownContent += `\n## Sivun rakenne\n\n`;
    markdownContent += getElementData(document.body);

    // ─────────────────────────────────────────────────────────────
    // MUUTOS I: Fokusoidun elementin outerHTML sellaisenaan
    // ─────────────────────────────────────────────────────────────
    // Puurakenteesta karsiutuu attribuutteja ja tekstiä. Tämä osio antaa
    // yhden elementin täydellisenä, jolloin sama tiedosto sisältää sekä
    // lasketut arvot että alkuperäisen merkkauksen samalta hetkeltä.
    if (focusedEl && focusedEl !== document.body) {
      let outer = "";
      try {
        outer = focusedEl.outerHTML || "";
      } catch (e) {
        outer = "(outerHTML ei saatavilla)";
      }
      const LIMIT = 8000;
      const truncated = outer.length > LIMIT;
      if (truncated) outer = outer.substring(0, LIMIT);

      markdownContent += `\n---\n`;
      markdownContent += `## Fokusoidun elementin outerHTML\n\n`;
      markdownContent += `Elementti: <${focusedEl.tagName.toLowerCase()}${focusedEl.id ? '#' + focusedEl.id : ''}>\n\n`;
      if (truncated) {
        markdownContent += `*(katkaistu ${LIMIT} merkin kohdalta)*\n\n`;
      }
      markdownContent += "```html\n" + outer + "\n```\n";
    }
    
    const blob = new Blob([markdownContent], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dom_analyysi_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!delay || delay <= 0) {
    performCapture();
    return;
  }

  // --- AJASTIN JA JÄÄDYTYS (ennallaan) ---
  const timerDiv = document.createElement('div');
  timerDiv.id = 'dom-freeze-timer';
  timerDiv.style.cssText = `
    position: fixed; top: 10px; right: 10px; 
    background: red; color: white; font-size: 20px; font-weight: bold; 
    padding: 15px; z-index: 2147483647; border-radius: 5px; 
    box-shadow: 0 0 10px rgba(0,0,0,0.5); pointer-events: none;
  `;
  document.body.appendChild(timerDiv);

  let secondsLeft = delay / 1000;
  timerDiv.innerText = `Jäädytys: ${secondsLeft} s`;

  const interval = setInterval(() => {
    secondsLeft--;
    timerDiv.innerText = `Jäädytys: ${secondsLeft} s`;

    if (secondsLeft <= 0) {
      clearInterval(interval);
      timerDiv.remove();
      
      performCapture();

      const overlay = document.createElement('div');
      overlay.id = 'freeze-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(255, 0, 0, 0.1); 
        z-index: 2147483647; 
        cursor: not-allowed;
        display: flex; justify-content: center; align-items: center;
        color: red; font-size: 30px; font-weight: bold; text-shadow: 1px 1px 2px black;
      `;
      overlay.innerText = "SIVU JÄÄDYTETTY (F8 jatkaa)";
      document.body.appendChild(overlay);

      setTimeout(() => {
        debugger; 
      }, 50);
    }
  }, 1000);
}
