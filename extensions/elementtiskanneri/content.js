(function () {
    let dialog = null;
    let listContainer = null;
    let lastFocusedElement = null;

    // --- KÄYTTÖLIITTYMÄ ---
    function createDialog() {
        dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', 'Sivun elementit');
        dialog.style.cssText = `
            position: fixed; top: 5%; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 700px; max-height: 90vh;
            background: #1a1a1a; color: #ffffff;
            border: 2px solid #555; border-radius: 8px;
            padding: 0; margin: 0; z-index: 2147483647;
            box-shadow: 0 0 100px rgba(0,0,0,0.9);
            display: flex; flex-direction: column; font-family: sans-serif;
        `;

        const header = document.createElement('div');
        header.id = 'a11y-header-title';
        header.style.cssText = "padding: 15px; background: #000; border-bottom: 1px solid #444; font-weight: bold; font-size: 1.1em;";
        dialog.appendChild(header);

        listContainer = document.createElement('div');
        listContainer.setAttribute('role', 'listbox');
        listContainer.style.cssText = "overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 2px; flex-grow: 1;";
        dialog.appendChild(listContainer);

        const closeHelp = document.createElement('div');
        closeHelp.innerText = "ESC: Sulje | Nuolet: Selaa | Kirjain: Haku";
        closeHelp.style.cssText = "padding: 8px; background: #000; border-top: 1px solid #444; text-align: center; font-size: 0.85em; color: #888;";
        dialog.appendChild(closeHelp);

        document.body.appendChild(dialog);
        
        dialog.addEventListener('close', () => {
            if (lastFocusedElement) lastFocusedElement.focus();
        });
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });
    }

    // --- APUFUNKTIOT ---
    function getElementName(el) {
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
        if (el.getAttribute('aria-labelledby')) {
            const labelEl = document.getElementById(el.getAttribute('aria-labelledby'));
            if (labelEl) return labelEl.innerText;
        }
        const text = el.innerText || el.textContent;
        if (text && text.trim().length > 0) return text.trim().substring(0, 80).replace(/\s+/g, ' ');
        if (el.tagName === 'IMG' && el.alt) return `Kuva: ${el.alt}`;
        if (el.tagName === 'INPUT' && el.placeholder) return el.placeholder;
        if (el.title) return el.title;
        return "Nimetön kohde";
    }

    // --- FOKUKSEN HALLINTA KLIKKAUKSEN JÄLKEEN ---
    function handlePostClickFocus(originalElement) {
        const preWaitActive = document.activeElement;
        setTimeout(() => {
            if (document.activeElement !== preWaitActive && document.activeElement !== document.body) return;

            const overlays = document.querySelectorAll('.cdk-overlay-container, [role="dialog"], [role="menu"], .modal, .popup');
            let targetContainer = null;
            
            for (let i = overlays.length - 1; i >= 0; i--) {
                const el = overlays[i];
                const style = window.getComputedStyle(el);
                if (style.display !== 'none' && style.visibility !== 'hidden' && el.innerHTML.trim() !== "") {
                    targetContainer = el;
                    break;
                }
            }

            if (targetContainer) {
                const focusable = targetContainer.querySelector('button, a, input, [tabindex="0"]');
                if (focusable) focusable.focus();
            }
        }, 500);
    }

    // --- SKANNAUS ---
    function scanAndOpen(mode) {
        if (!dialog) createDialog();
        
        listContainer.innerHTML = '';
        lastFocusedElement = document.activeElement;
        
        const header = document.getElementById('a11y-header-title');
        header.innerText = mode === 'smart' 
            ? "Korjauslista (Alt+S)" 
            : "Kaikki kohteet (Alt+A)";

        const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [onclick], [role="button"], [role="link"]';
        const candidates = Array.from(document.querySelectorAll(selector));
        const items = [];
        
        candidates.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) return;
            if (el.closest('[data-a11y-scanned="true"]')) return;

            const isNative = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
            const name = getElementName(el);
            
            if (mode === 'smart') {
                const hasName = name && name !== "Nimetön kohde";
                if (isNative && hasName) return; 
            }
            
            el.dataset.a11yScanned = "true";
            items.push({ name, element: el });
        });

        candidates.forEach(el => delete el.dataset.a11yScanned);

        if (items.length === 0) {
            alert("Ei elementtejä.");
            return;
        }

        // Luodaan lista
        items.forEach((item, index) => {
            const btn = document.createElement('button');
            const highlightColor = mode === 'smart' ? '#ff5252' : '#4CAF50';
            
            // Tallennetaan puhdas nimi hakuja varten
            btn.dataset.searchName = item.name.toLowerCase();

            // Vain nimi näkyviin
            btn.innerText = item.name;
            
            btn.style.cssText = `
                text-align: left; padding: 10px 15px; 
                border: 1px solid #333; border-left: 4px solid #333;
                background: #222; color: #eee; cursor: pointer; width: 100%;
                border-radius: 2px; font-size: 16px; 
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            `;
            
            btn.addEventListener('focus', () => {
                btn.style.background = '#333';
                btn.style.borderLeftColor = highlightColor;
                btn.style.color = '#fff';
                btn.scrollIntoView({ block: 'nearest' });
            });
            
            btn.addEventListener('blur', () => {
                btn.style.background = '#222'; // TÄSSÄ OLI VIRHE, NYT KORJATTU
                btn.style.borderLeftColor = '#333';
                btn.style.color = '#eee';
            });

            btn.addEventListener('click', () => {
                dialog.close();
                item.element.focus();
                item.element.click();
                handlePostClickFocus(item.element);
            });

            // Näppäinlogiikka
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (btn.nextElementSibling) btn.nextElementSibling.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (btn.previousElementSibling) btn.previousElementSibling.focus();
                } else if (e.key.length === 1) {
                    const char = e.key.toLowerCase();
                    const allBtns = Array.from(listContainer.children);
                    
                    let match = allBtns.find((b, i) => i > index && b.dataset.searchName.startsWith(char));
                    if (!match) {
                        match = allBtns.find(b => b.dataset.searchName.startsWith(char));
                    }
                    if (match) match.focus();
                }
            });

            listContainer.appendChild(btn);
        });

        dialog.showModal();
        listContainer.firstElementChild.focus();
    }

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "open_menu") {
            if (dialog && dialog.open) {
                dialog.close();
            } else {
                scanAndOpen(request.mode);
            }
        }
    });
})();