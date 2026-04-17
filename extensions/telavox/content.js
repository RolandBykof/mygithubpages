// =============================================================================
// Telavox-saavutettavuuslaajennus – content.js
//
// Rakenne: yksi nimiavaruus (TelavoxA11y) jonka alla nimetyt moduulit.
// Uuden ominaisuuden lisääminen:
//   1. Lisää uusi moduuliobjekti TelavoxA11y:n alle.
//   2. Rekisteröi mahdollinen pikanäppäin keyboard-moduulissa.
//   3. Kutsu moduulin init() TelavoxA11y.init():ssa jos tarvitaan.
// Ominaisuuden poistaminen:
//   1. Poista moduuliobjekti.
//   2. Poista pikanäppäin keyboard-moduulista.
//   3. Poista kutsu TelavoxA11y.init():sta.
// =============================================================================

const TelavoxA11y = {};

// ---------------------------------------------------------------------------
// Moduuli: core
// Yhteiset apufunktiot, joita muut moduulit käyttävät.
// ---------------------------------------------------------------------------
TelavoxA11y.core = {

  // Luo piilossa oleva aria-live-alue ja ilmoittaa sille viestin.
  announceToScreenReader(message) {
    let announcer = document.getElementById('a11y-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'a11y-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText =
        'position: absolute; width: 1px; height: 1px; margin: -1px; ' +
        'padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;';
      document.body.appendChild(announcer);
    }
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 50);
  },

  // Etsii saapuvan puhelun vastaa-painikkeen.
  // Palauttaa null, jos puhelu on jo käynnissä (katkaisupainike näkyvissä).
  findAnswerButton() {
    const hangupPresent =
      !!document.querySelector('div.text-xs.text-white') &&
      Array.from(document.querySelectorAll('div.text-xs.text-white'))
        .some(el => el.textContent.trim() === 'Katkaise');
    if (hangupPresent) return null;
    return document.querySelector('button.bg-green.size-10');
  },

  // Etsii puhelupainikkeen sen vieressä olevan tekstitunnisteen perusteella.
  findCallButtonByText(text) {
    const labels = Array.from(document.querySelectorAll('div.text-xs.text-white'));
    const targetLabel = labels.find(el => el.textContent.trim() === text);
    if (
      targetLabel &&
      targetLabel.previousElementSibling &&
      targetLabel.previousElementSibling.tagName.toLowerCase() === 'button'
    ) {
      return targetLabel.previousElementSibling;
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Moduuli: styles
// Saavutettavuustila: parantaa värikontrasteja ja tekstikokoja (Alt + A).
//
// Mitä korjataan ja miksi:
//  bg-flavor-9/8/7  kirkkaat vihreät avatareissa  → tummennettu ~5.2:1
//  bg-red            #e53935 (4.23:1)              → #b71c1c (5.9:1)
//  div.truncate.text-sm.text-gray-500 (tilateksti) → musta/keltainen ~13:1,
//    fonttikoko 10.5pt → 14pt, lihavoitu
// ---------------------------------------------------------------------------
TelavoxA11y.styles = {

  STYLE_ID: 'a11y-visual-styles',

  // Ottaa käyttöön (tai poistaa käytöstä) saavutettavuustilan.
  // Palauttaa true kun tila kytkettiin päälle, false kun pois.
  toggle() {
    const existing = document.getElementById(this.STYLE_ID);
    if (existing) {
      existing.remove();
      return false;
    }

    const style = document.createElement('style');
    style.id = this.STYLE_ID;
    style.textContent = `
      /* Avatar-taustat: kirkkaat vihreät tummennettu WCAG AA -tasolle.
         Tummuus valittu vastaamaan jo läpäisevää bg-flavor-5 (#178549, 4.68:1). */
      .bg-flavor-9 { background-color: #1a7a3c !important; }
      .bg-flavor-8 { background-color: #1a7a3c !important; }
      .bg-flavor-7 { background-color: #1a7a3c !important; }

      /* Punainen ilmoituspallo: oli #e53935 (4.23:1), nyt #b71c1c (5.9:1) */
      .bg-red { background-color: #b71c1c !important; }

      /* Tilateksti "Käytettävissä" ja vastaavat:
         NVDA mittasi #727272 / #ECECEC = 3.9:1 (failaa AA).
         Muutettu musta teksti keltaiselle taustalle heikkonäköistä varten.
         Kontrasti #000000 / #FFD700 = ~13:1 (ylittää WCAG AAA).
         Fonttikoko kasvatettu 10.5pt → 14pt, lihavoitu erottuvuuden maksimoimiseksi. */
      div.truncate.text-sm.text-gray-500 {
        color: #000000 !important;
        background-color: #FFD700 !important;
        font-size: 14pt !important;
        font-weight: bold !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
      }
    `;
    document.head.appendChild(style);
    return true;
  },

  // Palauttaa istuntomuistista tallennetun tilan sivun latautuessa.
  init() {
    if (sessionStorage.getItem('a11y-visual-on') === '1') {
      this.toggle();
    }
  },
};

// ---------------------------------------------------------------------------
// Moduuli: diagnostics
// Kontrasti- ja värianalyysi koko sivulle (Alt + D).
// Lataa tulokset JSON-tiedostona.
// ---------------------------------------------------------------------------
TelavoxA11y.diagnostics = {

  relativeLuminance(r, g, b) {
    const toLinear = c => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  },

  contrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  parseRgb(str) {
    const m = str.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  },

  toHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  },

  run() {
    TelavoxA11y.core.announceToScreenReader('Diagnostiikka käynnistetty, odota hetki...');

    setTimeout(() => {
      const seen   = new Map();
      const issues = [];
      const ok     = [];

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT
      );

      let node;
      while ((node = walker.nextNode())) {
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) continue;

        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        // Vain elementit joilla on suoraa tekstiä
        const directText = Array.from(node.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent.trim())
          .join('');
        if (!directText) continue;

        const fgRgb = this.parseRgb(style.color);
        const bgRgb = this.parseRgb(style.backgroundColor);
        if (!fgRgb || !bgRgb) continue;

        // Ohitetaan täysin läpinäkyvät taustat
        if (style.backgroundColor === 'rgba(0, 0, 0, 0)') continue;

        const fgHex = this.toHex(fgRgb);
        const bgHex = this.toHex(bgRgb);
        const key   = `${fgHex}|${bgHex}`;
        if (seen.has(key)) continue;
        seen.set(key, true);

        const lFg      = this.relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
        const lBg      = this.relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
        const ratio    = this.contrastRatio(lFg, lBg);
        const ratioStr = ratio.toFixed(2) + ':1';

        const wcagAA  = ratio >= 4.5 ? 'LÄPÄISEE AA'  : 'EI LÄPÄISE AA';
        const wcagAAA = ratio >= 7.0 ? 'LÄPÄISEE AAA' : 'EI LÄPÄISE AAA';

        const sample = directText.length > 60
          ? directText.slice(0, 57) + '...'
          : directText;

        const tailwindLuokat = Array.from(node.classList)
          .filter(c => c.startsWith('text-') || c.startsWith('bg-'))
          .join(' ') || '—';

        const entry = {
          tekstiväri:     fgHex,
          taustaväri:     bgHex,
          kontrastisuhde: ratioStr,
          wcagAA,
          wcagAAA,
          tailwindLuokat,
          esimerkki:      sample,
          elementti:      node.tagName.toLowerCase(),
        };

        if (ratio < 4.5) {
          issues.push(entry);
        } else {
          ok.push(entry);
        }
      }

      // Pienin kontrasti ensin
      issues.sort((a, b) =>
        parseFloat(a.kontrastisuhde) - parseFloat(b.kontrastisuhde)
      );

      const report = {
        ajettu:     new Date().toLocaleString('fi-FI'),
        url:        window.location.href,
        yhteenveto: {
          tarkasteltuPareja: issues.length + ok.length,
          ongelmallisia:     issues.length,
          läpäiseviä:        ok.length,
        },
        ongelmat_ensin: issues,
        läpäisevät:     ok,
      };

      const blob      = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url       = URL.createObjectURL(blob);
      const a         = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      a.href     = url;
      a.download = `kontrasti_analyysi_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      TelavoxA11y.core.announceToScreenReader(
        `Diagnostiikka valmis. ${issues.length} ongelmallista väriparia löytyi. Tiedosto ladattu.`
      );
    }, 200);
  },
};

// ---------------------------------------------------------------------------
// Moduuli: calls
// Puhelunhallinta: vastaa, katkaise, mykistä, siirrä.
// ---------------------------------------------------------------------------
TelavoxA11y.calls = {

  isMuted: false,

  answer() {
    const btn = TelavoxA11y.core.findAnswerButton();
    if (btn) {
      btn.click();
      TelavoxA11y.core.announceToScreenReader('Puheluun vastattu');
    } else {
      TelavoxA11y.core.announceToScreenReader('Vastaa-painiketta ei löytynyt');
    }
  },

  hangup() {
    const btn = TelavoxA11y.core.findCallButtonByText('Katkaise');
    if (btn) {
      btn.click();
      TelavoxA11y.core.announceToScreenReader('Puhelu katkaistu');
    } else {
      TelavoxA11y.core.announceToScreenReader('Katkaisupainiketta ei löytynyt');
    }
  },

  toggleMute() {
    const bottomButtons = document.querySelectorAll(
      'div.flex.items-center.justify-evenly.p-3 button'
    );
    if (bottomButtons.length > 0) {
      bottomButtons[0].click();
      this.isMuted = !this.isMuted;
      TelavoxA11y.core.announceToScreenReader(
        this.isMuted ? 'Mikrofoni mykistetty' : 'Mikrofoni avattu'
      );
    } else {
      TelavoxA11y.core.announceToScreenReader('Mykistyspainiketta ei löytynyt');
    }
  },

  transfer() {
    const btn = TelavoxA11y.core.findCallButtonByText('Siirrä');
    if (btn) {
      btn.click();
      TelavoxA11y.core.announceToScreenReader('Puhelun siirtoikkuna avattu');
    } else {
      TelavoxA11y.core.announceToScreenReader('Siirtopainiketta ei löytynyt');
    }
  },
};

// ---------------------------------------------------------------------------
// Moduuli: contacts
// Saavutettava yhteystietolista (Alt + L).
// ---------------------------------------------------------------------------
TelavoxA11y.contacts = {

  // Avaa tai päivittää yhteystietolistan modalin.
  open() {
    const contacts = this._gatherContacts();
    if (contacts.length === 0) return;

    let dialog = document.getElementById('a11y-contact-dialog');
    if (dialog) dialog.remove();

    dialog = document.createElement('dialog');
    dialog.id = 'a11y-contact-dialog';
    dialog.setAttribute('role', 'application');
    dialog.setAttribute('aria-label', 'Yhteystiedot');
    dialog.style.cssText = `
      padding: 20px; border-radius: 8px; border: 2px solid #333;
      background: #fff; min-width: 350px; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; padding: 0; margin: 0;';

    contacts.forEach(contact => {
      const li  = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'a11y-contact-btn';
      btn.setAttribute('data-name', contact.name);
      btn.setAttribute('aria-label', `${contact.name}, ${contact.status}`);
      btn.innerHTML = `<strong>${contact.name}</strong><br><small>${contact.status}</small>`;
      btn.style.cssText = `
        width: 100%; text-align: left; padding: 10px; margin-bottom: 5px;
        border: 1px solid #ccc; cursor: pointer; background: #f9f9f9; border-radius: 4px;
      `;
      btn.onfocus = () => { btn.style.background = '#e0f0ff'; btn.style.borderColor = '#0066cc'; };
      btn.onblur  = () => { btn.style.background = '#f9f9f9'; btn.style.borderColor = '#ccc'; };
      btn.onclick = () => { contact.element.click(); dialog.close(); };
      li.appendChild(btn);
      list.appendChild(li);
    });

    dialog.appendChild(list);
    document.body.appendChild(dialog);
    dialog.showModal();

    const buttons = Array.from(dialog.querySelectorAll('.a11y-contact-btn'));
    if (buttons.length > 0) setTimeout(() => buttons[0].focus(), 50);

    dialog.onkeydown = async (e) => {
      const currentIndex = buttons.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      const currentContact = contacts[currentIndex];

      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        dialog.close();
        await this._performAction(currentContact.element, 'call');
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        dialog.close();
        await this._performAction(currentContact.element, 'email');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        buttons[(currentIndex + 1) % buttons.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        buttons[(currentIndex - 1 + buttons.length) % buttons.length].focus();
      } else if (e.key.length === 1 && e.key.match(/[a-zåäö]/i)) {
        const char  = e.key.toLowerCase();
        const match =
          buttons.find((b, i) => i > currentIndex && b.getAttribute('data-name').toLowerCase().startsWith(char)) ||
          buttons.find(b => b.getAttribute('data-name').toLowerCase().startsWith(char));
        if (match) match.focus();
      }
    };
  },

  // Kerää yhteystiedot DOM:sta ja palauttaa lajitellun taulukon.
  _gatherContacts() {
    const contacts  = [];
    const seenNames = new Set();
    document.querySelectorAll('div[role="menuitem"]').forEach(item => {
      const nameEl   = item.querySelector('div[class*="text-base"]');
      const statusEl = item.querySelector('div[class*="text-sm"]');
      if (!nameEl) return;
      const name   = nameEl.textContent.trim();
      const status = statusEl ? statusEl.textContent.trim() : 'Ei tilaa';
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        contacts.push({ name, status, element: item });
      }
    });
    contacts.sort((a, b) => a.name.localeCompare(b.name));
    return contacts;
  },

  // Klikkaa yhteystietokorttia ja suorittaa valitun toiminnon.
  async _performAction(element, type) {
    element.click();
    await new Promise(r => setTimeout(r, 600));
    if (type === 'call') {
      const btn = document.querySelector('button.bg-green.size-10');
      if (btn) btn.click();
    } else if (type === 'email') {
      const link = document.querySelector('a[href^="mailto:"]');
      if (link) link.click();
    }
  },
};

// ---------------------------------------------------------------------------
// Moduuli: help
// Ohje-ikkuna pikanäppäimistä (Alt + H).
// ---------------------------------------------------------------------------
TelavoxA11y.help = {

  SHORTCUTS: [
    { key: 'Alt + L',           desc: 'Avaa yhteystietolista' },
    { key: 'Alt + V',           desc: 'Vastaa saapuvaan puheluun' },
    { key: 'Alt + X',           desc: 'Katkaise puhelu' },
    { key: 'Alt + M',           desc: 'Mykistä / poista mykistys' },
    { key: 'Alt + S',           desc: 'Avaa puhelun siirtoikkuna' },
    { key: 'Alt + A',           desc: 'Saavutettavuustila päälle/pois' },
    { key: 'Alt + D',           desc: 'Aja kontrasti- ja värianalyysi' },
    { key: 'Alt + H',           desc: 'Avaa / sulje tämä ohje' },
    { key: '',                  desc: '— Yhteystietolistan sisällä —' },
    { key: 'Nuoli alas / ylös', desc: 'Selaa yhteystietoja' },
    { key: 'Kirjain',           desc: 'Hyppää seuraavaan samalla alkukirjaimella' },
    { key: 'Alt + C',           desc: 'Soita valitulle yhteystiedolle' },
    { key: 'Alt + E',           desc: 'Lähetä sähköposti valitulle' },
    { key: 'Esc',               desc: 'Sulje lista / ohje' },
  ],

  // Avaa tai sulkee ohje-ikkunan.
  toggle() {
    let dialog = document.getElementById('a11y-help-dialog');
    if (dialog) { dialog.close(); dialog.remove(); return; }

    dialog = document.createElement('dialog');
    dialog.id = 'a11y-help-dialog';
    dialog.setAttribute('aria-label', 'Pikanäppäinohjeet');
    dialog.style.cssText = `
      padding: 24px; border-radius: 8px; border: 2px solid #333;
      background: #fff; min-width: 380px; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    const heading = document.createElement('h2');
    heading.textContent = 'Pikanäppäinohjeet';
    heading.style.cssText = 'margin-top: 0; font-size: 1.2rem;';
    dialog.appendChild(heading);

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse: collapse; width: 100%;';
    table.setAttribute('role', 'grid');

    this.SHORTCUTS.forEach(({ key, desc }) => {
      const tr = document.createElement('tr');
      if (!key) {
        const td = document.createElement('td');
        td.colSpan = 2;
        td.textContent = desc;
        td.style.cssText = 'padding: 10px 4px 4px; font-weight: bold; font-size: 0.85rem; color: #555;';
        tr.appendChild(td);
      } else {
        const tdKey = document.createElement('td');
        tdKey.style.cssText = 'padding: 6px 12px 6px 4px; white-space: nowrap; font-family: monospace; font-size: 0.95rem;';
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        kbd.style.cssText = `
          background: #f0f0f0; border: 1px solid #aaa; border-radius: 3px;
          padding: 2px 6px; font-family: monospace;
        `;
        tdKey.appendChild(kbd);

        const tdDesc = document.createElement('td');
        tdDesc.textContent = desc;
        tdDesc.style.cssText = 'padding: 6px 4px;';

        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
      }
      table.appendChild(tr);
    });

    dialog.appendChild(table);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Sulje (Esc)';
    closeBtn.style.cssText = `
      margin-top: 16px; padding: 8px 16px; cursor: pointer;
      border: 1px solid #333; border-radius: 4px; background: #f0f0f0;
    `;
    closeBtn.onclick = () => { dialog.close(); dialog.remove(); };
    dialog.appendChild(closeBtn);

    document.body.appendChild(dialog);
    dialog.showModal();
    setTimeout(() => closeBtn.focus(), 50);
    dialog.addEventListener('close', () => dialog.remove());
  },
};

// ---------------------------------------------------------------------------
// Moduuli: observer
// MutationObserver: lisää aria-label vastaa-painikkeelle ja ilmoittaa
// soittajan nimen NVDA:lle 3 sekunnin välein saapuvan puhelun aikana.
// ---------------------------------------------------------------------------
TelavoxA11y.observer = {

  _interval: null,

  _getCallerName() {
    const el = document.querySelector(
      'div.overflow-hidden.text-ellipsis.whitespace-nowrap.text-white'
    );
    return el ? el.textContent.trim() : null;
  },

  _labelAnswerButton() {
    const btn = document.querySelector('button.bg-green.size-10');
    if (btn && !btn.getAttribute('aria-label')) {
      btn.setAttribute('aria-label', 'Vastaa puheluun');
    }
  },

  _startCallerAnnouncements() {
    if (this._interval) return;
    const name = this._getCallerName();
    if (!name) return;

    TelavoxA11y.core.announceToScreenReader(name);

    this._interval = setInterval(() => {
      if (!document.querySelector('button.bg-green.size-10')) {
        this._stopCallerAnnouncements();
        return;
      }
      const currentName = this._getCallerName();
      if (currentName) TelavoxA11y.core.announceToScreenReader(currentName);
    }, 3000);
  },

  _stopCallerAnnouncements() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  },

  init() {
    const obs = new MutationObserver(() => {
      this._labelAnswerButton();
      if (document.querySelector('button.bg-green.size-10')) {
        this._startCallerAnnouncements();
      } else {
        this._stopCallerAnnouncements();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Ajetaan kerran heti sivun latautuessa
    this._labelAnswerButton();
  },
};

// ---------------------------------------------------------------------------
// Moduuli: keyboard
// Globaalit pikanäppäimet. Lisää uudet näppäimet tähän listaan.
// ---------------------------------------------------------------------------
TelavoxA11y.keyboard = {

  // Jokainen merkintä: { altKey: true/false, key: 'kirjain', handler: fn }
  BINDINGS: [
    {
      altKey: true, key: 'v',
      handler: () => TelavoxA11y.calls.answer(),
    },
    {
      altKey: true, key: 'x',
      handler: () => TelavoxA11y.calls.hangup(),
    },
    {
      altKey: true, key: 'm',
      handler: () => TelavoxA11y.calls.toggleMute(),
    },
    {
      altKey: true, key: 's',
      handler: () => TelavoxA11y.calls.transfer(),
    },
    {
      altKey: true, key: 'l',
      handler: () => TelavoxA11y.contacts.open(),
    },
    {
      altKey: true, key: 'h',
      handler: () => TelavoxA11y.help.toggle(),
    },
    {
      altKey: true, key: 'a',
      handler: () => {
        const isOn = TelavoxA11y.styles.toggle();
        sessionStorage.setItem('a11y-visual-on', isOn ? '1' : '0');
        TelavoxA11y.core.announceToScreenReader(
          isOn
            ? 'Saavutettavuustila käytössä: värit ja tekstikoot korjattu'
            : 'Saavutettavuustila pois käytöstä'
        );
      },
    },
    {
      altKey: true, key: 'd',
      handler: () => TelavoxA11y.diagnostics.run(),
    },
  ],

  init() {
    document.addEventListener('keydown', (e) => {
      for (const binding of this.BINDINGS) {
        if (
          e.altKey === (binding.altKey ?? false) &&
          e.key.toLowerCase() === binding.key
        ) {
          e.preventDefault();
          binding.handler();
          return;
        }
      }
    });
  },
};

// ---------------------------------------------------------------------------
// Käynnistys
// ---------------------------------------------------------------------------
TelavoxA11y.init = function () {
  TelavoxA11y.styles.init();
  TelavoxA11y.observer.init();
  TelavoxA11y.keyboard.init();
};

TelavoxA11y.init();
