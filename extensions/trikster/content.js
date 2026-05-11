// ================================================================
// Hertta-apuri – Trickster Cards ruudunlukutuki  V1.2
// ================================================================
// KORTTIEN LUKEMINEN (Alt-komennot):
//   Alt+A  Pata       Alt+S  Hertta
//   Alt+D  Ruutu      Alt+F  Risti
//   Alt+G  Koko käsi  Alt+L  Pelattavat
//   Alt+P  Loki       Alt+H  Ohjeet
//
// KORTIN PELAAMINEN – kaksivaiheinen:
//   Vaihe 1 – maaväri:   S=Pata  H=Hertta  D=Ruutu  C=Risti
//   Vaihe 2 – arvo:      2–9  0=Kymmenen  J Q K A
//   Escape peruuttaa valinnan.
//   Esim. Pata 9: S 9   Hertta K: H K   Ruutu 10: D 0
//
// PYYDETYN MAAN PELAAMINEN (yksittäinen näppäin, kun maaväriä ei valittuna):
//   L  Suurin pelattava kortti pyydettyä maata
//   K  Pienin pelattava kortti pyydettyä maata
//   (Jos ei pyydettyä maata tai ei ko. maata kädessä, laajennus kertoo sen.)
//
//   Huom: K toimii myös Kuninkaana kaksivaiheisessa systeemissä
//   (esim. Pata K: S K) — tila ratkaisee merkityksen.
// ================================================================

console.log('Hertta-apuri V1.2 ladattu');

const HertApuri = (function () {

    // ----------------------------------------------------------------
    // 1. ÄÄNIALUE
    // ----------------------------------------------------------------
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = [
        'position:absolute', 'width:1px', 'height:1px', 'padding:0',
        'margin:-1px', 'overflow:hidden', 'clip:rect(0,0,0,0)',
        'white-space:nowrap', 'border:0'
    ].join(';');
    document.body.appendChild(liveRegion);

    let _speechTimer = null;

    function speak(text) {
        liveRegion.textContent = '';
        clearTimeout(_speechTimer);
        _speechTimer = setTimeout(function () {
            liveRegion.textContent = text;
        }, 50);
    }

    // ----------------------------------------------------------------
    // 2. VAKIOT
    // ----------------------------------------------------------------

    const RANK_EN_TO_SHORT = {
        'Two': '2', 'Three': '3', 'Four': '4', 'Five': '5', 'Six': '6',
        'Seven': '7', 'Eight': '8', 'Nine': '9', 'Ten': '10',
        'Jack': 'J', 'Queen': 'Q', 'King': 'K', 'Ace': 'A'
    };

    // Järjestys laskevaan lajitteluun (A korkein)
    const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

    const SUIT_FI = {
        'Spades': 'Pata', 'Hearts': 'Hertta', 'Diamonds': 'Ruutu', 'Clubs': 'Risti'
    };

    const SUIT_ORDER = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

    // Pelaamistarkoituksessa käytetty kirjain → englanninkielinen maaväri
    const KEY_TO_SUIT = {
        's': 'Spades', 'h': 'Hearts', 'd': 'Diamonds', 'c': 'Clubs'
    };

    // Näppäin → lyhyt arvo
    const KEY_TO_RANK = {
        '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
        '7': '7', '8': '8', '9': '9',
        '0': '10',   // 0 = Kymmenen
        'j': 'J', 'q': 'Q', 'k': 'K', 'a': 'A'
    };

    // ----------------------------------------------------------------
    // 3. APUFUNKTIOT
    // ----------------------------------------------------------------

    function parseLabel(label) {
        if (!label) return null;
        const m = label.match(/^(\w+)\s+of\s+(\w+)/);
        if (!m) return null;
        return {
            rankShort: RANK_EN_TO_SHORT[m[1]] || m[1],
            suitEn:    m[2],
            suitFi:    SUIT_FI[m[2]] || m[2]
        };
    }

    function rankIndex(rankShort) {
        const idx = RANK_ORDER.indexOf(rankShort);
        return idx === -1 ? -1 : idx;
    }

    function getHandCards() {
        return Array.from(document.querySelectorAll('#cards .card.hand.face-up'));
    }

    function getLegalCards() {
        return Array.from(document.querySelectorAll('#cards .card.hand.face-up.legal'));
    }

    function getHandBySuit(suitEn) {
        return getHandCards().filter(function (el) {
            return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
        });
    }

    // Lajittelee parsed-taulun laskevasti (A ensin)
    function sortDesc(parsedArr) {
        return parsedArr.slice().sort(function (a, b) {
            return rankIndex(b.rankShort) - rankIndex(a.rankShort);
        });
    }

    // ----------------------------------------------------------------
    // 4. LUKEMISFUNKTIOT
    // ----------------------------------------------------------------

    /**
     * Lukee yhden maavärin kortit kädestä.
     * Formaatti: "5 Pata A Q J 10 9"
     */
    function readSuit(suitEn) {
        const suitFi = SUIT_FI[suitEn] || suitEn;
        const cards = getHandBySuit(suitEn);

        if (cards.length === 0) {
            speak('Ei ' + suitFi + 'a');
            return;
        }

        const parsed = sortDesc(
            cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
        );

        speak(cards.length + ' ' + suitFi + ' ' + parsed.map(function (p) { return p.rankShort; }).join(' '));
    }

    /**
     * Lukee koko käden maaväreittäin.
     * Formaatti: "13 korttia. 5 Pata A Q J 10 9. 4 Hertta ..."
     */
    function readFullHand() {
        const hand = getHandCards();

        if (hand.length === 0) {
            speak('Käsi on tyhjä');
            return;
        }

        const parts = [];

        SUIT_ORDER.forEach(function (suitEn) {
            const cards = hand.filter(function (el) {
                return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
            });
            if (cards.length === 0) return;

            const parsed = sortDesc(
                cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
            );
            parts.push(cards.length + ' ' + SUIT_FI[suitEn] + ' ' + parsed.map(function (p) { return p.rankShort; }).join(' '));
        });

        speak(hand.length + ' korttia. ' + parts.join('. '));
    }

    /** Lukee pelattavissa olevat kortit maaväreittäin. */
    function readLegalCards() {
        const cards = getLegalCards();

        if (cards.length === 0) {
            speak('Ei pelattavia kortteja');
            return;
        }

        const bySuit = {};
        SUIT_ORDER.forEach(function (s) { bySuit[s] = []; });

        cards.forEach(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            if (p && bySuit[p.suitEn]) bySuit[p.suitEn].push(p);
        });

        const parts = [];
        SUIT_ORDER.forEach(function (suitEn) {
            const list = sortDesc(bySuit[suitEn]);
            if (list.length === 0) return;
            parts.push(list.length + ' ' + SUIT_FI[suitEn] + ' ' + list.map(function (p) { return p.rankShort; }).join(' '));
        });

        speak('Pelattavat ' + cards.length + ' kpl: ' + parts.join('. '));
    }

    /** Kertaa pelin tapahtumalokia. */
    function readGameLog() {
        const log = document.querySelector('.sr-only[role="log"]');
        if (!log) { speak('Lokia ei löydy'); return; }

        const entries = Array.from(log.querySelectorAll('div'))
            .map(function (d) { return d.textContent.trim(); })
            .filter(Boolean);

        if (entries.length === 0) { speak('Loki on tyhjä'); return; }

        speak('Loki: ' + entries.slice(-5).join('. '));
    }

    // ----------------------------------------------------------------
    // 5. PYYDETYN MAAN SELVITTÄMINEN LOKISTA
    // ----------------------------------------------------------------

    /**
     * Selvittää pyydetyn maan (led suit) pelin tapahtumalokista.
     * Palauttaa englanninkielisen maavärin ('Spades' jne.) tai null
     * jos ei pyydettyä maata (pelaaja avaa vuoron tai loki ei kerro).
     *
     * Logiikka:
     *   1. Etsi viimeisin "Trick to …" -merkintä, joka päättää edellisen voiton.
     *   2. Kaikki sen jälkeiset merkinnät kuuluvat käynnissä olevaan vuoroon.
     *   3. Ensimmäinen korttimerkintä näistä on avaava kortti → sen maaväri.
     */
    function getLedSuit() {
        const log = document.querySelector('.sr-only[role="log"]');
        if (!log) return null;

        const entries = Array.from(log.querySelectorAll('div'))
            .map(function (d) { return d.textContent.trim(); })
            .filter(Boolean);

        // Etsi viimeisin vuoronvaihtorajapyykki ("Trick to …")
        let lastTrickIdx = -1;
        for (let i = entries.length - 1; i >= 0; i--) {
            if (/^Trick\b/i.test(entries[i])) {
                lastTrickIdx = i;
                break;
            }
        }

        // Käy läpi tämän vuoron merkinnät
        const currentTrick = entries.slice(lastTrickIdx + 1);

        for (let i = 0; i < currentTrick.length; i++) {
            const entry = currentTrick[i];

            // "West led Six of Hearts."  tai  "[Nimi] led Rank of Suit."
            const mLed = entry.match(/\bled\s+(\w+)\s+of\s+(\w+)/i);
            if (mLed && RANK_EN_TO_SHORT[mLed[1]]) {
                return mLed[2];
            }

            // "You played Five of Clubs."  tai  "[Nimi] played Five of Clubs."
            const mPlayed = entry.match(/\bplayed\s+(\w+)\s+of\s+(\w+)/i);
            if (mPlayed && RANK_EN_TO_SHORT[mPlayed[1]]) {
                return mPlayed[2];
            }

            // "Five of Clubs."  (lyhyt muoto muiden pelaajien korteille)
            const mCard = entry.match(/^(\w+)\s+of\s+(\w+)\.?$/i);
            if (mCard && RANK_EN_TO_SHORT[mCard[1]]) {
                return mCard[2];
            }
        }

        return null; // pelaaja avaa vuoron, ei pyydettyä maata
    }

    // ----------------------------------------------------------------
    // 6. PYYDETYN MAAN PELAAMINEN  (L = suurin, K = pienin)
    // ----------------------------------------------------------------

    function simulateClick(el) {
        if (!el) return;
        const opts = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new PointerEvent('pointerdown', opts));
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new PointerEvent('pointerup', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
    }

    /**
     * Pelaa suurimman tai pienimmän pelattavan kortin pyydettyä maata.
     * mode: 'highest' | 'lowest'
     */
    function playLedSuitCard(mode) {
        const suitEn = getLedSuit();

        if (!suitEn) {
            speak('Ei pyydettyä maata — olet avaaja');
            return;
        }

        const suitFi = SUIT_FI[suitEn] || suitEn;

        // Pelattavissa olevat kortit pyydettyä maata
        const legal = getLegalCards().filter(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            return p && p.suitEn === suitEn;
        });

        if (legal.length === 0) {
            // Ei ko. maata pelattavana (voidattu tai ei pelattavissa)
            speak('Ei ' + suitFi + 'a pelattavana');
            return;
        }

        // Järjestä ja valitse
        const candidates = legal.map(function (el) {
            return { el: el, p: parseLabel(el.getAttribute('aria-label')) };
        });
        candidates.sort(function (a, b) {
            return rankIndex(b.p.rankShort) - rankIndex(a.p.rankShort);
        });

        const chosen = (mode === 'highest') ? candidates[0] : candidates[candidates.length - 1];

        speak('Pelataan ' + chosen.p.suitFi + ' ' + chosen.p.rankShort);
        simulateClick(chosen.el);
    }

    // ----------------------------------------------------------------
    // 7. KORTIN PELAAMINEN – KAKSIVAIHEINEN PIKANÄPPÄIN
    // ----------------------------------------------------------------

    let _pendingSuit = null;
    let _pendingTimer = null;

    function cancelPending() {
        _pendingSuit = null;
        clearTimeout(_pendingTimer);
        _pendingTimer = null;
    }

    function suitKeyPressed(suitEn) {
        if (getHandCards().length === 0) return false;

        cancelPending();
        _pendingSuit = suitEn;
        speak(SUIT_FI[suitEn] + '?');

        _pendingTimer = setTimeout(function () {
            if (_pendingSuit) { speak('Peruutettu'); cancelPending(); }
        }, 5000);

        return true;
    }

    function rankKeyPressed(rankShort) {
        const suitEn = _pendingSuit;
        const suitFi = SUIT_FI[suitEn];
        cancelPending();

        const cardName = suitFi + ' ' + rankShort;

        const inHand = getHandCards().filter(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            return p && p.suitEn === suitEn && p.rankShort === rankShort;
        });

        if (inHand.length === 0) {
            speak('Ei ' + cardName + ':ää kädessä');
            return;
        }

        const legal = getLegalCards().filter(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            return p && p.suitEn === suitEn && p.rankShort === rankShort;
        });

        if (legal.length === 0) {
            speak(cardName + ' ei pelattavissa');
            return;
        }

        speak('Pelataan ' + cardName);
        simulateClick(legal[0]);
    }

    // ----------------------------------------------------------------
    // 8. OHJE
    // ----------------------------------------------------------------
    function showHelp() {
        speak([
            'Ohjeet.',
            'Yksittäispelaamiskomennot:',
            'L pelaa suurimman kortin pyydettyä maata.',
            'K pelaa pienimmän kortin pyydettyä maata.',
            'Kaksivaiheinen pelaaminen: ensin maavärikirjain, sitten arvo.',
            'S pata, H hertta, D ruutu, C risti.',
            'Arvot 2–9, nolla on kymmenen, J Q K A.',
            'Huom: K toimii myös Kuninkaana kaksivaiheisessa (esim. S K = pata kuningas).',
            'Lukeminen Alt-näppäimillä:',
            'Alt A pata, Alt S hertta, Alt D ruutu, Alt F risti.',
            'Alt G koko käsi, Alt L pelattavat, Alt P loki.'
        ].join(' '));
    }

    // ----------------------------------------------------------------
    // 9. NÄPPÄIMISTÖNKÄSITTELIJÄ
    // ----------------------------------------------------------------
    document.addEventListener('keydown', function (e) {

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        function block() {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        // --- ALT-KOMENNOT: korttien lukeminen ---
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const key = e.key.toLowerCase();
            if (key === 'a') { block(); readSuit('Spades');   return; }
            if (key === 's') { block(); readSuit('Hearts');   return; }
            if (key === 'd') { block(); readSuit('Diamonds'); return; }
            if (key === 'f') { block(); readSuit('Clubs');    return; }
            if (key === 'g') { block(); readFullHand();       return; }
            if (key === 'l') { block(); readLegalCards();     return; }
            if (key === 'p') { block(); readGameLog();        return; }
            if (key === 'h') { block(); showHelp();           return; }
            return;
        }

        // --- PELAAMINEN (ei modifikaattoreja) ---
        if (!e.altKey && !e.ctrlKey && !e.shiftKey) {
            const key = e.key.toLowerCase();

            // Escape: peruuta odottava maaväri
            if (e.key === 'Escape' && _pendingSuit) {
                block();
                speak('Peruutettu');
                cancelPending();
                return;
            }

            // Vaihe 2: arvo (kun maaväri odottaa)
            if (_pendingSuit) {
                const rankShort = KEY_TO_RANK[key];
                if (rankShort) {
                    block();
                    rankKeyPressed(rankShort);
                } else {
                    cancelPending();
                }
                return;
            }

            // L / K: pyydetyn maan suurin / pienin (vain kun ei maaväriä odottamassa)
            if (key === 'l') {
                if (getLegalCards().length > 0) {
                    block();
                    playLedSuitCard('highest');
                    return;
                }
            }
            if (key === 'k') {
                if (getLegalCards().length > 0) {
                    block();
                    playLedSuitCard('lowest');
                    return;
                }
            }

            // Vaihe 1: maavärikirjain
            if (KEY_TO_SUIT[key]) {
                const captured = suitKeyPressed(KEY_TO_SUIT[key]);
                if (captured) { block(); return; }
            }
        }

    }, true); // capture-vaihe

    // ----------------------------------------------------------------
    // 10. KÄYNNISTYSILMOITUS
    // ----------------------------------------------------------------
    setTimeout(function () {
        speak('Hertta-apuri ladattu. Alt H avaa ohjeet.');
    }, 1500);

    return {
        readSuit: readSuit,
        readFullHand: readFullHand,
        readLegalCards: readLegalCards,
        getLedSuit: getLedSuit
    };

})();
