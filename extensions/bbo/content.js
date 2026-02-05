/**
 * BBO Accessibility Assistant v7.0 (Hybrid-malli)
 */

(function() {
    console.log("BBO-A11Y: Käynnistetään Hybrid-avustaja...");

    // 1. ILMOITUSALUE (Aria-live)
    let liveRegion = document.getElementById('bbo-a11y-announcer');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'bbo-a11y-announcer';
        liveRegion.setAttribute('aria-live', 'assertive');
        Object.assign(liveRegion.style, {
            position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)'
        });
        document.body.appendChild(liveRegion);
    }

    function announce(msg) {
        console.log("BBO-Puhe:", msg);
        liveRegion.textContent = "";
        setTimeout(() => { liveRegion.textContent = msg; }, 50);
    }

    announce("Avustaja aktivoitu.");

    // 2. TUNNISTUSLOGIIKKA (Laajennettu haku)
    const SUITS = [
        { name: "Pata", keys: ["♠", "S", "SPADE"] },
        { name: "Hertta", keys: ["♥", "H", "HEART"] },
        { name: "Ruutu", keys: ["♦", "D", "DIAMOND"] },
        { name: "Risti", keys: ["♣", "C", "CLUB"] }
    ];

    const RANKS = { "A": "Ässä", "K": "Kuningas", "Q": "Rouva", "J": "Jätkä", "T": "10", "10": "10" };

    function identifyCard(el) {
        // Otetaan kaikki teksti elementin sisältä ja poistetaan roskat
        const rawText = el.textContent.replace(/[ \n\t]/g, "").toUpperCase();
        const html = el.innerHTML.toLowerCase();
        
        // Etsitään arvo (Rank)
        const rankMatch = rawText.match(/[AKQJT2-9]|10/);
        if (!rankMatch) return null;
        const r = rankMatch[0];

        // Etsitään maa (Suit)
        let foundSuit = null;
        for (const suit of SUITS) {
            // Tarkistetaan symbolit tekstistä
            if (suit.keys.some(k => rawText.includes(k))) {
                foundSuit = suit.name;
                break;
            }
            // Tarkistetaan HTML (jos maa on esim. kuvatiedoston nimessä)
            if (suit.keys.some(k => html.includes(k.toLowerCase()))) {
                foundSuit = suit.name;
                break;
            }
        }

        if (foundSuit) {
            return `${foundSuit} ${RANKS[r] || r}`;
        }
        return null;
    }

    // 3. KORTTIEN KÄSITTELY
    function scan() {
        // Etsitään sekä card-image luokkia että kaikkia divejä, jos luokkaa ei löydy
        const candidates = document.querySelectorAll('.card-image, .cardSurfaceClass > div, .hand-diagram-panel div');
        
        let foundCount = 0;

        candidates.forEach(el => {
            // Ohitetaan jos jo käsitelty tai piilotettu
            if (el.dataset.a11yReady || el.offsetParent === null) return;

            const label = identifyCard(el);
            if (label) {
                el.dataset.a11yReady = "true";
                foundCount++;

                const btn = document.createElement('button');
                btn.setAttribute('aria-label', label);
                btn.className = 'a11y-card-button';
                
                // Tehdään painikkeesta näkyvä kehitysvaiheessa (punainen reunus), 
                // jotta näet jos se löytää jotain
                Object.assign(btn.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                    zIndex: '10000', background: 'rgba(255,0,0,0.1)', border: '1px solid red',
                    cursor: 'pointer'
                });

                btn.onclick = (e) => {
                    e.stopPropagation();
                    announce("Pelataan " + label);
                    el.click();
                };

                el.style.position = 'relative';
                el.appendChild(btn);
                console.log("Löydetty kortti:", label);
            }
        });

        if (foundCount > 0) {
            announce("Löytyi " + foundCount + " uutta korttia.");
        }
    }

    // Suoritetaan haku usein
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(scan, 2000);
    scan();

})();