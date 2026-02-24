const elementData = {
    tag: $0.tagName,
    classes: [...$0.classList],
    text: $0.innerText.substring(0, 100),
    rect: $0.getBoundingClientRect(),
    styles: {
        zIndex: window.getComputedStyle($0).zIndex,
        position: window.getComputedStyle($0).position,
        display: window.getComputedStyle($0).display
    },
    // UUSI SAAVUTETTAVUUSOSIO:
    accessibility: {
        role: $0.getAttribute('role') || 'Ei määritetty (käyttää HTML-oletusta)',
        tabIndex: $0.getAttribute('tabindex') !== null ? $0.getAttribute('tabindex') : 'Ei määritetty',
        isFocusable: $0.tabIndex >= 0, // Kertoo, voiko elementtiin mennä sarkaimella
        ariaLabel: $0.getAttribute('aria-label') || null,
        ariaExpanded: $0.getAttribute('aria-expanded') || null,
        ariaHidden: $0.getAttribute('aria-hidden') || null,
        ariaControls: $0.getAttribute('aria-controls') || null,
        disabled: $0.disabled || $0.getAttribute('aria-disabled') === 'true',
        // Etsitään kaikki elementin aria-alkuiset attribuutit automaattisesti
        allAriaAttributes: Array.from($0.attributes)
            .filter(attr => attr.name.startsWith('aria-'))
            .reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {})
    }
};

// Lataa JSON-tiedostona
const blob = new Blob([JSON.stringify(elementData, null, 2)], {type : 'application/json'});
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `analyysi_${$0.tagName.toLowerCase()}.json`;
link.click();