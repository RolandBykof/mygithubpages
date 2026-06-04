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

  // Palauttaa true kun puhelu on käynnissä (Katkaise-painike näkyvissä).
  isActive() {
    return Array.from(document.querySelectorAll('div.text-xs.text-white'))
      .some(el => el.textContent.trim() === 'Katkaise');
  },

  // Kopioi soittajan numeron leikepöydälle puhelun aikana (Alt + C).
  copyCallerNumber() {
    // Soittajan numero on communication-canvas-paneelissa
    // elementissä div.text-gray-400 (kellonaika- ja numerorivin veli)
    const canvas = document.getElementById('communication-canvas');
    if (!canvas) {
      TelavoxA11y.core.announceToScreenReader('Ei numeroa');
      return;
    }
    // Numero on div joka sisältää text-gray-400 -luokan ja
    // joka on sisaruksena soittajan nimelle (text-white)
    const numberEl = canvas.querySelector(
      'div.flex.items-center.gap-x-1'
    );
    const number = numberEl ? numberEl.textContent.trim() : null;
    if (!number) {
      TelavoxA11y.core.announceToScreenReader('Ei numeroa');
      return;
    }
    navigator.clipboard.writeText(number).then(() => {
      TelavoxA11y.core.announceToScreenReader(`Numero kopioitu: ${number}`);
    }).catch(() => {
      TelavoxA11y.core.announceToScreenReader('Kopiointi epäonnistui');
    });
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
      const canCall = !!contact.callBtn;
      let ariaLabel = contact.members !== null
        ? `${contact.name}, ${contact.status}, kirjautunut: ${contact.members}`
        : `${contact.name}, ${contact.status}`;
      if (!canCall && contact.members !== null) ariaLabel += ', ei soittomahdollisuutta';
      btn.setAttribute('aria-label', ariaLabel);
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
        await this._performAction(currentContact.element, 'call', currentContact.callBtn);
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        dialog.close();
        await this._performAction(currentContact.element, 'email', currentContact.callBtn);
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

  // Odottaa enintään maxMs ms, että PBX-näkymään ilmestyy vähintään yksi
  // div[role="menuitem"]. Palauttaa true jos löytyi, false jos aikakatkaisu.
  _waitForContacts(maxMs = 3000) {
    return new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        if (document.querySelector('div[role="menuitem"]')) {
          resolve(true);
        } else if (Date.now() - start > maxMs) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 150);
    });
  },

  // Kerää kohteet DOM:sta ja palauttaa lajitellun taulukon.
  // Poimii myös jonon jäsenmäärän (kirjautuneet), jos se on näkyvissä.
  _gatherContacts() {
    const contacts  = [];
    const seenNames = new Set();
    document.querySelectorAll('div[role="menuitem"]').forEach(item => {
      const nameEl   = item.querySelector('div[class*="text-base"]');
      const statusEl = item.querySelector('div[class*="text-sm"]');
      if (!nameEl) return;
      const name   = nameEl.textContent.trim();
      const status = statusEl ? statusEl.textContent.trim() : 'Ei tilaa';

      // Jono-/ryhmäalkioissa näkyy kirjautuneiden määrä lihavoituna luvuna
      // palkin sisällä, joka piilotetaan hover-tilassa.
      const badgeEl  = item.querySelector('[class*="group-hover:hidden"] [class*="font-bold"]');
      const members  = badgeEl ? badgeEl.textContent.trim() : null;

      // Jonoilla soittopainike löytyy suoraan hover-containerista (button.bg-green).
      // Yhteystiedoilla tätä ei ole – siellä soitto tapahtuu kortin kautta.
      const callBtn = item.querySelector('button.bg-green') || null;

      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        contacts.push({ name, status, members, element: item, callBtn });
      }
    });
    contacts.sort((a, b) => a.name.localeCompare(b.name));
    return contacts;
  },

  // Klikkaa yhteystietokorttia tai jonon soittopainiketta ja suorittaa
  // valitun toiminnon.
  // callBtn: button.bg-green jonon hover-containerista (vain jonoilla).
  //   Jos annettu ja type==='call', soitetaan suoraan ilman kortin klikkausta.
  //   Jos null (yhteystiedot), käytetään vanhaa tapaa.
  // Huom: jonoille ei ole sähköpostilinkkiä DOM:ssa.
  async _performAction(element, type, callBtn = null) {
    if (type === 'call' && callBtn) {
      callBtn.click();
      return;
    }
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
// Moduuli: callLog
// Saavutettava puheluluettelo (Alt + L puhelunäkymässä /calls).
//
// Kerää <ol>-listasta puhelutiedot: nimi, numero, jono, aika, päivämäärä ja
// suunta. Suunta tunnistetaan SVG-kuvakkeen lasketusta väristä:
//   – Punainen sävyinen → Vastaamaton
//   – Vihreä sävyinen   → Vastattu
//   – Muu (harmaa tms.) → Soitettu  (yleisin fallback)
// Jos väriä ei voida jäsentää, palataan neutraaliin "Puhelu"-merkkijonoon.
//
// ---------------------------------------------------------------------------
TelavoxA11y.callLog = {

  // Avaa tai sulkee puheluluettelon.
  open() {
    const existing = document.getElementById('a11y-calllog-dialog');
    if (existing) { existing.close(); existing.remove(); return; }

    const calls = this._gatherCalls();
    if (calls.length === 0) {
      TelavoxA11y.core.announceToScreenReader('Puheluluettelo on tyhjä tai ei löydy');
      return;
    }

    const dialog = document.createElement('dialog');
    dialog.id = 'a11y-calllog-dialog';
    dialog.setAttribute('aria-label', 'Puheluluettelo');
    // role="application" pakottaa NVDA:n ja JAWSin vuorovaikutustilaan,
    // jotta nuolinäppäimet toimivat listan selaamiseen virtuaalitilan sijaan.
    dialog.setAttribute('role', 'application');
    dialog.style.cssText = `
      padding: 20px; border-radius: 8px; border: 2px solid #333;
      background: #fff; min-width: 420px; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    const heading = document.createElement('h2');
    heading.textContent = `Puheluluettelo (${calls.length} puhelua)`;
    heading.style.cssText = 'margin-top: 0; font-size: 1.1rem;';
    heading.tabIndex = -1;
    dialog.appendChild(heading);

    const hint = document.createElement('p');
    hint.textContent = 'Nuoli alas/ylös selaa, kirjain hyppää alkukirjaimeen, Alt+C soittaa takaisin, Alt+E sähköposti, Alt+K toistaa ääniviestin, Enter avaa puhelun, Esc sulkee.';
    hint.style.cssText = 'margin: 0 0 12px; font-size: 0.82rem; color: #555;';
    dialog.appendChild(hint);

    const list = document.createElement('ul');
    list.style.cssText = 'list-style: none; padding: 0; margin: 0;';

    calls.forEach(call => {
      const li  = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'a11y-calllog-btn';
      btn.setAttribute('data-name', (call.name || call.phone || '').toLowerCase());
      btn.setAttribute('aria-label', this._buildLabel(call));
      btn.innerHTML = `
        <div style="font-weight:bold">${this._escHtml(call.name || call.phone)}</div>
        <div style="font-size:0.85rem;color:#555">
          ${call.date ? this._escHtml(call.date) + ', ' : ''}klo ${this._escHtml(call.time)}
          ${call.phone && call.name ? ' | ' + this._escHtml(call.phone) : ''}
          ${call.queue ? ' | ' + this._escHtml(call.queue) : ''}
        </div>
      `;
      btn.style.cssText = `
        width: 100%; text-align: left; padding: 10px; margin-bottom: 5px;
        border: 1px solid #ccc; cursor: pointer; background: #f9f9f9; border-radius: 4px;
      `;
      btn.onfocus = () => { btn.style.background = '#e0f0ff'; btn.style.borderColor = '#0066cc'; };
      btn.onblur  = () => { btn.style.background = '#f9f9f9'; btn.style.borderColor = '#ccc'; };
      btn.onclick = () => {
        dialog.close(); dialog.remove();
        if (call.link) window.location.href = call.link;
      };
      li.appendChild(btn);
      list.appendChild(li);
    });

    dialog.appendChild(list);

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

    const buttons = Array.from(dialog.querySelectorAll('.a11y-calllog-btn'));
    if (buttons.length > 0) setTimeout(() => buttons[0].focus(), 50);

    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('keydown', async (e) => {
      const btns = Array.from(dialog.querySelectorAll('.a11y-calllog-btn'));
      const idx  = btns.indexOf(document.activeElement);
      if (idx === -1) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        btns[(idx + 1) % btns.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        btns[(idx - 1 + btns.length) % btns.length].focus();
      } else if (e.altKey && e.key.toLowerCase() === 'c') {
        // Soita takaisin: klikataan suoraan li:n sisällä olevaa vihreää soittopainiketta
        e.preventDefault();
        dialog.close(); dialog.remove();
        const callBtn = calls[idx].element.querySelector('button.bg-green');
        if (callBtn) {
          callBtn.click();
        } else {
          TelavoxA11y.core.announceToScreenReader('Soittopainiketta ei löydy');
        }
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        // Sähköposti: navigoidaan puhelun sivulle ja etsitään mailto-linkki
        e.preventDefault();
        dialog.close(); dialog.remove();
        window.location.href = calls[idx].link;
        await new Promise(r => setTimeout(r, 800));
        const mailLink = document.querySelector('a[href^="mailto:"]');
        if (mailLink) {
          mailLink.click();
        } else {
          TelavoxA11y.core.announceToScreenReader('Sähköpostilinkkiä ei löydy tällä sivulla');
        }
      } else if (e.altKey && e.key.toLowerCase() === 'k') {
        // Toista ääniviesti – toggle: sama näppäin käynnistää ja pysäyttää.
        e.preventDefault();
        const call = calls[idx];
        if (call.voiceBtn) {
          call.voiceBtn.click();
          TelavoxA11y.core.announceToScreenReader('Toistetaan ääniviesti');
        } else {
          TelavoxA11y.core.announceToScreenReader('Ei ääniviestiä tässä puhelussa');
        }
      } else if (!e.altKey && e.key.length === 1 && e.key.match(/[a-zåäö0-9]/i)) {
        const char = e.key.toLowerCase();
        const match =
          btns.find((b, i) => i > idx && b.getAttribute('data-name').startsWith(char)) ||
          btns.find(b => b.getAttribute('data-name').startsWith(char));
        if (match) match.focus();
      }
    });
  },

  // Rakentaa ruudunlukijalle luettavan aria-labelin.
  // Jos puheluun liittyy ääniviesti, lisätään se labeliin heti nimen jälkeen.
  _buildLabel(call) {
    const parts = [];
    if (call.name)     parts.push(call.name);
    if (call.voiceBtn) parts.push('ääniviesti');
    if (call.phone)    parts.push(call.phone);
    if (call.date)     parts.push(call.date);
    if (call.time)     parts.push(`kello ${call.time}`);
    if (call.queue)    parts.push(call.queue);
    return parts.filter(Boolean).join(', ');
  },


  // Kerää puhelut DOM:sta.
  // <ol> sisältää vuorotellen div.sticky (päivämäärä) ja li (puhelu).
  _gatherCalls() {
    const calls = [];
    const ol = document.querySelector('div.leftnav ol');
    if (!ol) return calls;

    let currentDate = '';

    Array.from(ol.children).forEach(child => {
      // Päivämäärä-otsikko (div.sticky)
      if (child.classList.contains('sticky')) {
        const span = child.querySelector('span');
        if (span) currentDate = span.textContent.trim();
        return;
      }

      // Puhelurivi (li)
      if (child.tagName !== 'LI') return;

      const a = child.querySelector('a[href^="/calls/"]');
      if (!a) return;
      const link = a.getAttribute('href');

      // Nimi
      const nameEl = child.querySelector('span.min-w-0.truncate');
      const name   = nameEl ? nameEl.textContent.trim() : '';

      // Aika – elementti piilotetaan hover-tilassa (group-hover:hidden)
      const timeEl = child.querySelector('[class*="group-hover:hidden"]');
      const time   = timeEl ? timeEl.textContent.trim() : '';

      // Puhelinnumero ja jono
      const detailDiv = child.querySelector(
        'div.text-sm.leading-6.text-gray-500.antialiased.truncate'
      );
      let phone = '', queue = '';
      if (detailDiv) {
        const spans = Array.from(detailDiv.querySelectorAll('span'));
        phone = spans[0] ? spans[0].textContent.trim() : '';
        queue = spans[1] ? spans[1].textContent.replace('•', '').trim() : '';
      }

      // Ääniviesti: tunnistetaan toisto-painikkeesta (title="Käynnistä").
      const voiceBtn   = child.querySelector('button[title="Käynnistä"]') || null;
      const voiceAudio = child.querySelector('audio[src*="voiceMessages"]') || null;

      calls.push({ name, time, date: currentDate, phone, queue, link, element: child, voiceBtn, voiceAudio });
    });

    return calls;
  },

  // Odottaa enintään maxMs ms, että puhelulistaan ilmestyy vähintään yksi li.
  // Lisäksi odotetaan 800 ms ensimmäisen rivin jälkeen, jotta Telavox ehtii
  // ladata koko listan ennen kuin tiedot kerätään.
  // Palauttaa true jos lista löytyi, false jos aikakatkaisu.
  // Käytetään Alt+4-navigoinnin jälkeen ennen luettelon avausta.
  _waitForCalls(maxMs = 3000) {
    return new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        const ol = document.querySelector('div.leftnav ol');
        if (ol && ol.querySelector('li')) {
          setTimeout(() => resolve(true), 1600);
        } else if (Date.now() - start > maxMs) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 150); // lyhyt alkuviive SPA-navigoinnille
    });
  },

  // Yksinkertainen HTML-karkaisuapuri.
  _escHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

// ---------------------------------------------------------------------------
// Moduuli: transfer
// Saavutettava luettelo puhelunsiirtoikkunan hakutuloksista (Alt + L).
//
// Toiminta:
//   - Alt + L kun siirtoikkuna on auki → näyttää hakutulokset dialog-listana
//   - Nuoli ylös/alas selaa listaa
//   - Enter valitsee kohteen ja painaa "Hyväksy"-painiketta automaattisesti
//   - Esc sulkee listan
//
// DOM-ankkurit (siirtoikkuna):
//   Ikkuna:        div.transfer-modal
//   Hakutulokset:  div.transfer-modal div[role="menuitem"]
//   Nimi:          div.overflow-hidden.text-base\/5... (voi sisältää <mark>)
//   Tila:          div.truncate.text-sm.text-gray-500
//   Puhelin:       div[id^="+358"]
//   Hyväksy:       footer button:last-of-type (teksti "Hyväksy")
// ---------------------------------------------------------------------------
TelavoxA11y.transfer = {

  // Palauttaa true jos puhelunsiirtoikkuna on tällä hetkellä auki.
  isOpen() {
    return !!document.querySelector('div.transfer-modal');
  },

  // Kerää siirtoikkunan hakutulosten menuitem-elementit ja palauttaa
  // taulukon {name, status, element}-objekteja.
  _gatherResults() {
    const modal = document.querySelector('div.transfer-modal');
    if (!modal) return [];
    const results = [];
    modal.querySelectorAll('div[role="menuitem"]').forEach(item => {
      // Nimi voi sisältää <mark>-elementin hakusanan korostuksena –
      // textContent palauttaa koko tekstin korostuksesta huolimatta.
      const nameEl   = item.querySelector('div.overflow-hidden');
      const statusEl = item.querySelector('div.truncate.text-sm.text-gray-500');
      const name     = nameEl   ? nameEl.textContent.trim()   : '';
      const status   = statusEl ? statusEl.textContent.trim() : '';
      if (name) results.push({ name, status, element: item });
    });
    return results;
  },

  // Avaa dialog-luettelon siirtoikkunan hakutuloksista.
  open() {
    const results = this._gatherResults();
    if (!results.length) {
      TelavoxA11y.core.announceToScreenReader('Ei hakutuloksia siirtoikkunassa');
      return;
    }

    // Poistetaan mahdollinen aiempi dialog.
    document.getElementById('tvx-transfer-dialog')?.remove();

    const dialog = document.createElement('dialog');
    dialog.id = 'tvx-transfer-dialog';
    dialog.setAttribute('aria-label', 'Puhelunsiirron hakutulokset');
    dialog.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:99999', 'background:#fff',
      'border:2px solid #000', 'border-radius:4px',
      'padding:16px', 'min-width:320px', 'max-width:480px',
      'font-family:sans-serif', 'color:#000',
    ].join(';');

    const heading = document.createElement('h2');
    heading.textContent = `Siirtoikkunan hakutulokset (${results.length})`;
    heading.style.cssText = 'margin:0 0 8px;font-size:1.1em;';
    dialog.appendChild(heading);

    const list = document.createElement('ul');
    list.setAttribute('role', 'listbox');
    list.style.cssText = 'list-style:none;margin:0;padding:0;';

    results.forEach((r, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.setAttribute('tabindex', i === 0 ? '0' : '-1');
      li.setAttribute('data-name', r.name.toLowerCase());
      li.setAttribute('aria-label', `${r.name}, ${r.status}`);
      li.textContent = `${r.name}${r.status ? ' – ' + r.status : ''}`;
      li.style.cssText = [
        'padding:6px 8px', 'cursor:pointer',
        'border-radius:3px', 'margin-bottom:2px',
      ].join(';');
      li.addEventListener('mouseover', () => li.focus());
      list.appendChild(li);
    });
    dialog.appendChild(list);

    document.body.appendChild(dialog);
    dialog.showModal();

    const items = Array.from(list.querySelectorAll('li'));
    let idx = 0;

    const highlight = (newIdx) => {
      items[idx].setAttribute('aria-selected', 'false');
      items[idx].style.background = '';
      idx = newIdx;
      items[idx].setAttribute('aria-selected', 'true');
      items[idx].style.background = '#005fcc';
      items[idx].style.color = '#fff';
      items[idx].focus();
    };
    highlight(0);

    dialog.addEventListener('keydown', async (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlight((idx + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlight((idx - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dialog.close();
        dialog.remove();
        // Klikkaa valittua menuitem-elementtiä siirtoikkunassa
        // ja paina sen jälkeen "Hyväksy"-painiketta.
        const selected = results[idx];
        selected.element.click();

        // Odotetaan enintään 2000 ms että "Hyväksy" aktivoituu.
        // Telavox saattaa tarvita hetken rekisteröidäkseen valinnan
        // ennen kuin painike poistuu disabled-tilasta.
        const acceptBtn = await new Promise(resolve => {
          const start = Date.now();
          const poll = () => {
            const btn = Array.from(document.querySelectorAll('button'))
              .find(b => b.textContent.trim() === 'Hyväksy');
            if (btn && !btn.disabled) {
              resolve(btn);
            } else if (Date.now() - start > 2000) {
              resolve(btn || null); // aikakatkaisu – annetaan mitä löytyy
            } else {
              setTimeout(poll, 50);
            }
          };
          setTimeout(poll, 100);
        });
        if (acceptBtn) {
          acceptBtn.click();
          TelavoxA11y.core.announceToScreenReader(
            `Valitse suorasiirto tai välipuhelu`
          );
        } else {
          TelavoxA11y.core.announceToScreenReader(
            'Hyväksy-painiketta ei löydy – valitse manuaalisesti'
          );
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dialog.close();
        dialog.remove();
      } else if (!e.altKey && e.key.length === 1 && e.key.match(/[a-zåäö]/i)) {
        const char = e.key.toLowerCase();
        const match =
          items.find((li, i) => i > idx && li.getAttribute('data-name').startsWith(char)) ||
          items.find(li => li.getAttribute('data-name').startsWith(char));
        if (match) highlight(items.indexOf(match));
      }
    });
  },
};


// Päänavigointilinkkien pikanäppäimet (Alt + 1–5) ja aria-nimet.
//
// Linkkikartta:
//   Alt + 1  Yhteystiedot  /extensions
//   Alt + 2  Viestit       /messages
//   Alt + 3  PBX           /pbx
//   Alt + 4  Puhelut       /calls
//   Alt + 5  Asetukset     /settings/…  (alkaa /settings/)
// ---------------------------------------------------------------------------
TelavoxA11y.nav = {

  // Keskitetty linkkikartta: selector + suomenkielinen nimi.
  // Käytetään sekä aria-nimien asettamiseen että navigointiin.
  NAV_LINKS: [
    { selector: 'a[href="/extensions"]', label: 'Yhteystiedot' },
    { selector: 'a[href="/messages"]',   label: 'Viestit'      },
    { selector: 'a[href="/pbx"]',        label: 'PBX'          },
    { selector: 'a[href="/calls"]',      label: 'Puhelut'      },
    { selector: 'a[href^="/settings/"]', label: 'Asetukset'    },
  ],

  // Asettaa aria-label-attribuutin jokaiselle navigointilinkille,
  // jos sitä ei vielä ole. Turvallista kutsua useasti.
  labelNavLinks() {
    this.NAV_LINKS.forEach(({ selector, label }) => {
      const link = document.querySelector(selector);
      if (link && !link.getAttribute('aria-label')) {
        link.setAttribute('aria-label', label);
      }
    });
  },

  // Navigoi osoitteeseen, jonka href täsmää annettuun predikaattiin.
  // Ilmoittaa kohteen nimen ruudunlukijalle.
  _navigate(selector, label) {
    const link = document.querySelector(selector);
    if (link) {
      TelavoxA11y.core.announceToScreenReader(`Siirrytään: ${label}`);
      link.click();
    } else {
      TelavoxA11y.core.announceToScreenReader(`Linkkiä ei löydy: ${label}`);
    }
  },

  toExtensions() { this._navigate('a[href="/extensions"]',        'Yhteystiedot'); },
  toMessages()   { this._navigate('a[href="/messages"]',          'Viestit');      },
  toPbx()        { this._navigate('a[href="/pbx"]',               'PBX');          },
  toCalls()      { this._navigate('a[href="/calls"]',             'Puhelut');      },
  toSettings()   { this._navigate('a[href^="/settings/"]',        'Asetukset');    },

  // Avaa profiilinvalinnan klikkaamalla tilatekstielementtiä.
  toProfile() {
    const el = Array.from(document.querySelectorAll('p.max-w-\\[184px\\].truncate.font-medium'))
      .find(p => p.textContent.trim() !== '');
    if (el) {
      TelavoxA11y.core.announceToScreenReader('Profiilivalinta avattu');
      el.click();
    } else {
      TelavoxA11y.core.announceToScreenReader('Profiilivalintaa ei löydy');
    }
  },

  // Asettaa aria-nimet heti ja seuraa DOM-muutoksia SPA-navigoinnin varalta.
  init() {
    this.labelNavLinks();
    const obs = new MutationObserver(() => this.labelNavLinks());
    obs.observe(document.body, { childList: true, subtree: true });
  },
};

// ---------------------------------------------------------------------------
// Moduuli: help
// Ohje-ikkuna pikanäppäimistä (Alt + H).
// ---------------------------------------------------------------------------
TelavoxA11y.help = {

  SHORTCUTS: [
    { key: '',                  desc: '— Päänavigaatio —' },
    { key: 'Alt + 1',           desc: 'Siirry: Yhteystiedot' },
    { key: 'Alt + 2',           desc: 'Avaa profiilivalinta' },
    { key: 'Alt + 3',           desc: 'Siirry: PBX ja avaa jonoluettelo' },
    { key: 'Alt + 4',           desc: 'Siirry: Puhelut ja avaa puheluluettelo' },
    { key: 'Alt + 5',           desc: 'Siirry: Asetukset' },
    { key: '',                  desc: '— Puhelunhallinta —' },
    { key: 'Alt + V',           desc: 'Vastaa saapuvaan puheluun' },
    { key: 'Alt + X',           desc: 'Katkaise puhelu' },
    { key: 'Alt + M',           desc: 'Mykistä / poista mykistys' },
    { key: 'Alt + S',           desc: 'Avaa puhelun siirtoikkuna' },
    { key: 'Alt + C',           desc: 'Kopioi soittajan numero leikepöydälle (puhelun aikana)' },
    { key: '',                  desc: '— Puhelun siirtoikkuna —' },
    { key: 'Alt + L',           desc: 'Avaa hakutulosten luettelo (kun siirtoikkuna on auki)' },
    { key: 'Nuoli alas / ylös', desc: 'Selaa hakutuloksia' },
    { key: 'Kirjain',           desc: 'Hyppää seuraavaan samalla alkukirjaimella' },
    { key: 'Enter',             desc: 'Valitse kohde ja hyväksy siirto' },
    { key: 'Esc',               desc: 'Sulje hakutulosluettelo' },
    { key: '',                  desc: '— Puheluluettelo —' },
    { key: 'Alt + L',           desc: 'Avaa puheluluettelo (puhelunäkymässä)' },
    { key: 'Nuoli alas / ylös', desc: 'Selaa puheluja' },
    { key: 'Kirjain',           desc: 'Hyppää seuraavaan samalla alkukirjaimella' },
    { key: 'Alt + C',           desc: 'Soita takaisin valitulle' },
    { key: 'Alt + E',           desc: 'Avaa sähköposti valitun yhteystiedoista' },
    { key: 'Alt + K',           desc: 'Toista soittajan jättämä ääniviesti' },
    { key: 'Enter',             desc: 'Avaa puhelun tarkemmat tiedot' },
    { key: 'Esc',               desc: 'Sulje puheluluettelo' },
    { key: '',                  desc: '— Yhteystietoluettelo —' },
    { key: 'Alt + L',           desc: 'Avaa yhteystietoluettelo' },
    { key: 'Nuoli alas / ylös', desc: 'Selaa yhteystietoja' },
    { key: 'Kirjain',           desc: 'Hyppää seuraavaan samalla alkukirjaimella' },
    { key: 'Alt + C',           desc: 'Soita valitulle' },
    { key: 'Alt + E',           desc: 'Lähetä sähköposti valitulle' },
    { key: 'Esc',               desc: 'Sulje luettelo' },
    { key: '',                  desc: '— Muut —' },
    { key: 'Alt + A',           desc: 'Saavutettavuustila päälle/pois (testityökalu)' },
    { key: 'Alt + D',           desc: 'Aja kontrasti- ja värianalyysi (testityökalu)' },
    { key: 'Alt + H',           desc: 'Avaa / sulje tämä ohje' },
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
    heading.tabIndex = -1;
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
    setTimeout(() => heading.focus(), 50);
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

  // Lisää aria-label "uusi yhteystieto"- ja "soita"-painikkeille.
  // Tunnistusperuste:
  //   Uusi yhteystieto: button.rounded-sm.bg-gray-200 ilman group-hover:bg-green -luokkaa
  //   Soita:            button.bg-gray-200 jolla on group-hover:bg-green -luokka
  _labelContactButtons() {
    document.querySelectorAll('button.bg-gray-200.size-10').forEach(btn => {
      if (btn.getAttribute('aria-label')) return; // jo nimetty
      if (btn.classList.contains('group-hover:bg-green')) {
        btn.setAttribute('aria-label', 'Soita');
      } else if (btn.classList.contains('rounded-sm')) {
        btn.setAttribute('aria-label', 'Uusi yhteystieto');
      }
    });
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

  _transferModalSeen: false,

  // Havaitaan siirtoikkunan avautuminen ja siirretään fokus hakukenttään.
  // Lähetetään myös näppäintapahtuma joka aktivoi NVDA:n vuorovaikutustilan.
  _handleTransferModal() {
    const modal = document.querySelector('div.transfer-modal');
    if (modal && !this._transferModalSeen) {
      this._transferModalSeen = true;
      // Lyhyt viive jotta Headless UI ehtii renderöidä hakukentän loppuun.
      setTimeout(() => {
        const input = modal.querySelector('input[type="search"]');
        if (!input) return;
        input.focus();
        // NVDA siirtyy vuorovaikutustilaan kun input saa fokuksen –
        // lähetetään ylimääräinen keydown-tapahtuma varmuuden vuoksi.
        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        TelavoxA11y.core.announceToScreenReader('Puhelun siirto, kirjoita hakusana');
      }, 150);
    } else if (!modal) {
      this._transferModalSeen = false;
    }
  },

  init() {
    const obs = new MutationObserver(() => {
      this._labelAnswerButton();
      this._labelContactButtons();
      this._handleTransferModal();
      if (document.querySelector('button.bg-green.size-10')) {
        this._startCallerAnnouncements();
      } else {
        this._stopCallerAnnouncements();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Ajetaan kerran heti sivun latautuessa
    this._labelAnswerButton();
    this._labelContactButtons();
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
      altKey: true, key: '1',
      handler: () => TelavoxA11y.nav.toExtensions(),
    },
    {
      altKey: true, key: '2',
      handler: () => TelavoxA11y.nav.toProfile(),
    },
    {
      altKey: true, key: '3',
      handler: async () => {
        TelavoxA11y.nav.toPbx();
        const ok = await TelavoxA11y.contacts._waitForContacts();
        if (ok) TelavoxA11y.contacts.open();
      },
    },
    {
      altKey: true, key: '4',
      handler: async () => {
        TelavoxA11y.nav.toCalls();
        const ok = await TelavoxA11y.callLog._waitForCalls();
        if (ok) TelavoxA11y.callLog.open();
      },
    },
    {
      altKey: true, key: '5',
      handler: () => TelavoxA11y.nav.toSettings(),
    },
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
      // Siirtoikkuna auki → avaa hakutulosten luettelo.
      // Puhelunäkymässä (/calls) → avaa puheluluettelo.
      // Muualla → avaa yhteystietoluettelo.
      handler: () => {
        if (TelavoxA11y.transfer.isOpen()) {
          TelavoxA11y.transfer.open();
        } else if (window.location.pathname.startsWith('/calls')) {
          TelavoxA11y.callLog.open();
        } else {
          TelavoxA11y.contacts.open();
        }
      },
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
    {
      altKey: true, key: 'c',
      // Puhelun aikana: kopioi soittajan numero leikepöydälle.
      // Muulloin: avaa yhteystietoluettelo (jossa Alt+C soittaa valitulle).
      handler: () => {
        if (TelavoxA11y.calls.isActive()) {
          TelavoxA11y.calls.copyCallerNumber();
        } else {
          TelavoxA11y.contacts.open();
        }
      },
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
  TelavoxA11y.nav.init();
  TelavoxA11y.observer.init();
  TelavoxA11y.keyboard.init();

  // Avaa Chromen audio-konteksti ensimmäisellä näppäinpainalluksella.
  // Ilman tätä Chrome saattaa estää Telavoxin soittosignaalin automaattisen
  // toiston, koska sivulla ei ole tapahtunut "user gesture" -tapahtumaa.
  const _unlockAudio = () => {
    const ctx = new AudioContext();
    ctx.resume().then(() => ctx.close());
    document.removeEventListener('keydown', _unlockAudio);
  };
  document.addEventListener('keydown', _unlockAudio);
};

TelavoxA11y.init();
