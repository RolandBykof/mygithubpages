(function () {
    let dialog = null;
    let listContainer = null;
    let lastFocusedElement = null;

    // Luodaan käyttöliittymä (Dialog) vain kerran
    function createDialog() {
        dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', 'Sivun toiminnot');
        dialog.style.cssText = `
            position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
            width: 80%; max-width: 600px; max-height: 80vh;
            background: #1a1a1a; color: #ffffff;
            border: 2px solid #4CAF50; border-radius: 8px;
            padding: 0; margin: 0; z-index: 999999;
            box-shadow: 0 10px 25px rgba(0,0,0,0.8);
            display: flex; flex-direction: column;
        `;

        // Otsikko
        const header = document.createElement('div');
        header.innerText = "Valitse toiminto (Selaa nuolilla tai kirjoita nimi)";
        header.style.cssText = "padding: 15px; background: #2d2d2d; border-bottom: 1px solid #444; font-weight: bold;";
        dialog.appendChild(header);

        // Itse lista
        listContainer = document.createElement('div');
        listContainer.setAttribute('role', 'listbox');
        listContainer.style.cssText = "overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 5px;";
        dialog.appendChild(listContainer);

        document.body.appendChild(dialog);

        // Sulkeminen Esc-näppäimellä tai taustaa klikkaamalla
        dialog.addEventListener('close', () => {
            if (lastFocusedElement) lastFocusedElement.focus();
        });
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });
    }

    // Etsii elementin nimen (innerText, aria-label, alt, title)
    function getElementName(el) {
        const text = el.innerText || el.textContent;
        if (text && text.trim().length > 0) return text.trim().substring(0, 50); // Max 50 merkkiä
        
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        if (el.getAttribute('title')) return el.getAttribute('title');
        if (el.tagName === 'IMG' && el.alt) return `Kuva: ${el.alt}`;
        
        // Jos sisällä on kuva, jolla on alt
        const innerImg = el.querySelector('img');
        if (innerImg && innerImg.alt) return innerImg.alt;

        return `Nimetön ${el.tagName.toLowerCase()}`;
    }

    // Skannaa sivun ja täyttää listan
    function scanAndOpen() {
        if (!dialog) createDialog();
        
        // Tyhjennetään vanha lista
        listContainer.innerHTML = '';
        lastFocusedElement = document.activeElement;

        // Etsintäkriteerit: Klikattavat elementit, jotka EIVÄT ole jo valmiiksi hyviä (button/a/input)
        // TAI ovat button/a mutta ilman tekstiä
        const selector = 'div, span, img, li, [onclick], [role="button"]';
        const candidates = document.querySelectorAll(selector);
        
        const items = [];
        
        candidates.forEach(el => {
            const style = window.getComputedStyle(el);
            const isPointer = style.cursor === 'pointer';
            // Varmistetaan että elementti on näkyvissä
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;

            // Hylätään natiivit elementit, jos ne ovat jo kunnossa (paitsi jos haluamme kaiken listaan)
            // Tässä versiossa keräämme "epäilyttävät" elementit
            const isNative = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);

            if (isVisible && (isPointer || el.hasAttribute('onclick')) && !isNative) {
                // Estetään tuplat (jos parent ja child molemmat valittuina)
                if (el.closest('[data-a11y-scanned="true"]')) return;
                
                el.dataset.a11yScanned = "true"; // Merkitään käsitellyksi tälle ajolle
                
                const name = getElementName(el);
                if (name) {
                    items.push({ name, element: el });
                }
            }
        });

        // Puhdistetaan merkinnät
        candidates.forEach(el => delete el.dataset.a11yScanned);

        if (items.length === 0) {
            alert("Ei löytynyt interaktiivisia elementtejä.");
            return;
        }

        // Luodaan listapainikkeet
        items.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.innerText = item.name;
            btn.style.cssText = `
                text-align: left; padding: 10px; border: 1px solid #444; 
                background: #333; color: white; cursor: pointer; width: 100%;
                border-radius: 4px; font-size: 16px;
            `;
            
            // Fokus-efekti
            btn.addEventListener('focus', () => btn.style.background = '#4CAF50');
            btn.addEventListener('blur', () => btn.style.background = '#333');

            // Toiminto
            btn.addEventListener('click', () => {
                dialog.close();
                item.element.click();
                item.element.focus();
                // Vilautetaan alkuperäistä elementtiä
                const originalOutline = item.element.style.outline;
                item.element.style.outline = "4px solid orange";
                setTimeout(() => item.element.style.outline = originalOutline, 1000);
            });

            // Näppäimistönavigaatio (Nuolilla liikkuminen)
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = btn.nextElementSibling;
                    if (next) next.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = btn.previousElementSibling;
                    if (prev) prev.focus();
                } else if (e.key.length === 1) {
                    // Alkukirjainhaku
                    const char = e.key.toLowerCase();
                    const allBtns = Array.from(listContainer.children);
                    // Etsi seuraava, joka alkaa kirjaimella
                    const nextMatch = allBtns.find((b, i) => i > index && b.innerText.toLowerCase().startsWith(char));
                    const firstMatch = allBtns.find(b => b.innerText.toLowerCase().startsWith(char));
                    
                    if (nextMatch) nextMatch.focus();
                    else if (firstMatch) firstMatch.focus();
                }
            });

            listContainer.appendChild(btn);
        });

        dialog.showModal();
        // Fokusoidaan ensimmäinen elementti
        listContainer.firstElementChild.focus();
    }

    // Kuuntelija
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggle_menu") {
            if (dialog && dialog.open) {
                dialog.close();
            } else {
                scanAndOpen();
            }
        }
    });
})();