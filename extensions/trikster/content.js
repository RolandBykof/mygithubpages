// ================================================================
// Heart-helper – Trickster Cards screen reader support  V1.5
// ================================================================
// READING CARDS – OWN HAND (Alt commands):
//   Alt+A  Spades     Alt+S  Hearts
//   Alt+D  Diamonds   Alt+F  Clubs
//   Alt+G  Full hand  Alt+L  Playable
//   Alt+P  Log        Alt+H  Help
//
// CONTRACT AND TRICK COUNTER:
//   Alt+C  Contract and trick status  (e.g. "1 Spades. Declarer 2/7. Defense 1.")
//
// READING CARDS – DUMMY'S HAND (Alt commands):
//   Alt+Q  Dummy Spades     Alt+W  Dummy Hearts
//   Alt+E  Dummy Diamonds   Alt+R  Dummy Clubs
//   Alt+T  Dummy full hand
//
// PLAYING A CARD – two-step:
//   Step 1 – suit:   S=Spades  H=Hearts  D=Diamonds  C=Clubs
//   Step 2 – rank:   2–9  0=Ten  J Q K A
//   Extension automatically detects whether it is your turn or dummy's turn.
//   Escape cancels the selection.
//   E.g. Spades 9: S 9   Hearts K: H K   Diamonds 10: D 0
//
// PLAYING THE LED SUIT (single key, when no suit is pending):
//   L  Highest playable card of the led suit
//   K  Lowest playable card of the led suit
//   (Works from both own hand and dummy depending on whose turn it is.)
//
//   Note: K also works as King in the two-step system
//   (e.g. Spades K: S K) — context determines the meaning.
//
// SEAT SELECTION (in the table-joining view):
//   Tab reaches the open seats: West, North, East.
//   Enter or Space selects the seat.
//   Occupied seat player names are read by the screen reader.
// ================================================================

console.log('Heart-helper V1.5 loaded');

const HertApuri = (function () {

    // ----------------------------------------------------------------
    // 1. LIVE REGION
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
    // 2. CONSTANTS
    // ----------------------------------------------------------------

    const RANK_EN_TO_SHORT = {
        'Two': '2', 'Three': '3', 'Four': '4', 'Five': '5', 'Six': '6',
        'Seven': '7', 'Eight': '8', 'Nine': '9', 'Ten': '10',
        'Jack': 'J', 'Queen': 'Q', 'King': 'K', 'Ace': 'A'
    };

    // Order for descending sort (A highest)
    const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

    const SUIT_EN = {
        'Spades': 'Spades', 'Hearts': 'Hearts', 'Diamonds': 'Diamonds', 'Clubs': 'Clubs'
    };

    const SUIT_ORDER = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

    // Letter used for playing → English suit
    const KEY_TO_SUIT = {
        's': 'Spades', 'h': 'Hearts', 'd': 'Diamonds', 'c': 'Clubs'
    };

    // Key → short rank
    const KEY_TO_RANK = {
        '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
        '7': '7', '8': '8', '9': '9',
        '0': '10',   // 0 = Ten
        'j': 'J', 'q': 'Q', 'k': 'K', 'a': 'A'
    };

    // Converts short rank to spoken word (A→Ace, K→King, Q→Queen, J→Jack)
    const RANK_TO_WORD = { 'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack' };
    function rankToWord(r) { return RANK_TO_WORD[r] || r; }

    // ----------------------------------------------------------------
    // 3. HELPER FUNCTIONS – OWN HAND
    // ----------------------------------------------------------------

    function parseLabel(label) {
        if (!label) return null;
        const m = label.match(/^(\w+)\s+of\s+(\w+)/);
        if (!m) return null;
        return {
            rankShort: RANK_EN_TO_SHORT[m[1]] || m[1],
            suitEn:    m[2],
            suitFi:    SUIT_EN[m[2]] || m[2]
        };
    }

    function rankIndex(rankShort) {
        const idx = RANK_ORDER.indexOf(rankShort);
        return idx === -1 ? -1 : idx;
    }

    /** Returns the player's own hand cards (class="card hand face-up"). */
    function getHandCards() {
        return Array.from(document.querySelectorAll('#cards .card.hand.face-up'));
    }

    /** Returns the player's own playable cards. */
    function getLegalCards() {
        return Array.from(document.querySelectorAll('#cards .card.hand.face-up.legal'));
    }

    function getHandBySuit(suitEn) {
        return getHandCards().filter(function (el) {
            return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
        });
    }

    // Sorts parsed array descending (A first)
    function sortDesc(parsedArr) {
        return parsedArr.slice().sort(function (a, b) {
            return rankIndex(b.rankShort) - rankIndex(a.rankShort);
        });
    }

    // ----------------------------------------------------------------
    // 3b. HELPER FUNCTIONS – DUMMY'S HAND
    // ----------------------------------------------------------------

    /**
     * Returns dummy's cards.
     * Dummy's cards are visible (face-up, revealed) but do not have the
     * "hand" class — they belong to the partner or opponent who is dummy.
     *
     * DOM: #cards .card.face-up.revealed   (without .hand class)
     */
    function getDummyCards() {
        return Array.from(document.querySelectorAll('#cards .card.face-up.revealed')).filter(function (el) {
            return !el.classList.contains('hand');
        });
    }

    /** Returns dummy's playable cards. */
    function getLegalDummyCards() {
        return Array.from(document.querySelectorAll('#cards .card.face-up.revealed.legal')).filter(function (el) {
            return !el.classList.contains('hand');
        });
    }

    function getDummyBySuit(suitEn) {
        return getDummyCards().filter(function (el) {
            return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
        });
    }

    /**
     * Returns true if it is dummy's turn to play.
     * Detected by legal cards being present in dummy's hand (revealed without hand),
     * and not in own hand.
     */
    function isDummyTurn() {
        return getLegalDummyCards().length > 0 && getLegalCards().length === 0;
    }

    /**
     * Returns true if play is in progress (own or dummy's turn).
     * Used to check whether suit commands should be activated.
     */
    function hasAnyLegalCards() {
        return getLegalCards().length > 0 || getLegalDummyCards().length > 0;
    }

    // ----------------------------------------------------------------
    // 4. READING FUNCTIONS – OWN HAND
    // ----------------------------------------------------------------

    /**
     * Reads one suit's cards from own hand.
     * Format: "5 Spades A Q J 10 9"
     */
    function readSuit(suitEn) {
        const suitName = SUIT_EN[suitEn] || suitEn;
        const cards = getHandBySuit(suitEn);

        if (cards.length === 0) {
            speak('No ' + suitName);
            return;
        }

        const parsed = sortDesc(
            cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
        );

        speak(cards.length + ' ' + suitName + ' ' + parsed.map(function (p) { return rankToWord(p.rankShort); }).join(' '));
    }

    /**
     * Reads the full own hand by suit.
     * Format: "13 cards. 5 Spades A Q J 10 9. 4 Hearts ..."
     */
    function readFullHand() {
        const hand = getHandCards();

        if (hand.length === 0) {
            speak('Hand is empty');
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
            parts.push(cards.length + ' ' + SUIT_EN[suitEn] + ' ' + parsed.map(function (p) { return rankToWord(p.rankShort); }).join(' '));
        });

        speak(hand.length + ' cards. ' + parts.join('. '));
    }

    /** Reads the playable cards by suit. */
    function readLegalCards() {
        const cards = getLegalCards();

        if (cards.length === 0) {
            speak('No playable cards');
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
            parts.push(list.length + ' ' + SUIT_EN[suitEn] + ' ' + list.map(function (p) { return rankToWord(p.rankShort); }).join(' '));
        });

        speak('Playable ' + cards.length + ': ' + parts.join('. '));
    }

    // ----------------------------------------------------------------
    // 4b. READING FUNCTIONS – DUMMY'S HAND
    // ----------------------------------------------------------------

    /**
     * Reads one suit's cards from dummy's hand.
     * Format: "Dummy 4 Spades K J 9 4"
     */
    function readDummySuit(suitEn) {
        const suitName = SUIT_EN[suitEn] || suitEn;
        const cards = getDummyBySuit(suitEn);

        if (getDummyCards().length === 0) {
            speak('Dummy hand not visible');
            return;
        }

        if (cards.length === 0) {
            speak('Dummy has no ' + suitName);
            return;
        }

        const parsed = sortDesc(
            cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
        );

        speak('Dummy ' + cards.length + ' ' + suitName + ' ' + parsed.map(function (p) { return rankToWord(p.rankShort); }).join(' '));
    }

    /**
     * Reads dummy's full hand by suit.
     * Format: "Dummy 13 cards. 4 Spades K J 9 4. ..."
     */
    function readFullDummyHand() {
        const hand = getDummyCards();

        if (hand.length === 0) {
            speak('Dummy hand not visible');
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
            parts.push(cards.length + ' ' + SUIT_EN[suitEn] + ' ' + parsed.map(function (p) { return rankToWord(p.rankShort); }).join(' '));
        });

        speak('Dummy ' + hand.length + ' cards. ' + parts.join('. '));
    }

    /** Reviews the game event log. */
    function readGameLog() {
        const log = document.querySelector('.sr-only[role="log"]');
        if (!log) { speak('Log not found'); return; }

        const entries = Array.from(log.querySelectorAll('div'))
            .map(function (d) { return d.textContent.trim(); })
            .filter(Boolean);

        if (entries.length === 0) { speak('Log is empty'); return; }

        speak('Log: ' + entries.slice(-5).join('. '));
    }

    // ----------------------------------------------------------------
    // 5. DETERMINING THE LED SUIT FROM THE LOG
    // ----------------------------------------------------------------

    /**
     * Determines the led suit from the game event log.
     * Returns the English suit name ('Spades' etc.) or null
     * if there is no led suit (player is opening the trick or log does not tell).
     *
     * Logic:
     *   1. Find the most recent "Trick to …" entry that ends the previous trick.
     *   2. All entries after it belong to the current trick.
     *   3. The first card entry among those is the opening card → its suit.
     */
    function getLedSuit() {
        const log = document.querySelector('.sr-only[role="log"]');
        if (!log) return null;

        const entries = Array.from(log.querySelectorAll('div'))
            .map(function (d) { return d.textContent.trim(); })
            .filter(Boolean);

        // Find the most recent trick boundary ("Trick to …")
        let lastTrickIdx = -1;
        for (let i = entries.length - 1; i >= 0; i--) {
            if (/^Trick\b/i.test(entries[i])) {
                lastTrickIdx = i;
                break;
            }
        }

        // Go through the entries of the current trick
        const currentTrick = entries.slice(lastTrickIdx + 1);

        for (let i = 0; i < currentTrick.length; i++) {
            const entry = currentTrick[i];

            // "West led Six of Hearts."  or  "[Name] led Rank of Suit."
            const mLed = entry.match(/\bled\s+(\w+)\s+of\s+(\w+)/i);
            if (mLed && RANK_EN_TO_SHORT[mLed[1]]) {
                return mLed[2];
            }

            // "You played Five of Clubs."  or  "[Name] played Five of Clubs."
            const mPlayed = entry.match(/\bplayed\s+(\w+)\s+of\s+(\w+)/i);
            if (mPlayed && RANK_EN_TO_SHORT[mPlayed[1]]) {
                return mPlayed[2];
            }

            // "Five of Clubs."  (short form for other players' cards)
            const mCard = entry.match(/^(\w+)\s+of\s+(\w+)\.?$/i);
            if (mCard && RANK_EN_TO_SHORT[mCard[1]]) {
                return mCard[2];
            }
        }

        return null; // player is opening the trick, no led suit
    }

    // ----------------------------------------------------------------
    // 6. PLAYING THE LED SUIT  (L = highest, K = lowest)
    //    Automatically detects dummy's turn.
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
     * Plays the highest or lowest playable card of the led suit.
     * Automatically uses the correct hand (own / dummy) based on whose turn it is.
     * mode: 'highest' | 'lowest'
     */
    function playLedSuitCard(mode) {
        const suitEn = getLedSuit();

        if (!suitEn) {
            speak('No led suit — you are the opener');
            return;
        }

        const suitName = SUIT_EN[suitEn] || suitEn;
        const dummyTurn = isDummyTurn();

        // Playable cards of the led suit from the correct hand
        const legalPool = dummyTurn ? getLegalDummyCards() : getLegalCards();
        const legal = legalPool.filter(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            return p && p.suitEn === suitEn;
        });

        if (legal.length === 0) {
            const prefix = dummyTurn ? 'Dummy ' : '';
            speak(prefix + 'No ' + suitName + ' to play');
            return;
        }

        // Sort and select
        const candidates = legal.map(function (el) {
            return { el: el, p: parseLabel(el.getAttribute('aria-label')) };
        });
        candidates.sort(function (a, b) {
            return rankIndex(b.p.rankShort) - rankIndex(a.p.rankShort);
        });

        const chosen = (mode === 'highest') ? candidates[0] : candidates[candidates.length - 1];
        // Note: the site announces the played card, so no speak() here
        simulateClick(chosen.el);
    }

    // ----------------------------------------------------------------
    // 7. PLAYING A CARD – TWO-STEP SHORTCUT
    //    Automatically detects dummy's turn.
    // ----------------------------------------------------------------

    let _pendingSuit = null;
    let _pendingTimer = null;

    function cancelPending() {
        _pendingSuit = null;
        clearTimeout(_pendingTimer);
        _pendingTimer = null;
    }

    function suitKeyPressed(suitEn) {
        // Activates only when there are playable cards (own or dummy hand)
        if (!hasAnyLegalCards()) return false;

        cancelPending();
        _pendingSuit = suitEn;

        // Also indicate which hand we are playing from
        const dummyTurn = isDummyTurn();
        const prefix = dummyTurn ? 'Dummy ' : '';
        speak(prefix + SUIT_EN[suitEn] + '?');

        _pendingTimer = setTimeout(function () {
            if (_pendingSuit) { speak('Cancelled'); cancelPending(); }
        }, 5000);

        return true;
    }

    function rankKeyPressed(rankShort) {
        const suitEn = _pendingSuit;
        const suitName = SUIT_EN[suitEn];
        cancelPending();

        const cardName = suitName + ' ' + rankToWord(rankShort);
        const dummyTurn = isDummyTurn();

        if (dummyTurn) {
            // --- Dummy's turn ---
            const inDummy = getDummyCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (inDummy.length === 0) {
                speak('Dummy has no ' + cardName);
                return;
            }

            const legalDummy = getLegalDummyCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (legalDummy.length === 0) {
                speak('Dummy ' + cardName + ' not playable');
                return;
            }

            // Note: the site announces the played card, so no speak() here
            simulateClick(legalDummy[0]);

        } else {
            // --- Own turn ---
            const inHand = getHandCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (inHand.length === 0) {
                speak('No ' + cardName + ' in hand');
                return;
            }

            const legal = getLegalCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (legal.length === 0) {
                speak(cardName + ' not playable');
                return;
            }

            // Note: the site announces the played card, so no speak() here
            simulateClick(legal[0]);
        }
    }

    // ----------------------------------------------------------------
    // 8. CONTRACT AND TRICK COUNTER  (Alt+C)
    // ----------------------------------------------------------------

    /**
     * Reads the contract and trick status aloud.
     *
     * Declarer is identified as: the only player div with
     * aria-label="Expected Score: N" filled in.
     *
     * Contract: from declarer's div.trump > span (level) + span.suit.* or span.notrump.
     *
     * Tricks:
     *   - Declarer's tricks:  declarer's span.hand-score  (aria-label="Hand score: N")
     *   - Defense tricks: sum of all other hand-scores
     *
     * Example announcement: "1 Spades. Declarer 2/7. Defense 1."
     */
    function readContractStatus() {
        const players = Array.from(document.querySelectorAll('#players .player'));

        if (players.length === 0) {
            speak('Players not found');
            return;
        }

        // --- Find declarer: they have an expected-score value ---
        let declarerEl    = null;
        let expectedTricks = null;
        let declarerTricks = 0;

        for (const player of players) {
            const expEl = player.querySelector('span.expected-score');
            if (!expEl) continue;
            const expLabel = expEl.getAttribute('aria-label') || '';
            const mExp = expLabel.match(/Expected Score:\s*(\d+)/i);
            if (!mExp) continue;

            declarerEl     = player;
            expectedTricks = parseInt(mExp[1], 10);

            const scoreEl = player.querySelector('span.hand-score');
            if (scoreEl) {
                const mScore = (scoreEl.getAttribute('aria-label') || '').match(/Hand score:\s*(\d+)/i);
                if (mScore) declarerTricks = parseInt(mScore[1], 10);
            }
            break;
        }

        if (!declarerEl || expectedTricks === null) {
            speak('Contract not found — is play phase active?');
            return;
        }

        // --- Contract from div.trump ---
        let contractStr = '';
        const trumpDiv = declarerEl.querySelector('div.trump');
        if (trumpDiv) {
            // Level: first direct span child
            const spans = Array.from(trumpDiv.querySelectorAll(':scope > span'));
            const level = spans.length > 0 ? spans[0].textContent.trim() : '';

            // Suit: span.suit.Spades etc., or span.notrump
            let suitName = '';
            const notrumpSpan = trumpDiv.querySelector('span.notrump');
            if (notrumpSpan) {
                suitName = 'NT';
            } else {
                const suitSpan = trumpDiv.querySelector('span.suit');
                if (suitSpan) {
                    const suitClass = Array.from(suitSpan.classList).find(function (c) { return SUIT_EN[c]; });
                    suitName = suitClass ? SUIT_EN[suitClass] : '';
                }
            }

            if (level) {
                contractStr = level + (suitName ? ' ' + suitName : '') + '. ';
            }
        }

        // --- Defense tricks: all players' total minus declarer ---
        let totalTricks = 0;
        players.forEach(function (player) {
            const scoreEl = player.querySelector('span.hand-score');
            if (!scoreEl) return;
            const m = (scoreEl.getAttribute('aria-label') || '').match(/Hand score:\s*(\d+)/i);
            if (m) totalTricks += parseInt(m[1], 10);
        });
        const defenderTricks = totalTricks - declarerTricks;

        speak(contractStr + 'Declarer ' + declarerTricks + '/' + expectedTricks + '. Defense ' + defenderTricks + '.');
    }

    // ----------------------------------------------------------------
    // 8b. HELP
    // ----------------------------------------------------------------
    function showHelp() {
        speak([
            'Help.',
            'Own hand Alt A spades, Alt S hearts, Alt D diamonds, Alt F clubs, Alt G full hand.',
            'Dummy hand Alt Q spades, Alt W hearts, Alt E diamonds, Alt R clubs, Alt T full hand.',
            'Other: Alt C contract and trick counter, Alt L playable, Alt P log.',
            'Playing: first suit key S H D or C, then rank 2 9 0 J Q K A.',
            'Extension automatically detects own and dummy turn.',
            'L plays highest, K plays lowest of the led suit.',
            'Note: K also works as King (e.g. S K = spades king).',
            'Escape cancels the suit.',
            'When joining a table Tab reaches open seats West, North, East.',
            'Enter or Space selects the seat.'
        ].join(' '));
    }

    // ----------------------------------------------------------------
    // 9. KEYBOARD HANDLER
    // ----------------------------------------------------------------
    document.addEventListener('keydown', function (e) {

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        function block() {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        // --- ALT COMMANDS: reading cards ---
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const key = e.key.toLowerCase();

            // Own hand
            if (key === 'a') { block(); readSuit('Spades');      return; }
            if (key === 's') { block(); readSuit('Hearts');      return; }
            if (key === 'd') { block(); readSuit('Diamonds');    return; }
            if (key === 'f') { block(); readSuit('Clubs');       return; }
            if (key === 'g') { block(); readFullHand();          return; }

            // Dummy's hand
            if (key === 'q') { block(); readDummySuit('Spades');   return; }
            if (key === 'w') { block(); readDummySuit('Hearts');   return; }
            if (key === 'e') { block(); readDummySuit('Diamonds'); return; }
            if (key === 'r') { block(); readDummySuit('Clubs');    return; }
            if (key === 't') { block(); readFullDummyHand();       return; }

            // Contract and trick counter
            if (key === 'c') { block(); readContractStatus();      return; }

            // Other
            if (key === 'l') { block(); readLegalCards();        return; }
            if (key === 'p') { block(); readGameLog();           return; }
            if (key === 'h') { block(); showHelp();              return; }
            return;
        }

        // --- PLAYING (no modifiers) ---
        if (!e.altKey && !e.ctrlKey && !e.shiftKey) {
            const key = e.key.toLowerCase();

            // Escape: cancel pending suit
            if (e.key === 'Escape' && _pendingSuit) {
                block();
                speak('Cancelled');
                cancelPending();
                return;
            }

            // Step 2: rank (when suit is pending)
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

            // L / K: highest / lowest of led suit (only when no suit pending)
            if (key === 'l') {
                if (hasAnyLegalCards()) {
                    block();
                    playLedSuitCard('highest');
                    return;
                }
            }
            if (key === 'k') {
                if (hasAnyLegalCards()) {
                    block();
                    playLedSuitCard('lowest');
                    return;
                }
            }

            // Step 1: suit key
            if (KEY_TO_SUIT[key]) {
                const captured = suitKeyPressed(KEY_TO_SUIT[key]);
                if (captured) { block(); return; }
            }
        }

    }, true); // capture phase

    // ----------------------------------------------------------------
    // 11. SEAT SELECTION – ACCESSIBILITY PATCH
    // ----------------------------------------------------------------
    //
    // In the table-joining view, below each open game three seat divs
    // are shown: .user.left.open, .user.top.open, .user.right.open
    // (bridge compass: left=West, top=North, right=East).
    // Taken seats are .user.*.disabled.
    //
    // All these divs default to tabindex="-1", so they cannot be
    // reached by keyboard. This section fixes that:
    //
    //   Open seat (.open):
    //     → tabindex="0" + role="button"
    //     → aria-label="Select seat: West" (/ North / East)
    //     → Enter or Space simulates a mouse click
    //
    //   Taken seat (.disabled):
    //     → aria-label="Seat North: Matti" (player name)
    //       (helps understand the table situation)
    //
    // MutationObserver keeps the patch up to date when the game list
    // loads or seats fill up in real time.
    // ----------------------------------------------------------------

    (function () {

        const SEAT_POS = { left: 'West', top: 'North', right: 'East' };

        function seatPosOf(el) {
            return ['left', 'top', 'right'].find(function (c) {
                return el.classList.contains(c);
            }) || null;
        }

        function playerNameOf(el) {
            var nameEl = el.querySelector('.unique-name-text');
            if (!nameEl) return null;
            var name = nameEl.textContent.trim();
            return (name && name !== 'Open Seat') ? name : null;
        }

        function patchSeat(el) {
            var pos      = seatPosOf(el);
            var posLabel = pos ? SEAT_POS[pos] : 'free';

            if (el.classList.contains('open')) {
                // Open seat → selectable button
                el.setAttribute('tabindex', '0');
                el.setAttribute('role', 'button');
                el.setAttribute('aria-label', 'Select seat: ' + posLabel);
            } else {
                // Taken or unknown → announce who is sitting there
                var name  = playerNameOf(el);
                var label = 'Seat ' + posLabel + (name ? ': ' + name : ': taken');
                el.setAttribute('aria-label', label);
                el.setAttribute('tabindex', '-1');
                el.removeAttribute('role');
            }
        }

        function patchAll() {
            document.querySelectorAll('.users .user').forEach(patchSeat);
        }

        // Keyboard handling: delegation to the whole document (capture phase)
        // Activates only when focus is on an open seat div.
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var el = e.target;
            if (!el.classList.contains('user') || !el.classList.contains('open')) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            var posLabel = SEAT_POS[seatPosOf(el)] || 'free';
            speak('Selecting seat: ' + posLabel);
            // Click is directed at the inner child because the app likely uses
            // event delegation and checks event.target.
            // When clicking with the mouse the target is always some inner element,
            // not the .user div itself.
            var clickTarget = el.querySelector('.name-tag') ||
                              el.querySelector('.unique-name-text') ||
                              el;
            simulateClick(clickTarget);
        }, true);

        // MutationObserver: react when game list loads or seats change
        new MutationObserver(patchAll).observe(document.body, {
            childList:       true,
            subtree:         true,
            attributes:      true,
            attributeFilter: ['class']
        });

        // Initial patch (if list already visible)
        patchAll();

    }());

    // ----------------------------------------------------------------
    // 10. STARTUP ANNOUNCEMENT
    // ----------------------------------------------------------------
    setTimeout(function () {
        speak('Heart-helper V1.5 loaded. Alt H opens help.');
    }, 1500);

    return {
        readSuit:            readSuit,
        readFullHand:        readFullHand,
        readDummySuit:       readDummySuit,
        readFullDummyHand:   readFullDummyHand,
        readLegalCards:      readLegalCards,
        readContractStatus:  readContractStatus,
        getLedSuit:          getLedSuit,
        isDummyTurn:         isDummyTurn
    };

})();
