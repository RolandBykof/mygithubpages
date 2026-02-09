(function() {
    console.log("Saavutettavuuslaajennus käynnistetään v2...");

    // 1. Luodaan turvallisempi ilmoitusalue
    let liveRegion = document.getElementById('extension-status-announcer');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('id', 'extension-status-announcer');
        
        // Ehdottoman näkymätön mutta ruudunlukijalle olemassa oleva tyyli
        Object.assign(liveRegion.style, {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0',
            top: '0'
        });
        document.body.appendChild(liveRegion);
    }

    function fixAccessibility() {
        // --- TYÖJONOT ---
        const elements = document.querySelectorAll('.vi-dropdown-toggle, span, div');
        elements.forEach(el => {
            if (el.textContent.trim() === 'Työjonot' && !el.hasAttribute('role')) {
                el.setAttribute('role', 'button');
                el.setAttribute('tabindex', '0');
                el.setAttribute('aria-expanded', 'false');
                console.log("Työjonot korjattu.");
            }
        });

        // --- ASIANTUNTIJALLE SIIRTO ---
        const subactions = document.querySelectorAll('.create-subaction');
        subactions.forEach(sa => {
            if (!sa.hasAttribute('role')) {
                sa.setAttribute('role', 'button');
                sa.setAttribute('tabindex', '0');
                sa.setAttribute('aria-label', 'Asiantuntijalle siirto');
                console.log("Siirto-painike korjattu.");
            }
        });

        // --- NÄPPÄIMISTÖTUKI ---
        const customButtons = document.querySelectorAll('[role="button"]');
        customButtons.forEach(btn => {
            if (!btn.dataset.kbAttached) {
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
                btn.dataset.kbAttached = "true";
            }
        });
    }

    // Suoritetaan korjaukset
    fixAccessibility();
    const observer = new MutationObserver(fixAccessibility);
    observer.observe(document.body, { childList: true, subtree: true });

    // Ilmoitetaan käynnistyminen ja tyhjennetään viesti hetken päästä
    setTimeout(() => {
        liveRegion.textContent = "Laajennus aktivoitu.";
        setTimeout(() => { liveRegion.textContent = ""; }, 3000);
    }, 1000);
})();