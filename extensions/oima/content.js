/**
 * Oima A11y Fix v4.0
 * Hiljentää aggressiiviset ja jatkuvasti re-renderöityvät verokortti-ilmoitukset
 * pakottamalla aria-live-alueet pois päältä.
 */

const fixOimaA11y = () => {
    // --- 1. VEROKORTTI-ILMOITUKSEN TÄYDELLINEN HILJENTÄMINEN ---
    const silenceAlerts = () => {
        // Etsitään NVDA-raportin mukaiset elementit sekä mahdolliset live-alueet
        const elementsToSilence = document.querySelectorAll(
            '.c-feedback__body, .o-flag__body, [role="alert"], [role="status"], [aria-live="polite"], [aria-live="assertive"]'
        );

        elementsToSilence.forEach(el => {
            // Kohdistetaan hiljennys verokorttiin liittyviin teksteihin
            if (el.textContent.includes("verokorttia") || el.textContent.includes("verokortti")) {
                
                // 1. Poistetaan rooli, joka laukaisee ilmoituksen (status / alert)
                if (el.getAttribute('role') === 'status' || el.getAttribute('role') === 'alert') {
                    el.removeAttribute('role');
                }
                
                // 2. Pakotetaan live-seuranta pois päältä ja estetään koko tekstin pakotettu luku (atomic)
                el.setAttribute('aria-live', 'off');
                el.removeAttribute('aria-atomic');

                // 3. NVDA-raportti mainitsi "container-live: polite". 
                // Tämä tarkoittaa, että jokin ylätason elementti saattaa huudella tekstiä.
                // Etsitään isäntäelementit ja hiljennetään nekin.
                let parent = el.parentElement;
                while (parent && parent !== document.body) {
                    if (parent.hasAttribute('aria-live') && parent.getAttribute('aria-live') !== 'off') {
                        parent.setAttribute('aria-live', 'off');
                    }
                    if (parent.getAttribute('role') === 'status' || parent.getAttribute('role') === 'alert') {
                        parent.removeAttribute('role');
                    }
                    if (parent.hasAttribute('aria-atomic')) {
                        parent.removeAttribute('aria-atomic');
                    }
                    parent = parent.parentElement;
                }
            }
        });
    };

    // --- 2. PALKKAJAKSON TOIMINNOT -VALIKKO (AIEMPI KORJAUS) ---
    const fixMenuA11y = () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const menuButton = buttons.find(btn => btn.textContent.includes('Palkkajakson toiminnot'));

        if (!menuButton) return;

        if (!menuButton.hasAttribute('aria-haspopup')) {
            menuButton.setAttribute('aria-haspopup', 'menu');
        }

        const targetId = menuButton.id;
        const dropdownId = targetId ? targetId.replace('-target', '-dropdown') : null;

        if (dropdownId) {
            const dropdown = document.getElementById(dropdownId);
            const isVisible = !!dropdown;
            
            menuButton.setAttribute('aria-expanded', isVisible ? 'true' : 'false');

            if (isVisible) {
                const firstItem = dropdown.querySelector('[role="menuitem"]');
                if (firstItem && !firstItem.dataset.a11yFixed) {
                    firstItem.dataset.a11yFixed = 'true';
                    setTimeout(() => {
                        firstItem.focus();
                    }, 50);
                }
            } else {
                menuButton.removeAttribute('data-dropdown-open');
            }
        }
    };

    silenceAlerts();
    fixMenuA11y();
};

// --- 3. JATKUVA TARKKAILU (SPA / REACT) ---
const observer = new MutationObserver(() => {
    requestAnimationFrame(fixOimaA11y);
});

if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-live'] });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-live'] });
        fixOimaA11y();
    });
}