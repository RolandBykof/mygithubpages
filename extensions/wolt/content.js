// ====================================================
// Wolt Ostoskori -saavutettavuuslaajennus
// ====================================================

// --- Apufunktio: ruudunlukijan ääni-ilmoitukset ---

// Ilmoitusalue injektoidaan ostoskorin sisälle (ei body-tasolle),
// koska Wolt asettaa aria-hidden="true" kaikille body:n suorille
// lapsille modaalin/ostoskorin ollessa auki.
function getAnnouncer() {
  let announcer = document.getElementById('sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText =
      'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    // Kiinnitetään ostoskorin sisälle, jos se on auki; muuten body:yn
    const cartRoot = getCartRoot();
    (cartRoot || document.body).appendChild(announcer);
  }
  return announcer;
}

function speakMessage(message) {
  const announcer = getAnnouncer();
  // Pakko tyhjentää ensin, jotta sama viesti voidaan toistaa
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
  setTimeout(() => { announcer.textContent = ''; }, 3000);
}

// Palauttaa ostoskorin modaalin/paneelin juurielementin, jos se on auki
function getCartRoot() {
  // Ostoskorin h1 on "Tilauksesi" – etsitään sen kautta
  const h1 = Array.from(document.querySelectorAll('h1')).find(
    el => el.textContent.trim() === 'Tilauksesi'
  );
  if (!h1) return null;
  // Kavutaan ylös, kunnes löydetään riittävän korkea kontaineri
  let node = h1.parentElement;
  for (let i = 0; i < 10; i++) {
    if (!node || node === document.body) break;
    if (node.scrollHeight > 300) return node;
    node = node.parentElement;
  }
  return null;
}

// --- H5-otsikoiden injektointi ostoskorin tuotteille ---

// Ostoskorin jokainen tuoterivi on div.rmcop8p.
// Tuotenimi löytyy span.t8ejt2x:stä sen sisältä.
// H5 injektoidaan div.rmcop8p:n ensimmäiseksi lapseksi,
// jolloin se on ennen tuotepainiketta mutta saman elementin sisällä.

function injectCartHeadings() {
  const cartItems = document.querySelectorAll('div.rmcop8p');
  if (cartItems.length === 0) return;

  cartItems.forEach((item) => {
    const nameSpan = item.querySelector('span.t8ejt2x');
    if (!nameSpan) return;

    const productName = nameSpan.textContent.trim();
    if (!productName) return;

    // Tuotteen määrä haetaan label-elementistä ("Määrä 3" → "3")
    const label = item.querySelector('label');
    const quantity = label
      ? label.textContent.replace('Määrä', '').trim()
      : '';

    const headingText = quantity
      ? `${productName} ${quantity}`
      : productName;

    // Päivitetään olemassa oleva otsikko tai luodaan uusi
    let h5 = item.querySelector('h5.sr-cart-heading');
    if (h5) {
      if (h5.textContent !== headingText) h5.textContent = headingText;
      return;
    }

    h5 = document.createElement('h5');
    h5.className = 'sr-cart-heading';
    h5.textContent = headingText;
    // Visuaalisesti piilotettu, mutta ruudunlukijalle näkyvä
    h5.style.cssText =
      'position:absolute;left:-9999px;width:1px;height:1px;' +
      'overflow:hidden;margin:0;padding:0;clip:rect(0,0,0,0);';

    item.insertBefore(h5, item.firstChild);
  });
}

// MutationObserver päivittää otsikot ostoskorin sisällön muuttuessa
let headingInjectionTimer = null;

function scheduleHeadingInjection() {
  clearTimeout(headingInjectionTimer);
  headingInjectionTimer = setTimeout(injectCartHeadings, 500);
}

const cartObserver = new MutationObserver((mutations) => {
  const hasElementChanges = mutations.some(
    (m) =>
      Array.from(m.addedNodes).some((n) => n.nodeType === Node.ELEMENT_NODE) ||
      Array.from(m.removedNodes).some((n) => n.nodeType === Node.ELEMENT_NODE)
  );
  if (hasElementChanges) scheduleHeadingInjection();
});

cartObserver.observe(document.body, { childList: true, subtree: true });

// Ensimmäinen ajo – ostoskori saattaa olla jo auki
scheduleHeadingInjection();

// --- Alt+L: Saavutettava ostoskorilista määrien hallintaan ---

document.addEventListener('keydown', function (e) {
  if (e.altKey && e.code === 'KeyL') {
    e.preventDefault();
    createScreenReaderCartList();
  }
});

function createScreenReaderCartList() {
  // Poistetaan vanha lista tuplakappaleiden välttämiseksi
  const existingContainer = document.getElementById('sr-cart-container');
  if (existingContainer) existingContainer.remove();

  // Ostoskorissa "Lisää vielä yksi" on oikea <button>;
  // tuotelistauksessa sama teksti on <div role="button">.
  // querySelectorAll('button[...]') palauttaa vain ostoskorin painikkeet.
  const plusButtons = Array.from(
    document.querySelectorAll('button[aria-label="Lisää vielä yksi"]')
  );

  if (plusButtons.length === 0) {
    speakMessage(
      'Ostoskori on tyhjä, tai sitä ei ole avattu ruudulle. Avaa ensin ostoskori.'
    );
    return;
  }

  // Luodaan kontaineri ostoskorin sisälle (ei body:yn),
  // jotta Wolt ei peitä sitä aria-hidden="true":lla.
  const srContainer = document.createElement('div');
  srContainer.id = 'sr-cart-container';
  srContainer.style.cssText =
    'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';

  const heading = document.createElement('h2');
  heading.textContent =
    'Ostoskorin hallinta. Selaa nuolilla. L lisää tuotteen, V vähentää.';
  heading.tabIndex = -1;
  srContainer.appendChild(heading);

  const list = document.createElement('ul');
  list.setAttribute('role', 'list');

  let itemCount = 0;

  plusButtons.forEach((plusBtn) => {
    let container = plusBtn.parentElement;
    let itemName = '';
    let quantity = '1';
    let minusBtn = null;

    // Kavutaan DOM-puuta ylöspäin (max 8 askelta) löytääksemme div.rmcop8p
    for (let i = 0; i < 8; i++) {
      if (!container) break;
      container = container.parentElement;

      // Tuotteen nimi: span.t8ejt2x (ostoskorin primääri rakenne)
      if (!itemName) {
        const nameSpan = container.querySelector('span.t8ejt2x');
        if (nameSpan) {
          itemName = nameSpan.textContent.trim();
        }
      }

      // Varastrategia: etsitään tuotteen nimi yleisemmällä span-haulla
      if (!itemName) {
        const label = container.querySelector('label');
        if (label && label.textContent.includes('Määrä')) {
          const spans = Array.from(container.querySelectorAll('span'));
          const validSpan = spans.find((s) => {
            const txt = s.textContent.trim();
            return (
              txt.length > 3 &&
              !txt.includes('€') &&
              isNaN(txt) &&
              !txt.includes('Määrä')
            );
          });
          if (validSpan) itemName = validSpan.textContent.trim();
        }
      }

      // Tuotteen määrä: label "Määrä N"
      const label = container.querySelector('label');
      if (label && label.textContent.includes('Määrä')) {
        quantity = label.textContent.replace('Määrä', '').trim();
      }

      // Vähennys-/poistopainike
      if (!minusBtn) {
        minusBtn =
          container.querySelector('button[aria-label="Poista yksi"]') ||
          container.querySelector('button[aria-label="Poista tuote"]');
      }

      // Lopetetaan, kun nimi ja määrä on löydetty
      if (itemName && quantity !== '1') break;
    }

    if (!itemName) return;

    itemCount++;
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.setAttribute('role', 'listitem');
    li.setAttribute('aria-label', `${itemName}, määrä ${quantity}.`);
    li.textContent = `${itemName}, määrä ${quantity}.`;

    li.addEventListener('keydown', function (e) {
      if (e.code === 'KeyL') {
        plusBtn.click();
        speakMessage(`${itemName} lisätty.`);
        setTimeout(() => createScreenReaderCartList(), 800);
      } else if (e.code === 'KeyV') {
        if (minusBtn) {
          minusBtn.click();
          speakMessage(`${itemName} vähennetty.`);
          setTimeout(() => createScreenReaderCartList(), 800);
        }
      }
    });

    list.appendChild(li);
  });

  if (itemCount === 0) {
    speakMessage('Ostoskorin tuotteita ei voitu lukea rakenteesta johtuen.');
    return;
  }

  srContainer.appendChild(list);

  // Kiinnitetään lista ostoskorin sisälle (ei body:yn) aria-hidden-ongelman välttämiseksi
  const cartRoot = getCartRoot();
  if (cartRoot) {
    cartRoot.appendChild(srContainer);
  } else {
    document.body.appendChild(srContainer);
  }

  heading.focus();
  speakMessage(
    `Ostoskorissa on ${itemCount} erilaista tuotetta. Otsikko valittu, selaa nuolilla.`
  );
}
