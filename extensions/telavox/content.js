// Kuunnellaan Alt + L -näppäinyhdistelmää
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    openAccessibleContactList();
  }
});

function openAccessibleContactList() {
  const contacts = [];
  const seenNames = new Set();
  
  // 1. Kerätään yhteystiedot (käytetään v1:n hyväksi havaittua tapaa)
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

  // 2. Luodaan dialogi (v1-tyylinen rakenne takaa paremman fokuksen)
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

  const heading = document.createElement('h2');
  heading.textContent = 'Yhteystiedot (Esc sulkee)';
  heading.style.cssText = 'margin-top: 0; font-size: 1.2rem;';
  dialog.appendChild(heading);

  const list = document.createElement('ul');
  list.setAttribute('role', 'listbox'); // v1:n saavutettavuusattribuutti
  list.style.cssText = 'list-style: none; padding: 0; margin: 0;';

  contacts.forEach((contact) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'presentation');
    
    const btn = document.createElement('button');
    btn.setAttribute('role', 'option'); // v1:n saavutettavuusattribuutti
    btn.className = 'a11y-contact-btn';
    btn.setAttribute('data-name', contact.name);
    
    // Yksinkertaisempi aria-label, joka ei hämmennä ruudunlukijaa alkufokuksessa
    btn.setAttribute('aria-label', `${contact.name}, ${contact.status}`);
    
    btn.innerHTML = `<strong>${contact.name}</strong><br><small>${contact.status}</small>`;
    btn.style.cssText = `
      width: 100%; text-align: left; padding: 10px; margin-bottom: 5px;
      border: 1px solid #ccc; cursor: pointer; background: #f9f9f9; border-radius: 4px;
    `;

    // Visuaalinen korostus fokukselle
    btn.onfocus = () => { btn.style.background = '#e0f0ff'; btn.style.borderColor = '#0066cc'; };
    btn.onblur = () => { btn.style.background = '#f9f9f9'; btn.style.borderColor = '#ccc'; };

    btn.onclick = () => { contact.element.click(); dialog.close(); };
    li.appendChild(btn);
    list.appendChild(li);
  });

  dialog.appendChild(list);
  document.body.appendChild(dialog);

  // Näytetään modaali
  dialog.showModal();

  // Varmistetaan fokuksen siirtyminen (pieni viive auttaa joitakin ruudunlukuohjelmia)
  const buttons = Array.from(dialog.querySelectorAll('.a11y-contact-btn'));
  if (buttons.length > 0) {
    setTimeout(() => buttons[0].focus(), 50);
  }

  // 3. Näppäinkomennot (nuolet, alkukirjaimet, C ja E)
  dialog.onkeydown = async (e) => {
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    const currentContact = contacts[currentIndex];

    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      dialog.close();
      await performContactAction(currentContact.element, 'call');
    } 
    else if (e.key.toLowerCase() === 'e') {
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

/**
 * Automaatio toimintoja varten (C ja E)
 * Käyttää viimeisimmän DOM-analyysin mukaisia tarkkoja selektoreita
 */
async function performContactAction(element, type) {
  element.click(); // Avataan kortti
  await new Promise(r => setTimeout(r, 600)); // Odotetaan latausta

  if (type === 'call') {
    // DOM-analyysin perusteella iso vihreä painike kortissa on .size-10.bg-green
    const callBtn = document.querySelector('button.bg-green.size-10');
    if (callBtn) callBtn.click();
  } 
  else if (type === 'email') {
    // Etsitään suoraan mailto-linkki yhteystietokortin sisältä
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (emailLink) emailLink.click();
  }
}