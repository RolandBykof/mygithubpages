document.addEventListener('keydown', function(e) {
  if (e.altKey && e.code === 'KeyL') {
    e.preventDefault();
    createScreenReaderCartList();
  }
});

function createScreenReaderCartList() {
  // Poistetaan vanha lista, jotta vältetään tuplakappaleet
  let existingContainer = document.getElementById('sr-cart-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  // Woltissa ostoskorin lisäyspainikkeet ovat oikeita <button>-elementtejä.
  // Tuotelistauksessa ne ovat usein <div>-elementtejä, joten tämä erottelee ostoskorin.
  const plusButtons = Array.from(document.querySelectorAll('button[aria-label="Lisää vielä yksi"]'));
  
  if (plusButtons.length === 0) {
    speakMessage("Ostoskori on tyhjä, tai sitä ei ole avattu ruudulle. Avaa ensin ostoskori.");
    return;
  }

  // Luodaan ruudunlukijasäiliö
  const srContainer = document.createElement('div');
  srContainer.id = 'sr-cart-container';
  srContainer.style.position = 'absolute';
  srContainer.style.left = '-9999px';
  srContainer.style.width = '1px';
  srContainer.style.height = '1px';
  srContainer.style.overflow = 'hidden';

  const heading = document.createElement('h2');
  heading.textContent = "Ostoskorin hallinta. Selaa nuolilla. L lisää tuotteen, V vähentää.";
  heading.tabIndex = -1;
  srContainer.appendChild(heading);

  const list = document.createElement('ul');
  list.setAttribute('role', 'list');

  let itemCount = 0;

  // Käydään läpi jokainen "Lisää vielä yksi" -painike
  plusButtons.forEach((plusBtn) => {
    let container = plusBtn.parentElement;
    let itemName = "";
    let quantity = "1";
    let minusBtn = null;
    
    // Kavutaan DOM-puuta ylöspäin (max 8 askelta), jotta löydetään koko tuotteen laatikko
    for (let i = 0; i < 8; i++) {
      if (!container) break;
      container = container.parentElement;
      
      // Etsitään tuotteen määrä <label>-elementistä (esim. "Määrä 4")
      const label = container.querySelector('label');
      if (label && label.textContent.includes('Määrä')) {
        quantity = label.textContent.replace('Määrä', '').trim();
      }
      
      // Etsitään vähennys- tai poistopainike
      if (!minusBtn) {
        minusBtn = container.querySelector('button[aria-label="Poista yksi"]') || container.querySelector('button[aria-label="Poista tuote"]');
      }

      // Etsitään tuotteen nimi. Se on yleensä lähistöllä olevassa <span>-elementissä.
      const spans = Array.from(container.querySelectorAll('span'));
      const validSpans = spans.filter(s => {
        const txt = s.textContent.trim();
        // Hylätään lyhyet tekstit, hinnat (sisältää €) ja pelkät numerot
        return txt.length > 3 && !txt.includes('€') && isNaN(txt) && !txt.includes('Määrä');
      });

      // Jos löydettiin järkevä tuotenimi ja tuotteella on määrä-kenttä, olemme löytäneet oikean laatikon
      if (validSpans.length > 0 && label) {
        itemName = validSpans[0].textContent.trim();
        break; 
      }
    }

    if (!itemName) return; // Jos nimeä ei onnistuttu päättelemään, ohitetaan

    itemCount++;
    const li = document.createElement('li');
    li.tabIndex = 0; // Tekee elementistä nuolilla kohdistettavan
    li.setAttribute('role', 'listitem');
    li.setAttribute('aria-label', `${itemName}, määrä ${quantity}.`);
    li.textContent = `${itemName}, määrä ${quantity}.`;

    // Näppäinkuuntelijat L ja V
    li.addEventListener('keydown', function(e) {
      if (e.code === 'KeyL') {
        plusBtn.click();
        speakMessage(`${itemName} lisätty.`);
        // Viive, jotta Wolt ehtii ladata uudet summat ja määrät ennen listan päivitystä
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
    speakMessage("Ostoskorin tuotteita ei voitu lukea rakenteesta johtuen.");
    return;
  }

  srContainer.appendChild(list);
  document.body.appendChild(srContainer);
  
  // Siirretään fokus otsikkoon, jotta käyttäjä pääsee lukemaan listaa heti
  heading.focus();
  speakMessage(`Ostoskorissa on ${itemCount} erilaista tuotetta. Otsikko valittu, selaa nuolilla.`);
}

// Apufunktio ruudunlukijan ääni-ilmoituksiin
function speakMessage(message) {
  let announcer = document.getElementById('sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.style.position = 'absolute';
    announcer.style.left = '-9999px';
    document.body.appendChild(announcer);
  }
  announcer.textContent = message;
  
  // Tyhjennetään teksti, jotta sama viesti voidaan tarvittaessa toistaa uudelleen
  setTimeout(() => { announcer.textContent = ''; }, 3000);
}