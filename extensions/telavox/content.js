// Apu-funktio ruudunlukijan ilmoituksia varten
function announceToScreenReader(message) {
  let announcer = document.getElementById('a11y-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = 'position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;';
    document.body.appendChild(announcer);
  }
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = message; }, 50);
}

// Apufunktio saapuvan puhelun vastaa-painikkeen etsimiseen.
// Erottelee saapuvan puhelun (ei katkaisupainiketta) lähtevästä (katkaisupainike löytyy).
function findAnswerButton() {
  const hangupPresent = !!document.querySelector('div.text-xs.text-white')
    && Array.from(document.querySelectorAll('div.text-xs.text-white'))
         .some(el => el.textContent.trim() === 'Katkaise');
  if (hangupPresent) return null; // puhelu jo käynnissä, ei saapuvaa

  return document.querySelector('button.bg-green.size-10');
}

// Apufunktio painikkeen etsimiseen viereisen tekstin perusteella
function findCallButtonByText(text) {
  const labels = Array.from(document.querySelectorAll('div.text-xs.text-white'));
  const targetLabel = labels.find(el => el.textContent.trim() === text);
  
  if (targetLabel && targetLabel.previousElementSibling && targetLabel.previousElementSibling.tagName.toLowerCase() === 'button') {
    return targetLabel.previousElementSibling;
  }
  return null;
}

// ---------------------------------------------------------------------------
// SAAVUTETTAVUUSTILA: värit ja tekstikoot
// ---------------------------------------------------------------------------

/**
 * Ottaa käyttöön tai poistaa käytöstä saavutettavuustilan (Alt + A).
 *
 * Mitä korjataan ja miksi:
 *
 * 1. text-gray-500 → #444  (oli #6b7280, kontrasti n. 3:1 → korjattu n. 7:1)
 *    Käytetään kaikkialla toissijaisissa teksteissä, esim. yhteystietojen
 *    tilatiedoissa ("Käytettävissä"). WCAG AA vaatii 4,5:1.
 *
 * 2. text-gray-600 → #222  (oli #4b5563)
 *    Syöttökenttien teksti ja ikonien väri. Vaalealla taustalla kontrasti
 *    riittämätön suurella osalla käyttäjistä.
 *
 * 3. text-gray-400 → #555  (oli #9ca3af, erittäin heikko ~2,5:1)
 *    Placeholder-tekstit ja ikonit. Lähes näkymätön heikkonäköisille.
 *
 * 4. text-xs → 0.875rem  (oli 0.75rem = 12px)
 *    Käytetään avatarinimikirjaimissa ja tagiteksteissä.
 *
 * 5. text-sm, .text-sm\/4 → 1rem  (oli 0.875rem = 14px)
 *    Tilatekstit ja useimmat listatekstit. 16px on yleinen minimisuositus.
 *
 * 6. text-2xs → 0.75rem  (oli n. 10–11px)
 *    Puhelujen lukumäärämerkki. Pienennetty vain kohtuullisesti, koska
 *    elementti on pieni nappi.
 *
 * 7. bg-gray-100, bg-gray-200 → hieman tummemmat
 *    Taustakontrastin parantamiseksi suhteessa edellä mainittuihin teksteihin.
 *    Visuaalinen muutos on pieni mutta kontrastisuhde paranee mitattavasti.
 */
function injectAccessibilityStyles() {
  const STYLE_ID = 'a11y-visual-styles';
  const existing = document.getElementById(STYLE_ID);

  if (existing) {
    existing.remove();
    return false; // tila pois päältä
  }

  // Korjaukset perustuvat 11.3.2026 mitattuun kontrastianalyysiin.
  // Kaikki neljä ongelmaa olivat avatar-taustaväreissä ja punaisessa pallossa.
  // Harmaat tekstit (text-gray-600 jne.) saivat jo 8.75:1 — niitä ei muuteta.
  //
  // Tavoite: valkoinen teksti (#fff) ≥ 4.5:1 kutakin taustaa vasten.
  // Viite: läpäisevät sisarvärit bg-flavor-4 (#117544, 5.75:1) ja bg-flavor-5 (#178549, 4.68:1)
  //
  //  bg-flavor-9  #2ec659  2.25:1  →  #1a7a3c  ~5.2:1
  //  bg-flavor-8  #28b655  2.65:1  →  #1a7a3c  ~5.2:1
  //  bg-flavor-7  #23a651  3.16:1  →  #1a7a3c  ~5.2:1
  //  bg-red       #e53935  4.23:1  →  #b71c1c  ~5.9:1

  const style = document.createElement('style');
  style.id = STYLE_ID;
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
  return true; // tila päällä
}

// Ladataan tila muistista sivun avautuessa
(function initA11yStyles() {
  if (sessionStorage.getItem('a11y-visual-on') === '1') {
    injectAccessibilityStyles();
  }
})();

// ---------------------------------------------------------------------------
// DIAGNOSTIIKKATYÖKALU: kontrasti- ja värianalyysi (Alt + D)
// ---------------------------------------------------------------------------

function relativeLuminance(r, g, b) {
  const toLinear = c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(str) {
  const m = str.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
}

function toHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function runContrastDiagnostics() {
  announceToScreenReader('Diagnostiikka käynnistetty, odota hetki...');

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
      if (['SCRIPT','STYLE','NOSCRIPT'].includes(node.tagName)) continue;

      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      // Vain elementit joilla on suoraa tekstiä
      const directText = Array.from(node.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join('');
      if (!directText) continue;

      const fgRgb = parseRgb(style.color);
      const bgRgb = parseRgb(style.backgroundColor);
      if (!fgRgb || !bgRgb) continue;

      // Ohitetaan täysin läpinäkyvät taustat
      if (style.backgroundColor === 'rgba(0, 0, 0, 0)') continue;

      const fgHex = toHex(fgRgb);
      const bgHex = toHex(bgRgb);
      const key   = `${fgHex}|${bgHex}`;
      if (seen.has(key)) continue;
      seen.set(key, true);

      const lFg      = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
      const lBg      = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const ratio    = contrastRatio(lFg, lBg);
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
        elementti:      node.tagName.toLowerCase()
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
        läpäiseviä:        ok.length
      },
      ongelmat_ensin: issues,
      läpäisevät:     ok
    };

    const blob      = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url       = URL.createObjectURL(blob);
    const a         = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.href          = url;
    a.download      = `kontrasti_analyysi_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    announceToScreenReader(
      `Diagnostiikka valmis. ${issues.length} ongelmallista väriparia löytyi. Tiedosto ladattu.`
    );
  }, 200);
}

// ---------------------------------------------------------------------------
// Globaali tila mykistyksen seurantaan
// ---------------------------------------------------------------------------
window.isMuted = false;

// ---------------------------------------------------------------------------
// Pikanäppäimet
// ---------------------------------------------------------------------------
document.addEventListener('keydown', (e) => {

  // Alt + D = Aja kontrasti- ja värianalyysi, lataa JSON
  if (e.altKey && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    runContrastDiagnostics();
  }

  // Alt + A = Saavutettavuustila (värit + tekstikoot) päälle/pois
  if (e.altKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    const isOn = injectAccessibilityStyles();
    sessionStorage.setItem('a11y-visual-on', isOn ? '1' : '0');
    announceToScreenReader(
      isOn ? 'Saavutettavuustila käytössä: värit ja tekstikoot korjattu'
           : 'Saavutettavuustila pois käytöstä'
    );
  }

  // Alt + L = Avaa saavutettava yhteystietolista
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    openAccessibleContactList();
  }

  // Alt + H = Avaa / sulje ohje-ikkuna
  if (e.altKey && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    openHelpDialog();
  }
  
  // Alt + V = Vastaa saapuvaan puheluun
  if (e.altKey && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    const answerBtn = findAnswerButton();

    if (answerBtn) {
      answerBtn.click();
      announceToScreenReader('Puheluun vastattu');
    } else {
      announceToScreenReader('Vastaa-painiketta ei löytynyt');
    }
  }

  // Alt + X = Katkaise puhelu
  if (e.altKey && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    const hangupBtn = findCallButtonByText('Katkaise');
    
    if (hangupBtn) {
      hangupBtn.click();
      announceToScreenReader('Puhelu katkaistu');
    } else {
      announceToScreenReader('Katkaisupainiketta ei löytynyt');
    }
  }

  // Alt + M = Mykistä / Poista mykistys
  if (e.altKey && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    
    const bottomButtons = document.querySelectorAll('div.flex.items-center.justify-evenly.p-3 button');
    
    if (bottomButtons.length > 0) {
      const muteBtn = bottomButtons[0]; 
      muteBtn.click();
      
      window.isMuted = !window.isMuted; 
      
      if (window.isMuted) {
        announceToScreenReader('Mikrofoni mykistetty');
      } else {
        announceToScreenReader('Mikrofoni avattu');
      }
    } else {
      announceToScreenReader('Mykistyspainiketta ei löytynyt');
    }
  }

  // Alt + S = Avaa puhelun siirtoikkuna
  if (e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    const transferBtn = findCallButtonByText('Siirrä');
    
    if (transferBtn) {
      transferBtn.click();
      announceToScreenReader('Puhelun siirtoikkuna avattu');
    } else {
      announceToScreenReader('Siirtopainiketta ei löytynyt');
    }
  }
});

// ---------------------------------------------------------------------------
// Yhteystietolista
// ---------------------------------------------------------------------------
function openAccessibleContactList() {
  const contacts = [];
  const seenNames = new Set();
  
  const menuItems = document.querySelectorAll('div[role="menuitem"]');
  menuItems.forEach(item => {
    const nameEl = item.querySelector('div[class*="text-base"]');
    const statusEl = item.querySelector('div[class*="text-sm"]');
    
    if (nameEl) {
      const name = nameEl.textContent.trim();
      const status = statusEl ? statusEl.textContent.trim() : 'Ei tilaa';
      
      if (!seenNames.has(name) && name !== "") {
        seenNames.add(name);
        contacts.push({ name, status, element: item });
      }
    }
  });

  if (contacts.length === 0) return;
  contacts.sort((a, b) => a.name.localeCompare(b.name));

  let dialog = document.getElementById('a11y-contact-dialog');
  if (dialog) dialog.remove();

  dialog = document.createElement('dialog');
  dialog.id = 'a11y-contact-dialog';
  dialog.setAttribute('aria-label', 'Yhteystiedot');
  dialog.style.cssText = `
    padding: 20px; border-radius: 8px; border: 2px solid #333;
    background: #fff; min-width: 350px; max-height: 80vh; overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  const list = document.createElement('ul');
  list.setAttribute('role', 'listbox');
  list.style.cssText = 'list-style: none; padding: 0; margin: 0;';

  contacts.forEach((contact) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'presentation');
    
    const btn = document.createElement('button');
    btn.setAttribute('role', 'option');
    btn.className = 'a11y-contact-btn';
    btn.setAttribute('data-name', contact.name);
    btn.setAttribute('aria-label', `${contact.name}, ${contact.status}`);
    
    btn.innerHTML = `<strong>${contact.name}</strong><br><small>${contact.status}</small>`;
    btn.style.cssText = `
      width: 100%; text-align: left; padding: 10px; margin-bottom: 5px;
      border: 1px solid #ccc; cursor: pointer; background: #f9f9f9; border-radius: 4px;
    `;

    btn.onfocus = () => { btn.style.background = '#e0f0ff'; btn.style.borderColor = '#0066cc'; };
    btn.onblur = () => { btn.style.background = '#f9f9f9'; btn.style.borderColor = '#ccc'; };

    btn.onclick = () => { contact.element.click(); dialog.close(); };
    li.appendChild(btn);
    list.appendChild(li);
  });

  dialog.appendChild(list);
  document.body.appendChild(dialog);

  dialog.showModal();

  const buttons = Array.from(dialog.querySelectorAll('.a11y-contact-btn'));
  if (buttons.length > 0) {
    setTimeout(() => buttons[0].focus(), 50);
  }

  dialog.onkeydown = async (e) => {
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    const currentContact = contacts[currentIndex];

    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      dialog.close();
      await performContactAction(currentContact.element, 'call');
    } 
    else if (e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      dialog.close();
      await performContactAction(currentContact.element, 'email');
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      buttons[(currentIndex + 1) % buttons.length].focus();
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(currentIndex - 1 + buttons.length) % buttons.length].focus();
    } 
    else if (e.key.length === 1 && e.key.match(/[a-zåäö]/i)) {
      const char = e.key.toLowerCase();
      const match = buttons.find((b, i) => i > currentIndex && b.getAttribute('data-name').toLowerCase().startsWith(char)) 
                    || buttons.find(b => b.getAttribute('data-name').toLowerCase().startsWith(char));
      if (match) match.focus();
    }
  };
}

// ---------------------------------------------------------------------------
// Ohje-ikkuna (Alt + H)
// ---------------------------------------------------------------------------
function openHelpDialog() {
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

  const shortcuts = [
    { key: 'Alt + L', desc: 'Avaa yhteystietolista' },
    { key: 'Alt + V', desc: 'Vastaa saapuvaan puheluun' },
    { key: 'Alt + X', desc: 'Katkaise puhelu' },
    { key: 'Alt + M', desc: 'Mykistä / poista mykistys' },
    { key: 'Alt + S', desc: 'Avaa puhelun siirtoikkuna' },
    { key: 'Alt + A', desc: 'Saavutettavuustila päälle/pois' },
    { key: 'Alt + D', desc: 'Aja kontrasti- ja värianalyysi' },
    { key: 'Alt + H', desc: 'Avaa / sulje tämä ohje' },
    { key: '',        desc: '— Yhteystietolistan sisällä —' },
    { key: 'Nuoli alas / ylös', desc: 'Selaa yhteystietoja' },
    { key: 'Kirjain',           desc: 'Hyppää seuraavaan samalla alkukirjaimella' },
    { key: 'Alt + C',           desc: 'Soita valitulle yhteystiedolle' },
    { key: 'Alt + E',           desc: 'Lähetä sähköposti valitulle' },
    { key: 'Esc',               desc: 'Sulje lista / ohje' },
  ];

  const table = document.createElement('table');
  table.style.cssText = 'border-collapse: collapse; width: 100%;';
  table.setAttribute('role', 'grid');

  shortcuts.forEach(({ key, desc }) => {
    const tr = document.createElement('tr');

    if (!key) {
      // Väliotsikkorivi
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
}

// ---------------------------------------------------------------------------
// Yhteystietokortin toiminnot (Alt+C = soita, Alt+E = sähköposti)
// ---------------------------------------------------------------------------
async function performContactAction(element, type) {
  element.click();
  await new Promise(r => setTimeout(r, 600));

  if (type === 'call') {
    const callBtn = document.querySelector('button.bg-green.size-10');
    if (callBtn) callBtn.click();
  } 
  else if (type === 'email') {
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (emailLink) emailLink.click();
  }
}

// ---------------------------------------------------------------------------
// MutationObserver: korjaa vastaa-painikkeen aria-label automaattisesti
// ja ilmoittaa soittajan nimen NVDA:lle 5 sekunnin välein.
// ---------------------------------------------------------------------------
// Saapuvan puhelun vastaa-painikkeella (button.bg-green.size-10) ei ole
// saavutettavaa nimeä. Observer kuuntelee DOM-muutoksia ja lisää
// aria-label="Vastaa puheluun" heti kun painike ilmestyy näytölle.
//
// Soittajan nimi luetaan elementistä:
//   div.overflow-hidden.text-ellipsis.whitespace-nowrap.text-white
// joka on näkyvissä vain saapuvan puhelun ilmoituksessa.
// Nimi ilmoitetaan heti puhelun alkaessa ja sen jälkeen 5 s välein.
// Toisto pysähtyy kun vastaa-painike poistuu DOM:sta (puhelu vastattu/hylätty).
(function watchForAnswerButton() {
  let callerAnnounceInterval = null;

  function getCallerName() {
    const el = document.querySelector(
      'div.overflow-hidden.text-ellipsis.whitespace-nowrap.text-white'
    );
    return el ? el.textContent.trim() : null;
  }

  function labelAnswerButton() {
    const btn = document.querySelector('button.bg-green.size-10');
    if (btn && !btn.getAttribute('aria-label')) {
      btn.setAttribute('aria-label', 'Vastaa puheluun');
    }
  }

  function startCallerAnnouncements() {
    if (callerAnnounceInterval) return; // jo käynnissä

    const name = getCallerName();
    if (!name) return;

    // Ilmoitetaan heti ensimmäisen kerran
    announceToScreenReader(name);

    callerAnnounceInterval = setInterval(() => {
      const answerBtn = document.querySelector('button.bg-green.size-10');

      // Lopetetaan, jos vastaa-painike on poistunut (puhelu vastattu tai hylätty)
      if (!answerBtn) {
        clearInterval(callerAnnounceInterval);
        callerAnnounceInterval = null;
        return;
      }

      const currentName = getCallerName();
      if (currentName) announceToScreenReader(currentName);
    }, 3000);
  }

  function stopCallerAnnouncements() {
    if (callerAnnounceInterval) {
      clearInterval(callerAnnounceInterval);
      callerAnnounceInterval = null;
    }
  }

  const observer = new MutationObserver(() => {
    labelAnswerButton();

    const answerBtn = document.querySelector('button.bg-green.size-10');
    if (answerBtn) {
      startCallerAnnouncements();
    } else {
      stopCallerAnnouncements();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Ajetaan kerran heti sivun latautuessa
  labelAnswerButton();
})();
