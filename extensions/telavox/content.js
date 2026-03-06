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
  
  // Kerätään kaikki valikkokohteet (yhteystiedot)
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
  dialog.style.cssText = `
    padding: 20px; border-radius: 8px; border: 2px solid #333;
    background: #fff; min-width: 350px; max-height: 80vh; overflow-y: auto;
  `;

  const list = document.createElement('ul');
  list.style.cssText = 'list-style: none; padding: 0; margin: 0;';

  contacts.forEach((contact) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'a11y-contact-btn';
    btn.setAttribute('data-name', contact.name);
    btn.innerHTML = `<strong>${contact.name}</strong><br><small>${contact.status}</small>`;
    btn.setAttribute('aria-label', `${contact.name}, ${contact.status}. Paina C soittaaksesi tai E lähettääksesi sähköpostia.`);
    
    btn.style.cssText = `
      width: 100%; text-align: left; padding: 10px; margin-bottom: 5px;
      border: 1px solid #ccc; cursor: pointer; background: #f9f9f9;
    `;

    btn.onclick = () => { contact.element.click(); dialog.close(); };
    li.appendChild(btn);
    list.appendChild(li);
  });

  dialog.appendChild(list);
  document.body.appendChild(dialog);
  dialog.showModal();

  const buttons = Array.from(dialog.querySelectorAll('.a11y-contact-btn'));
  if (buttons.length > 0) buttons[0].focus();

  // Käsitellään näppäinkomennot listassa
  dialog.addEventListener('keydown', async (e) => {
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    const currentContact = contacts[currentIndex];

    // C = Soita (Call)
    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      dialog.close();
      await performContactAction(currentContact.element, 'call');
    } 
    // E = Sähköposti (Email)
    else if (e.key.toLowerCase() === 'e') {
      e.preventDefault();
      dialog.close();
      await performContactAction(currentContact.element, 'email');
    }
    // Perusnavigointi (nuolet ja kirjaimet)
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
  });
}

/**
 * Hoitaa klikkauksen ja toiminnon (soitto/sähköposti)
 */
async function performContactAction(element, type) {
  // 1. Avataan yhteystiedon kortti
  element.click();
  
  // 2. Odotetaan, että Telavox ehtii renderöidä kortin tiedot (esim. Mikko Kakon näkymä)
  await new Promise(r => setTimeout(r, 600));

  if (type === 'call') {
    // Etsitään iso vihreä painike, joka ilmestyy avatulle yhteystietokortille
    // DOMissa: <button class="... size-10 bg-green ...">
    const callBtn = document.querySelector('button.bg-green.size-10');
    if (callBtn) {
      callBtn.click();
    } else {
      console.error("Soittopainiketta ei löytynyt!");
    }
  } 
  else if (type === 'email') {
    // DOM-löydös: Etsitään a-tagia, jonka href alkaa "mailto:"
    // Tämä on 100% varma tapa löytää oikea sähköpostilinkki
    const emailLink = document.querySelector('a[href^="mailto:"]');
    if (emailLink) {
      // Sähköpostin tapauksessa klikkaamme a-tagia suoraan
      emailLink.click();
    } else {
      console.error("Sähköpostiosoitetta ei löytynyt tälle yhteystiedolle!");
    }
  }
}