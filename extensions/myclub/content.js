document.addEventListener('keydown', (e) => {
  // Avataan valikko painamalla Alt + L (pieni L)
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    openAccessibleEventList();
  }
});

function openAccessibleEventList() {
  // Poistetaan vanha valikko, jos sellainen on jo olemassa
  const existingOverlay = document.getElementById('mc-accessible-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Haetaan kaikki sivun tapahtumat
  const events = document.querySelectorAll('.event');
  if (events.length === 0) {
    alert("Yhtään tapahtumaa ei löytynyt.");
    return;
  }

  // Luodaan koko ruudun peittävä overlay
  const overlay = document.createElement('div');
  overlay.id = 'mc-accessible-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Tapahtumat. Selaa nuolilla. Paina i osallistuaksesi, o kieltäytyäksesi, tai Esc sulkeaksesi.');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    zIndex: '999999',
    padding: '2rem',
    overflowY: 'auto'
  });

  const ohje = document.createElement('p');
  ohje.textContent = "Selaa tapahtumia nuoli ylös ja nuoli alas. Ilmoittaudu painamalla I. Kieltäydy painamalla O. Sulje painamalla Esc.";
  overlay.appendChild(ohje);

  const list = document.createElement('ul');
  list.setAttribute('role', 'listbox');
  list.style.listStyle = 'none';
  list.style.padding = '0';

  let listItems = [];

  events.forEach((evt, index) => {
    // Etsitään tapahtuman tiedot DOM:sta
    const nameEl = evt.querySelector('.event-name-text');
    const dayEl = evt.querySelector('.day');
    const timeEl = evt.querySelector('.time');
    
    // Etsitään napit: "Osallistun" ja "En osallistu"
    const buttons = Array.from(evt.querySelectorAll('.event-indication-buttons a'));
    const inBtn = buttons.find(btn => btn.textContent.includes('Osallistun') && !btn.textContent.includes('En osallistu'));
    const outBtn = buttons.find(btn => btn.textContent.includes('En osallistu'));

    const nameText = nameEl ? nameEl.textContent.trim() : 'Tuntematon tapahtuma';
    const dayText = dayEl ? dayEl.textContent.trim() : '';
    const timeText = timeEl ? timeEl.textContent.trim() : '';
    
    const li = document.createElement('li');
    li.tabIndex = -1; // Mahdollistaa ohjelmallisen fokuksen
    li.setAttribute('role', 'option');
    li.textContent = `${nameText}, ${dayText} ${timeText}`;
    
    Object.assign(li.style, {
      padding: '10px',
      margin: '5px 0',
      border: '1px solid #555',
      fontSize: '20px',
      cursor: 'default'
    });

    li.addEventListener('focus', () => {
      li.style.backgroundColor = '#333';
      li.style.outline = '2px solid yellow';
    });
    li.addEventListener('blur', () => {
      li.style.backgroundColor = 'transparent';
      li.style.outline = 'none';
    });

    // Liitetään napit listaelemntin tietoihin myöhempää painamista varten
    li.mcEventData = { inBtn, outBtn };
    listItems.push(li);
    list.appendChild(li);
  });

  overlay.appendChild(list);
  document.body.appendChild(overlay);

  // Käsittely overlayn sisäisille näppäinpainalluksille
  let currentIndex = 0;
  if (listItems.length > 0) {
    listItems[0].focus();
  }

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % listItems.length;
      listItems[currentIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + listItems.length) % listItems.length;
      listItems[currentIndex].focus();
    }

    // Rekisteröityminen ja kieltäytyminen aktiivisen elementin kohdalla
    if (document.activeElement && document.activeElement.tagName === 'LI') {
      const data = document.activeElement.mcEventData;
      
      if (e.key.toLowerCase() === 'i') {
        if (data.inBtn) {
          data.inBtn.click();
          alert('Ilmoitettu: Osallistun');
          // Suljetaan ruutu automaattisesti tai pidetään auki – oletuksena pidetään auki.
        } else {
          alert('Osallistumisnappia ei löytynyt tälle tapahtumalle.');
        }
      } else if (e.key.toLowerCase() === 'o') {
        if (data.outBtn) {
          data.outBtn.click();
          alert('Ilmoitettu: En osallistu');
        } else {
          alert('Kieltäytymisnappia ei löytynyt tälle tapahtumalle.');
        }
      }
    }
  });
}