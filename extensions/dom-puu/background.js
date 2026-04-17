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

    // ─────────────────────────────────────────────────────────────
    // MUUTOS A: Laskettujen värien kerääminen (computed colors)
    // ─────────────────────────────────────────────────────────────
    // getComputedStyle palauttaa sen värin, jonka selain oikeasti piirtää
    // ruudulle — ei inline-style-arvoa eikä CSS-muuttujan nimeä.
    // Tämä vastaa täsmälleen sitä, mitä NVDA-lisäosa lukee textInfos-
    // värikenttiin, joten laajennus ja lisäosa tuottavat nyt vertailu-
    // kelpoista dataa samasta elementistä.
    function getComputedColors(el) {
      try {
        const cs = window.getComputedStyle(el);
        const fg = cs.color;
        const bg = cs.backgroundColor;
        return { fg, bg };
      } catch (e) {
        return { fg: null, bg: null };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // MUUTOS B: rgb()-merkkijonon muuntaminen #RRGGBB-muotoon
    // ─────────────────────────────────────────────────────────────
    // Selain palauttaa värit muodossa "rgb(R, G, B)" tai
    // "rgba(R, G, B, A)". Muunnetaan ne heksadesimaaliksi, jotta
    // ne voi liimata suoraan CSS:ään tai Tampermonkey-skriptiin
    // — täsmälleen sama logiikka kuin lisäosan _color_to_hex().
    function rgbToHex(rgbStr) {
      if (!rgbStr || rgbStr === 'transparent') return null;
      const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      const toHex = n => parseInt(n).toString(16).padStart(2, '0').toUpperCase();
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
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

      const hasLabel =
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

    function buildColorSnippet(el, fgHex, bgHex) {
      if (!fgHex && !bgHex) return null;
      const sel = buildCssSelector(el);
      const lines = [];
      lines.push(`\n    [Värisnippetit]`);
      lines.push(`    CSS → ${sel} {`);
      if (fgHex) lines.push(`      color: ${fgHex}; /* vaihda tähän haluamasi */`);
      if (bgHex) lines.push(`      background-color: ${bgHex}; /* vaihda tähän haluamasi */`);
      lines.push(`    }`);
      lines.push(`    JS  → const el = document.querySelector('${sel}');`);
      if (fgHex) lines.push(`          if (el) el.style.color = '${fgHex}';`);
      if (bgHex) lines.push(`          if (el) el.style.backgroundColor = '${bgHex}';`);
      return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────
    // Pääfunktio: kerää elementin tiedot rekursiivisesti
    // ─────────────────────────────────────────────────────────────
    function getElementData(el, depth = 0) {
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
        'aria-owns', 'aria-controls',
        'href', 'src', 'alt', 'title', 'type', 'name', 'placeholder',
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

      // ── MUUTOS A + B: Lasketut värit ──
      const { fg, bg } = getComputedColors(el);
      const fgHex = rgbToHex(fg);
      const bgHex = rgbToHex(bg);

      // Värit kirjataan vain jos ne eroavat body:n väreistä, jotta
      // raportti pysyy luettavana — muuten jokainen div saisi samat
      // perityt arvot ja data olisi kohinaa.
      const bodyCs = window.getComputedStyle(document.body);
      const bodyFgHex = rgbToHex(bodyCs.color);
      const bodyBgHex = rgbToHex(bodyCs.backgroundColor);
      const hasCustomFg = fgHex && fgHex !== bodyFgHex;
      const hasCustomBg = bgHex && bgHex !== bodyBgHex;

      let colorPart = "";
      if (hasCustomFg || hasCustomBg) {
        const parts = [];
        if (hasCustomFg) parts.push(`color:${fgHex}`);
        if (hasCustomBg) parts.push(`bg:${bgHex}`);
        colorPart = ` **[VÄRIT: ${parts.join(", ")}]**`;
      }

      let info = `${indent}- <${tag}${id}${classes}>${attrStr}${textPart}${statusTags}${colorPart}\n`;

      // ── MUUTOS E: CSS/JS-snippetti, vain jos on räätälöityjä värejä ──
      const snippet = buildColorSnippet(el,
        hasCustomFg ? fgHex : null,
        hasCustomBg ? bgHex : null
      );
      if (snippet) {
        info += `${indent}${snippet}\n`;
      }

      // Luetaan normaalit lapset (Light DOM)
      for (let child of el.children) {
        info += getElementData(child, depth + 1);
      }

      // Luetaan Shadow DOM
      if (el.shadowRoot) {
        info += `${indent}  [SHADOW-ROOT]\n`;
        for (let child of el.shadowRoot.children) {
          info += getElementData(child, depth + 2);
        }
      }
  
      return info;
    }
  
    if (!document.body) {
      alert("DOM ei ole vielä latautunut!");
      return;
    }
  
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
    const bodyCs = window.getComputedStyle(document.body);
    const bodyFgHex = rgbToHex(bodyCs.color);
    const bodyBgHex = rgbToHex(bodyCs.backgroundColor);
    markdownContent += `**Body-värit (peritty oletusarvo):** color:${bodyFgHex || '?'} / background:${bodyBgHex || '?'}\n`;

    markdownContent += `\n---\n`;
    markdownContent += `## Merkinnät\n`;
    markdownContent += `- **[FOKUS]** — elementillä on fokus tallennushetkellä\n`;
    markdownContent += `- **[HIIRI]** — hiiri on elementin päällä\n`;
    markdownContent += `- **[EI_FOKUSOITAVISSA]** — interaktiivinen elementti ilman tabindex-attribuuttia\n`;
    markdownContent += `- **[VAROITUS: Ei saavutettavaa nimeä]** — aria-label / tekstisisältö puuttuu\n`;
    markdownContent += `- **[VÄRIT: ...]** — elementillä on body-oletuksesta poikkeavat lasketut värit\n`;
    markdownContent += `\n## Sivun rakenne\n\n`;
    markdownContent += getElementData(document.body);
    
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
