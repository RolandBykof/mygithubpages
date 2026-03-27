// =========================================================
// Funbridge Accessibility Extension (NVDA Screen Reader Support)
// Version 1.0 – based on IntoBridge V1.17 architecture
// =========================================================

console.log('Funbridge Accessibility Extension V1.0 Loaded');

// =========================================================
// 1. SCREEN READER SPEAKER
// =========================================================

var liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
    'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
document.body.appendChild(liveRegion);

var speechQueue = [];
var isSpeaking  = false;
var SPEECH_DELAY = 650;

function speak(text) {
    if (!text) return;
    speechQueue.push(text);
    if (!isSpeaking) processSpeechQueue();
}

function speakNow(text) {
    speechQueue    = [];
    isSpeaking     = false;
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = text; }, 50);
}

function processSpeechQueue() {
    if (speechQueue.length === 0) { isSpeaking = false; return; }
    isSpeaking = true;
    var text = speechQueue.shift();
    liveRegion.textContent = '';
    setTimeout(function () {
        liveRegion.textContent = text;
        setTimeout(processSpeechQueue, SPEECH_DELAY);
    }, 50);
}

// =========================================================
// 2. CONSTANTS
// =========================================================

// Funbridge card href format: #card-us-gs-{rank}{suit}
// rank: 2-9, t=10, j=J, q=Q, k=K, a=A
// suit: s=Spade, h=Heart, d=Diamond, c=Club

var FB_RANK_TO_EN = {
    '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
    't':'10','j':'J','q':'Q','k':'K','a':'A'
};
var EN_RANK_TO_FB = {
    '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
    '10':'t','J':'j','Q':'q','K':'k','A':'a'
};
var FB_SUIT_TO_LETTER = { 's':'S', 'h':'H', 'd':'D', 'c':'C' };
var SUIT_LETTER_TO_EN = { 'S':'Spade','H':'Heart','D':'Diamond','C':'Club' };
var SUIT_EN_TO_PLURAL = { 'Spade':'Spades','Heart':'Hearts','Diamond':'Diamonds','Club':'Clubs' };
var SUIT_LETTER_ORDER = ['S','H','D','C'];
var SUIT_ORDER_EN     = ['Spade','Heart','Diamond','Club'];

var CARD_RANK = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    '10':10,'J':11,'Q':12,'K':13,'A':14
};

var KEY_TO_CARD_VALUE = {
    'a':'A','k':'K','q':'Q','j':'J','t':'10',
    '9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2'
};
var KEY_TO_SUIT = { 's':'S','h':'H','d':'D','c':'C' };
var KEY_TO_BID_STRAIN = { 'c':'C','d':'D','h':'H','s':'S','n':'N' };
var BID_STRAIN_EN = { 'C':'Club','D':'Diamond','H':'Heart','S':'Spade','N':'NT' };

var DIRECTION_EN = { 'N':'North','E':'East','S':'South','W':'West' };

var gamePhase           = 'unknown';
var cachedContract      = null;
var activeTurnDirection = null;

// =========================================================
// 3. CARD PARSING
// =========================================================

// Parse a Funbridge card from its SVG use href
// e.g. "#card-us-gs-as" → { rank:'A', suit:'S', suitEn:'Spade', key:'SA' }
function parseFunbridgeHref(href) {
    if (!href) return null;
    var m = href.match(/#card-us-gs-([2-9tjqka])([shdc])$/i);
    if (!m) return null;
    var rankChar = m[1].toLowerCase();
    var suitChar = m[2].toLowerCase();
    var rank  = FB_RANK_TO_EN[rankChar];
    var suitL = FB_SUIT_TO_LETTER[suitChar];
    if (!rank || !suitL) return null;
    return {
        rank:   rank,
        suit:   SUIT_LETTER_TO_EN[suitL],
        suitLetter: suitL,
        key:    suitL + rank,
        fbRank: rankChar,
        fbSuit: suitChar
    };
}

function getHref(useEl) {
    if (!useEl) return null;
    return useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || null;
}

// =========================================================
// 4. HAND READING
// =========================================================

function sortCards(cards) {
    return cards.slice().sort(function (a, b) {
        var si = SUIT_LETTER_ORDER.indexOf(a.suitLetter);
        var sj = SUIT_LETTER_ORDER.indexOf(b.suitLetter);
        if (si !== sj) return si - sj;
        return (CARD_RANK[b.rank] || 0) - (CARD_RANK[a.rank] || 0);
    });
}

function getHandCards(handClass) {
    var cards = [];
    var container = document.querySelector('.' + handClass);
    if (!container) return cards;
    container.querySelectorAll('.bridge-card-svg use').forEach(function (use) {
        var cardEl = use.closest('.bridge-card');
        // Skip cards that have already been played
        if (cardEl && cardEl.classList.contains('bridge-card-played')) return;
        var card = parseFunbridgeHref(getHref(use));
        if (card) {
            card.element = cardEl;
            cards.push(card);
        }
    });
    return sortCards(cards);
}

function getUserHand()  { return getHandCards('cards-hand-BOTTOM'); }

function getDummyHand() {
    // Ensin etsitään cards-hand-dummy -luokalla merkitty käsi
    var dummyEl = document.querySelector('.cards-hand-dummy');
    if (dummyEl) {
        // Selvitä mikä positio tämä on
        var pos = ['cards-hand-TOP','cards-hand-LEFT','cards-hand-RIGHT'];
        for (var i = 0; i < pos.length; i++) {
            if (dummyEl.classList.contains(pos[i])) {
                var cards = getHandCards(pos[i]);
                if (cards.length > 0) return cards;
            }
        }
    }
    // Fallback: yritetään TOP suoraan
    return getHandCards('cards-hand-TOP');
}

function getDummyHandClass() {
    var dummyEl = document.querySelector('.cards-hand-dummy');
    if (dummyEl) {
        var pos = ['cards-hand-TOP','cards-hand-LEFT','cards-hand-RIGHT'];
        for (var i = 0; i < pos.length; i++) {
            if (dummyEl.classList.contains(pos[i])) return pos[i];
        }
    }
    return 'cards-hand-TOP'; // fallback
}

// =========================================================
// 5. DIRECTION DETECTION
// =========================================================

function getUserDirection() {
    var el = document.querySelector('.seat-bottom .seat-position span');
    if (el) {
        var t = el.textContent.trim().toUpperCase();
        if ('NESW'.indexOf(t) !== -1) return t;
    }
    return 'S'; // Funbridge default: user is always South
}

function getNextDirection(dir) {
    var dirs = ['N','E','S','W'];
    var idx  = dirs.indexOf(dir);
    return idx === -1 ? null : dirs[(idx + 1) % 4];
}

function getTrickPositionToDirection() {
    // In Funbridge, user is always South (bottom)
    return { bottom:'S', left:'W', top:'N', right:'E' };
}

// =========================================================
// 6. CLICK SIMULATION
// =========================================================

function simulateClick(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;
    var down = { bubbles:true, cancelable:true, view:window,
                 clientX:cx, clientY:cy, screenX:cx, screenY:cy, button:0, buttons:1 };
    var up   = Object.assign({}, down, { buttons:0 });
    var noBtn = Object.assign({}, down, { button:0, buttons:0 });

    el.dispatchEvent(new PointerEvent('pointerover',  noBtn));
    el.dispatchEvent(new MouseEvent ('mouseover',     noBtn));
    el.dispatchEvent(new PointerEvent('pointerenter', noBtn));
    el.dispatchEvent(new PointerEvent('pointerdown',  down));
    el.dispatchEvent(new MouseEvent ('mousedown',     down));
    el.dispatchEvent(new PointerEvent('pointerup',    up));
    el.dispatchEvent(new MouseEvent ('mouseup',       up));
    el.dispatchEvent(new MouseEvent ('click',         up));
    el.focus();
    return true;
}

// =========================================================
// 7. TURN / ALLOWED HAND RESOLVER
// =========================================================

// Returns 'mine' | 'dummy' | 'both' | 'none'
//
// Funbridge marks individually playable cards with bridge-card-active.
// We check which hands have at least one bridge-card-active card.
// cards-hand-active on the container is NOT reliable (multiple hands active at once).

function handHasActiveCard(handClass) {
    var container = document.querySelector('.' + handClass);
    if (!container) return false;
    return !!container.querySelector('.bridge-card.bridge-card-active');
}

function resolveAllowedHand() {
    var dummyClass   = getDummyHandClass();
    var bottomActive = handHasActiveCard('cards-hand-BOTTOM');
    var dummyActive  = handHasActiveCard(dummyClass);

    // Trust Funbridge's own bridge-card-active markers.
    // Dummy may be TOP, LEFT or RIGHT depending on who is declarer.

    if (bottomActive && dummyActive) {
        var myDir = getUserDirection();
        if (activeTurnDirection && myDir) {
            var partnerDir = getNextDirection(getNextDirection(myDir));
            if (activeTurnDirection === myDir)      return 'mine';
            if (activeTurnDirection === partnerDir) return 'dummy';
        }
        return 'dummy';
    }

    if (dummyActive)  return 'dummy';
    if (bottomActive) return 'mine';
    return 'none';
}

// =========================================================
// 8. SUIT-FOLLOWING HELPERS
// =========================================================

function getTrickLeadSuit() {
    var trick = currentTrick.length > 0 ? currentTrick
              : sortTrickChronologically(readCurrentTrickCards());
    if (trick.length === 0 || trick.length === 4) return null;
    var leadSuitEn = trick[0].suit;
    for (var sl in SUIT_LETTER_TO_EN) {
        if (SUIT_LETTER_TO_EN[sl] === leadSuitEn) return sl;
    }
    return null;
}

function handHasSuit(hand, suitLetter) {
    var suitEn = SUIT_LETTER_TO_EN[suitLetter];
    return hand.some(function (c) { return c.suit === suitEn; });
}

function mustFollowSuit(playingSuitLetter, allowedHand) {
    var leadSuit = getTrickLeadSuit();
    if (!leadSuit) return null;
    if (leadSuit === playingSuitLetter) return null;
    var hand = allowedHand === 'dummy' ? getDummyHand() : getUserHand();
    if (handHasSuit(hand, leadSuit)) return leadSuit;
    return null;
}

// =========================================================
// 9. TRICK WINNER EVALUATION
// =========================================================

function evaluateWinner(cards, trumpSuit) {
    if (!cards || cards.length === 0) return null;
    var winner = cards[0];
    for (var i = 1; i < cards.length; i++) {
        var c = cards[i];
        var isTrump      = trumpSuit && c.suit === SUIT_LETTER_TO_EN[trumpSuit];
        var winnerIsTrump = trumpSuit && winner.suit === SUIT_LETTER_TO_EN[trumpSuit];
        if (isTrump && !winnerIsTrump) {
            winner = c;
        } else if (c.suit === winner.suit) {
            if ((CARD_RANK[c.rank] || 0) > (CARD_RANK[winner.rank] || 0)) winner = c;
        }
    }
    return winner.direction;
}

// =========================================================
// 10. PLAYING A CARD
// =========================================================

function playExtreme(direction) {
    if (!isPlayPhase()) return;
    var trickNow = currentTrick.length > 0 ? currentTrick
                 : sortTrickChronologically(readCurrentTrickCards());

    if (trickNow.length === 0) { speakNow('No trick in progress. Use suit key to lead.'); return; }
    if (trickNow.length === 4) { speakNow('Trick complete. Use suit key to lead.'); return; }

    var allowedHand = resolveAllowedHand();
    if (allowedHand === 'none') { speakNow('Not your turn.'); return; }

    var leadSuit   = getTrickLeadSuit();
    var leadSuitEn = SUIT_LETTER_TO_EN[leadSuit];
    var hand       = allowedHand === 'dummy' ? getDummyHand() : getUserHand();

    var candidates = hand.filter(function (c) { return c.suit === leadSuitEn; });
    if (candidates.length === 0) {
        speakNow('No ' + leadSuitEn + ' in hand. Use suit key to discard.');
        return;
    }

    var sorted = candidates.slice().sort(function (a, b) {
        return (CARD_RANK[a.rank] || 0) - (CARD_RANK[b.rank] || 0);
    });
    var chosen = direction === 'low' ? sorted[0] : sorted[sorted.length - 1];
    playCard(chosen.suitLetter, chosen.rank);
}

function playCard(suitLetter, rank) {
    var suitEn = SUIT_LETTER_TO_EN[suitLetter] || suitLetter;

    var allowedHand = resolveAllowedHand();
    if (allowedHand === 'none') { speakNow('Not your turn.'); return; }

    var requiredSuit = mustFollowSuit(suitLetter, allowedHand);
    if (requiredSuit) {
        var reqEn = SUIT_LETTER_TO_EN[requiredSuit] || requiredSuit;
        var who   = allowedHand === 'dummy' ? 'Dummy has' : 'You have';
        speakNow('Must follow suit. ' + who + ' ' + reqEn + '.');
        return;
    }

    // Build target href
    var fbRank  = EN_RANK_TO_FB[rank] || rank.toLowerCase();
    var fbSuit  = suitLetter.toLowerCase();
    var targetHref = '#card-us-gs-' + fbRank + fbSuit;

    var clicked = false;

    // Try own hand
    if (allowedHand === 'mine' || allowedHand === 'both') {
        var bottomCont = document.querySelector('.cards-hand-BOTTOM');
        if (bottomCont) {
            var use = bottomCont.querySelector('use[href="' + targetHref + '"], use[xlink\\:href="' + targetHref + '"]');
            if (!use) {
                // Fallback: iterate
                bottomCont.querySelectorAll('use').forEach(function (u) {
                    if (!use && getHref(u) === targetHref) use = u;
                });
            }
            if (use) { simulateClick(use.closest('.bridge-card')); clicked = true; }
        }
    }

    // Try dummy hand
    if (!clicked && (allowedHand === 'dummy' || allowedHand === 'both')) {
        var dummyCont = document.querySelector('.' + getDummyHandClass());
        if (dummyCont) {
            var useD = null;
            dummyCont.querySelectorAll('use').forEach(function (u) {
                if (!useD && getHref(u) === targetHref) useD = u;
            });
            if (useD) { simulateClick(useD.closest('.bridge-card')); clicked = true; }
        }
    }

    if (clicked) {
        speakNow(suitEn + ' ' + rank + ' played.');
    } else {
        var where = allowedHand === 'dummy' ? 'dummy' : (allowedHand === 'mine' ? 'your hand' : 'hand or dummy');
        speakNow('No ' + suitEn + ' ' + rank + ' in ' + where + '.');
    }
}

// =========================================================
// 11. BIDDING
// =========================================================

// Bid button IDs: #BID-{LEVEL}{STRAIN}-TABLE-CENTER
// where STRAIN ∈ {C,D,H,S,N}
// Pass: #BID-PA-TABLE-CENTER (also PA0, PA1 variants)
// Double: #BID-X1-TABLE-CENTER
// Redouble: #BID-X2-TABLE-CENTER

function submitBid(level, strain) {
    var bidId = 'BID-' + level + strain.toUpperCase() + '-TABLE-CENTER';
    var btn   = document.getElementById(bidId);
    var strainEn = BID_STRAIN_EN[strain.toUpperCase()] || strain;
    if (!btn) { speakNow('Bid ' + level + ' ' + strainEn + ' not available.'); return; }
    simulateClick(btn);
    speakNow('Bid: ' + level + ' ' + strainEn + '.');
}

function submitPass() {
    var btn = document.getElementById('BID-PA-TABLE-CENTER')
           || document.getElementById('BID-PA0-TABLE-CENTER')
           || document.getElementById('BID-PA1-TABLE-CENTER');
    if (!btn) { speakNow('Pass not available.'); return; }
    simulateClick(btn);
    speakNow('Pass.');
}

function submitDouble() {
    var x1 = document.getElementById('BID-X1-TABLE-CENTER');
    var x2 = document.getElementById('BID-X2-TABLE-CENTER');
    // X2 (redouble) takes priority if both visible
    var btn = (x2 && isElementVisible(x2)) ? x2 : x1;
    if (!btn) { speakNow('Double not available.'); return; }
    var label = (btn.id.indexOf('X2') !== -1) ? 'Redouble.' : 'Double.';
    simulateClick(btn);
    speakNow(label);
}

function isElementVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

// =========================================================
// 12. DOUBLE-KEY STATE MACHINE
// =========================================================

var pendingInput       = null;
var inputTimeoutHandle = null;
var INPUT_TIMEOUT_MS   = 5000;

function setInputTimeout() {
    clearInputTimeout();
    inputTimeoutHandle = setTimeout(function () {
        if (pendingInput !== null) { pendingInput = null; speakNow('Timeout, input cancelled.'); }
    }, INPUT_TIMEOUT_MS);
}

function clearInputTimeout() {
    if (inputTimeoutHandle) { clearTimeout(inputTimeoutHandle); inputTimeoutHandle = null; }
}

function cancelPendingInput() {
    clearInputTimeout();
    pendingInput = null;
    speakNow('Cancelled.');
}

function handleFirstKey(key, blockFn) {
    if (KEY_TO_SUIT[key] && isPlayPhase()) {
        blockFn();
        var chosenSuit = KEY_TO_SUIT[key];
        pendingInput = { type:'card', suit:chosenSuit };
        setInputTimeout();

        var leadSuit = getTrickLeadSuit();
        if (leadSuit && leadSuit !== chosenSuit) {
            var ah = resolveAllowedHand();
            var warnHand = ah === 'dummy' ? getDummyHand() : getUserHand();
            if (handHasSuit(warnHand, leadSuit)) {
                speakNow(SUIT_LETTER_TO_EN[chosenSuit] + '? Warning: must follow ' + SUIT_LETTER_TO_EN[leadSuit] + '.');
                return true;
            }
        }
        speakNow(SUIT_LETTER_TO_EN[chosenSuit] + '?');
        return true;
    }
    if (key >= '1' && key <= '7' && isBiddingPhase()) {
        blockFn();
        pendingInput = { type:'bid', level:key };
        setInputTimeout();
        speakNow('Level ' + key + '?');
        return true;
    }
    if (key === 'p' && isBiddingPhase()) { blockFn(); submitPass();   return true; }
    if (key === 'x' && isBiddingPhase()) { blockFn(); submitDouble(); return true; }
    return false;
}

function handleSecondKey(key) {
    clearInputTimeout();

    if (pendingInput.type === 'card') {
        if (KEY_TO_SUIT[key]) {
            pendingInput.suit = KEY_TO_SUIT[key];
            setInputTimeout();
            var leadSuit2 = getTrickLeadSuit();
            if (leadSuit2 && leadSuit2 !== pendingInput.suit) {
                var ah2 = resolveAllowedHand();
                var warnHand2 = ah2 === 'dummy' ? getDummyHand() : getUserHand();
                if (handHasSuit(warnHand2, leadSuit2)) {
                    speakNow(SUIT_LETTER_TO_EN[pendingInput.suit] + '? Warning: must follow ' + SUIT_LETTER_TO_EN[leadSuit2] + '.');
                    return;
                }
            }
            speakNow(SUIT_LETTER_TO_EN[pendingInput.suit] + '?');
            return;
        }
        var value = KEY_TO_CARD_VALUE[key];
        if (value) {
            var suit = pendingInput.suit;
            pendingInput = null;
            playCard(suit, value);
            return;
        }
        speakNow('Unknown value. ' + SUIT_LETTER_TO_EN[pendingInput.suit] + '?');
        setInputTimeout();
        return;
    }

    if (pendingInput.type === 'bid') {
        if (key >= '1' && key <= '7') {
            pendingInput.level = key;
            setInputTimeout();
            speakNow('Level ' + key + '?');
            return;
        }
        var strain = KEY_TO_BID_STRAIN[key];
        if (strain) {
            var level = pendingInput.level;
            pendingInput = null;
            submitBid(level, strain);
            return;
        }
        speakNow('Unknown suit. Level ' + pendingInput.level + '?');
        setInputTimeout();
        return;
    }
}

// =========================================================
// 13. CURRENT TRICK READING
// =========================================================
// During play phase, Funbridge animates played cards from hand to center.
// Cards played to the trick leave the .cards-hand-* containers.
// We detect trick cards as .bridge-card elements in .table-center
// that are NOT inside a .cards-hand-* container.

// Funbridge keeps played cards inside their original hand containers
// and marks them with class bridge-card-played.
// Direction is determined by which cards-hand-* container the card is in.
var HAND_CLASS_TO_DIR = {
    'cards-hand-TOP':    'N',
    'cards-hand-LEFT':   'W',
    'cards-hand-RIGHT':  'E',
    'cards-hand-BOTTOM': 'S'
};

// readCurrentTrickCards returns ALL bridge-card-played elements –
// including cards from previous tricks. We use element IDs to track
// exactly which cards belong to the current trick.

function readAllPlayedCards() {
    var result = [];
    document.querySelectorAll('.bridge-card.bridge-card-played').forEach(function (cardEl) {
        var useEl = cardEl.querySelector('.bridge-card-svg use');
        var card  = useEl ? parseFunbridgeHref(getHref(useEl)) : null;
        if (!card) return;
        var dir = null;
        for (var cls in HAND_CLASS_TO_DIR) {
            if (cardEl.closest('.' + cls)) { dir = HAND_CLASS_TO_DIR[cls]; break; }
        }
        if (!dir) return;
        result.push({
            id: cardEl.id,
            direction: dir, directionEn: DIRECTION_EN[dir] || dir,
            suit: card.suit, rank: card.rank, key: card.key
        });
    });
    return result;
}

// readCurrentTrickCards: returns only the 4 (or fewer) cards of the current trick
// by tracking which element IDs we have already accounted for.
function readCurrentTrickCards() {
    var all = readAllPlayedCards();
    // Filter to only cards whose ID is in currentTrickIds
    return all.filter(function (c) { return currentTrickIds[c.id]; });
}

function trickSnapshot(cards) {
    return cards.map(function (c) { return c.direction + ':' + c.key; }).sort().join('|');
}

function sortTrickChronologically(cards) {
    if (cards.length <= 1) return cards.slice();
    var dirToIdx = { 'N':0,'E':1,'S':2,'W':3 };
    var idxToDir = ['N','E','S','W'];
    var present  = {};
    cards.forEach(function (c) { present[c.direction] = c; });

    var leaderDir = null;
    for (var i = 0; i < cards.length; i++) {
        var c    = cards[i];
        var myI  = dirToIdx[c.direction];
        var ccwI = (myI + 3) % 4;
        if (!present[idxToDir[ccwI]]) { leaderDir = c.direction; break; }
    }
    if (!leaderDir) return cards.slice();

    var sorted   = [];
    var startIdx = dirToIdx[leaderDir];
    for (var j = 0; j < 4; j++) {
        var dir = idxToDir[(startIdx + j) % 4];
        if (present[dir]) sorted.push(present[dir]);
    }
    return sorted;
}

var previousPlayedIds    = {};  // id → true, all ever-played card IDs seen
var currentTrickIds      = {};  // id → true, only current trick
var currentTrick         = [];
var previousTrickSnapshot = '';

// Alustaa tikin seuranta tilan DOMin nykyisestä tilanteesta ILMAN ilmoituksia.
// Kutsutaan init/reset-tilanteessa kun kortteja on jo pelattu.
// Logiikka: käsi jolla on eniten bridge-card-played -kortteja on aloittanut
// nykyisen tikin. Ne ylimääräiset kortit ovat nykyisessä tikissä.
function initTrickStateFromDOM() {
    var allPlayed = readAllPlayedCards();

    // Merkitse kaikki played-kortit nähdyiksi
    allPlayed.forEach(function (c) { previousPlayedIds[c.id] = true; });

    // Laske per suunta montako played-korttia
    var counts = { N:0, E:0, S:0, W:0 };
    allPlayed.forEach(function (c) { if (counts[c.direction] !== undefined) counts[c.direction]++; });

    var maxCount = Math.max(counts.N, counts.E, counts.S, counts.W);
    var minCount = Math.min(counts.N, counts.E, counts.S, counts.W);

    currentTrick    = [];
    currentTrickIds = {};

    if (maxCount === minCount) {
        // Kaikilla sama määrä: tikki juuri päättynyt tai ei aloitettu
        return;
    }

    // Kortit joiden suunnalla on maxCount ovat nykyisessä tikissä
    // (ne aloittivat uuden tikin). Kaikki muut ylimääräiset kortit myös.
    allPlayed.forEach(function (c) {
        if (counts[c.direction] > minCount) {
            // Tämä kuuluu nykyiseen tikkiin — ota vain yksi per suunta (viimeisin)
            currentTrickIds[c.id] = true;
        }
    });

    // Jos useampi per suunta merkitty, pidä vain viimeisin (korkein indeksi listassa)
    var seen = {};
    var filtered = [];
    // Käy läpi käänteisessä järjestyksessä, pidä vain ensimmäinen per suunta
    for (var i = allPlayed.length - 1; i >= 0; i--) {
        var c = allPlayed[i];
        if (currentTrickIds[c.id] && !seen[c.direction]) {
            seen[c.direction] = true;
            filtered.push(c);
        }
    }
    filtered.reverse();
    currentTrick    = filtered;
    currentTrickIds = {};
    currentTrick.forEach(function (c) { currentTrickIds[c.id] = true; });
}

function detectTrickChanges() {
    var allPlayed = readAllPlayedCards();

    // Etsi vain uudet kortit (ei vielä rekisteröity)
    var newlyPlayed = allPlayed.filter(function (c) { return !previousPlayedIds[c.id]; });
    newlyPlayed.forEach(function (c) { previousPlayedIds[c.id] = true; });

    if (newlyPlayed.length === 0) return;

    // Jos kortteja on pelattu, olemme varmasti pelivaiheessa
    if (gamePhase !== 'play') {
        gamePhase = 'play';
        playPhaseConfirmCount = PLAY_PHASE_CONFIRM_NEEDED;
    }

    // TÄRKEÄÄ: prosessoi kortit DOM-järjestyksessä, mutta käytä bridgelogiikkaa
    // tikkirajan tunnistamiseen. Jokainen suunta (N/E/S/W) esiintyy tikissä
    // TASAN KERRAN. Jos tuleva kortti on suunnalta joka on jo tikissä,
    // se kuuluu SEURAAVAAN tikkiin – riippumatta DOM-järjestyksestä.
    // Tämä korjaa tilanteen jossa Argine pelaa välittömästi tikin jälkeen
    // ja uuden tikin ensimmäinen kortti tulee DOM:ssa ennen tikin viimeistä.

    newlyPlayed.forEach(function (c) {
        var dirAlreadyInTrick = currentTrick.some(function (t) {
            return t.direction === c.direction;
        });

        // Aloita uusi tikki jos:
        // a) nykyinen tikki on täynnä (4 korttia), TAI
        // b) tämä suunta on jo tikissä (bridge-logiikka)
        if (currentTrick.length >= 4 || dirAlreadyInTrick) {
            if (currentTrick.length === 4 || (dirAlreadyInTrick && currentTrick.length > 0)) {
                var trump = (cachedContract && cachedContract.strain !== 'N') ? cachedContract.strain : null;
                var winner = evaluateWinner(currentTrick, trump);
                if (winner) {
                    activeTurnDirection = winner;
                    speak((DIRECTION_EN[winner] || winner) + ' wins the trick.');
                }
            }
            currentTrick    = [];
            currentTrickIds = {};
        }

        currentTrickIds[c.id] = true;
        currentTrick.push(c);
        speak((DIRECTION_EN[c.direction] || c.direction) + ': ' + c.suit + ' ' + c.rank);
        activeTurnDirection = getNextDirection(c.direction);
        // Päivitä F2-painikkeet jos tila on päällä
        if (cardButtonMode) setTimeout(refreshCardButtons, 400);
    });

    // Jos tikki täyttyi tässä kierroksessa (ei ylivuotoa), arvioi voittaja
    // activeTurnDirection-muuttujaa varten (ei ilmoiteta vielä)
    if (currentTrick.length === 4) {
        var ct     = getOrBuildCachedContract();
        var trump2 = (ct && ct.strain !== 'N') ? ct.strain : null;
        var w2     = evaluateWinner(currentTrick, trump2);
        if (w2) activeTurnDirection = w2;
    }

    previousTrickSnapshot = trickSnapshot(readAllPlayedCards());
}

// =========================================================
// 14. TRICK COUNT
// =========================================================

function readTrickCount() {
    // Rakenne: <div.text-end><span>NS</span>"5"</div>
    //          <div.text-start><span>EW</span>"4/8"</div>
    // Numero on tekstisolmu SPAN:n jälkeen.
    var container = document.querySelector('.flex-row-reverse.text-orange');
    if (container) {
        var nsEl = container.querySelector('.text-end');
        var ewEl = container.querySelector('.text-start');
        if (nsEl && ewEl) {
            function getNumberAfterSpan(el) {
                var nodes = el.childNodes;
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].nodeType === 3) { // tekstisolmu
                        var t = nodes[i].textContent.trim();
                        if (t) return t.split('/')[0].trim().replace(/[^0-9]/g, '');
                    }
                }
                // Fallback: innerText kaikki numerot
                return (el.textContent || '').replace(/[^0-9]/g, '') || '0';
            }
            var nsTricks = getNumberAfterSpan(nsEl) || '0';
            var ewTricks = getNumberAfterSpan(ewEl) || '0';
            var myDir    = getUserDirection();
            var iAmNS    = (myDir === 'N' || myDir === 'S');
            speakNow('We: ' + (iAmNS ? nsTricks : ewTricks) +
                     ', they: ' + (iAmNS ? ewTricks : nsTricks) + ' tricks.');
            return;
        }
    }
    // Fallback: laske jäljellä olevista korteista
    var remaining = getUserHand().length;
    speakNow((13 - remaining) + ' tricks played. ' + remaining + ' cards remaining.');
}

// =========================================================
// 15. PHASE DETECTION
// =========================================================

function isBiddingPhase() {
    // Tarjousvaihe: tarjouslaatikko on näkyvissä ja sisältää klikattavia nappeja.
    var bidsContainer = document.querySelector('.table-center-bids');
    if (!bidsContainer) return false;
    var style = window.getComputedStyle(bidsContainer);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return !!bidsContainer.querySelector('.bid.bid-hover');
}

function isPlayPhase() {
    if (isBiddingPhase()) return false;
    // Jos pelivaihe on jo todettu, palautetaan true heti ilman DOM-tarkistusta.
    // Tämä varmistaa, että näppäinkomennot toimivat välittömästi tarjouslaatikon
    // häviämisen jälkeen, ennen kuin lepääjän käsi ehtii ilmestyä näkyviin.
    if (gamePhase === 'play') return true;
    // Pelivaihe: jokin käsi (ei BOTTOM) saa cards-hand-dummy -luokan
    var dummyCls = ['cards-hand-TOP','cards-hand-LEFT','cards-hand-RIGHT'];
    for (var i = 0; i < dummyCls.length; i++) {
        var el = document.querySelector('.' + dummyCls[i]);
        if (el && el.classList.contains('cards-hand-dummy')) return true;
    }
    // Lead-tilanne: tarjouslaatikko poissa, oma käsi fan-muodossa aktiivisena
    var bottomHand = document.querySelector('.cards-hand-BOTTOM');
    if (bottomHand && bottomHand.classList.contains('cards-hand-fan') &&
        bottomHand.classList.contains('cards-hand-active')) return true;
    return false;
}

// Vaaditaan N peräkkäistä isPlayPhase()-vahvistusta ennen siirtymäilmoitusta
var playPhaseConfirmCount = 0;
var PLAY_PHASE_CONFIRM_NEEDED = 1;

function updateGamePhase() {
    var isBidding = isBiddingPhase();
    var isPlay    = isPlayPhase();

    if (isBidding) {
        playPhaseConfirmCount = 0;
        if (gamePhase !== 'bidding') gamePhase = 'bidding';
        return;
    }

    if (isPlay) {
        playPhaseConfirmCount++;
        if (playPhaseConfirmCount >= PLAY_PHASE_CONFIRM_NEEDED && gamePhase !== 'play') {
            var wasUnknown = (gamePhase === 'unknown');
            gamePhase = 'play';
            var contractForLead = getOrBuildCachedContract();
            if (contractForLead && contractForLead.declarer) {
                activeTurnDirection = getNextDirection(contractForLead.declarer);
            }
            if (!wasUnknown) {
                var contractText = readContractDisplay();
                speak(contractText ? 'Bidding ended. Contract: ' + contractText + '.'
                                   : 'Bidding ended. Play phase starts.');
            }
            // Päivitä F2-painikkeet jos tila on päällä – lepääjän käsi tuli nyt näkyviin
            if (cardButtonMode) setTimeout(refreshCardButtons, 500);
        }
    } else {
        playPhaseConfirmCount = 0;
    }
}

// =========================================================
// 16. BID HISTORY READING
// =========================================================
// Auction box in sidebar: .auction-box
// Column headers: .auction-box-title span → S, W, N, E
// Bid rows: .overflow-auto .row (each row has 4 .col.d-grid)
// Bid element ID: BID-{CODE}-{INDEX}-AUCTION-BOX-GAME_SIDEBAR

function parseFunbridgeBidCode(code) {
    if (!code) return null;
    // ID-muoto: BID-{KOODI}{SARAKEINDEKSI}-{RIVIINDEKSI}-AUCTION-BOX
    // esim. PA0, PA1, 2S1, 1N3, X10, X21
    // Poistetaan loppunumero ennen tulkintaa
    var c = code.replace(/\d+$/, '').toUpperCase();
    if (c === 'PA')  return { raw:'Pass',  en:'Pass'      };
    if (c === 'X2')  return { raw:'XX',    en:'Redouble'  };
    if (c === 'X1')  return { raw:'X',     en:'Double'    };
    if (c === 'X')   return { raw:'X',     en:'Double'    };
    var m = c.match(/^([1-7])([NSHDC]{1,2})$/);
    if (m) {
        var strain = m[2] === 'NT' ? 'N' : m[2];
        return { raw: m[1] + strain, en: m[1] + ' ' + (BID_STRAIN_EN[strain] || strain) };
    }
    return null;
}

function readAllBids() {
    var box = document.querySelector('.auction-box');
    if (!box) return [];

    // Suuntajärjestys otsikoista (S W N E tms.)
    var dirs = [];
    box.querySelectorAll('.auction-box-title span').forEach(function (s) {
        var t = s.textContent.trim().toUpperCase();
        if (t === 'N' || t === 'E' || t === 'S' || t === 'W') dirs.push(t);
    });
    if (dirs.length !== 4) return [];

    var overflowEl = box.querySelector('.overflow-auto');
    if (!overflowEl) return [];

    // ID-rakenne: BID-{KOODI}{SEQNUM}-{OCCURRENCE}-AUCTION-BOX-GAME_SIDEBAR
    // esim. BID-PA2-0  → koodi=PA, seqNum=2, occurrence=0
    //       BID-4S5-1  → koodi=4S, seqNum=5, occurrence=1
    // SEQNUM on kronologinen järjestysnumero koko huutokaupassa.
    // Sarakeindeksi (colIdx) kertoo suunnan: dirs[colIdx].
    // Yhdessä sarakkeessa voi olla useita tarjouksia (useammalla rivillä).
    // Haetaan KAIKKI bid-elementit jokaisesta sarakkeesta ja järjestetään seqNum mukaan.

    var collected = [];

    overflowEl.querySelectorAll('.row').forEach(function (row) {
        var cols = row.querySelectorAll('.col.d-grid');
        if (cols.length === 0) return;
        cols.forEach(function (col, colIdx) {
            if (colIdx >= dirs.length) return;
            // querySelectorAll – kaikki tarjoukset tässä sarakkeessa
            col.querySelectorAll('[id*="AUCTION-BOX"]').forEach(function (bidEl) {
                var id = bidEl.id || '';
                var m  = id.match(/^BID-([A-Z0-9]+?)-(\d+)-AUCTION-BOX/i);
                if (!m) return;
                var codeWithSeq = m[1];   // esim. "PA2" tai "4S5"
                // Erotellaan loppunumero (seqNum) koodista
                var seqMatch = codeWithSeq.match(/(\d+)$/);
                var seqNum   = seqMatch ? parseInt(seqMatch[1], 10) : 0;
                var parsed   = parseFunbridgeBidCode(codeWithSeq);
                if (!parsed) return;
                collected.push({
                    seqNum:      seqNum,
                    colIdx:      colIdx,
                    direction:   dirs[colIdx],
                    directionEn: DIRECTION_EN[dirs[colIdx]] || dirs[colIdx],
                    raw:         parsed.raw,
                    translation: parsed.en
                });
            });
        });
    });

    // Järjestä kronologisesti seqNum-numeron mukaan
    collected.sort(function (a, b) { return a.seqNum - b.seqNum; });
    return collected;
}

var spokenBidCount = 0;
var lastBidPollLen = 0;

function checkNewBids() {
    var bids = readAllBids();
    if (bids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < bids.length; i++) {
            speak(bids[i].directionEn + ': ' + bids[i].translation);
        }
        spokenBidCount = bids.length;
    } else if (bids.length < spokenBidCount) {
        spokenBidCount = bids.length;
    }
    lastBidPollLen = bids.length;

    if (isBiddingPhase()) {
        var c = getContractFromBidHistory();
        if (c && c.strain) cachedContract = c;
    }
    // EI kutsuta updateGamePhase() täältä – se laukaisisi
    // vääriä "bidding ended" -ilmoituksia tarjouksen jälkeen.
}

// =========================================================
// 17. CONTRACT READING
// =========================================================

function getContractFromBidHistory() {
    var bids = readAllBids();
    if (bids.length === 0) return null;

    var finalBid = null;
    var finalIdx = -1;

    for (var i = bids.length - 1; i >= 0; i--) {
        var raw = (bids[i].raw || '').toUpperCase();
        if (raw === 'PASS' || raw === 'X' || raw === 'XX') continue;
        var m = raw.match(/^([1-7])([NSHDC])$/);
        if (m) { finalBid = { level:m[1], strain:m[2], lastDir:bids[i].direction }; finalIdx = i; break; }
    }
    if (!finalBid) return null;

    // Find first bid of same strain by same partnership
    var declarer = finalBid.lastDir;
    var sameSide = finalBid.lastDir === 'N' || finalBid.lastDir === 'S' ? ['N','S'] : ['E','W'];

    for (var j = 0; j <= finalIdx; j++) {
        var b = bids[j];
        if (sameSide.indexOf(b.direction) === -1) continue;
        var bRaw = (b.raw || '').toUpperCase();
        var bm   = bRaw.match(/^([1-7])([NSHDC])$/);
        if (bm && bm[2] === finalBid.strain) { declarer = b.direction; break; }
    }

    return { level:finalBid.level, strain:finalBid.strain, declarer:declarer };
}

function getOrBuildCachedContract() {
    if (cachedContract && cachedContract.strain && cachedContract.declarer) return cachedContract;
    var live = getContractFromBidHistory();
    if (live && live.strain && live.declarer) { cachedContract = live; return cachedContract; }
    return cachedContract;
}

function readContractDisplay() {
    var contract = getOrBuildCachedContract();
    if (!contract) return null;
    var strainEn   = BID_STRAIN_EN[contract.strain] || contract.strain;
    var declarerEn = DIRECTION_EN[contract.declarer] || contract.declarer;
    return declarerEn + ' ' + contract.level + ' ' + strainEn;
}

// =========================================================
// 18. VULNERABILITY AND BOARD INFO
// =========================================================

function readVulnerability() {
    // Funbridge shows: <span>Vulnerability:</span><span>None/NS/EW/All</span>
    var vulEl = document.querySelector('.vulnerability-hcp');
    if (!vulEl) {
        var spans = document.querySelectorAll('.sidebar-tabs span, .bridge-table span');
        for (var i = 0; i < spans.length; i++) {
            var t = spans[i].textContent.trim();
            if (t === 'None' || t === 'NS' || t === 'EW' || t === 'All') return t;
        }
        return null;
    }
    var spans2 = vulEl.querySelectorAll('span');
    for (var j = 0; j < spans2.length; j++) {
        var txt = spans2[j].textContent.trim();
        if (txt === 'None' || txt === 'NS' || txt === 'EW' || txt === 'All') return txt;
    }
    return null;
}

function vulnerabilityTextEn(vul) {
    if (!vul) return 'Vulnerability unknown';
    if (vul === 'None') return 'None vulnerable';
    if (vul === 'All')  return 'All vulnerable';
    if (vul === 'NS')   return 'North-South vulnerable';
    if (vul === 'EW')   return 'East-West vulnerable';
    return vul;
}

function readHcp() {
    var el = document.querySelector('.hand-hcp-bottom');
    if (!el) return null;
    var m = (el.textContent || '').match(/\d+/);
    return m ? m[0] : null;
}

var lastAnnouncedBoard = '';

function announceBoard() {
    var vul = readVulnerability();
    var hcp = readHcp();
    var boardKey = (vul || '') + '|' + (hcp || '');
    if (boardKey === lastAnnouncedBoard) return;
    lastAnnouncedBoard    = boardKey;
    spokenBidCount        = 0;
    currentTrick          = [];
    currentTrickIds       = {};
    previousPlayedIds     = {};
    previousTrickSnapshot = '';
    cachedContract        = null;
    activeTurnDirection   = null;
    // Ei kutsuta initTrickStateFromDOM() täällä – uusi lauta alkaa puhtaalta pöydältä.

    var msg = vulnerabilityTextEn(vul) + '.';
    if (hcp) msg += ' South: ' + hcp + ' HCP.';
    speak(msg);
}

// =========================================================
// 19. READING CARDS OUT LOUD
// =========================================================

function readSuitCards(cards, targetSuit) {
    var matching = cards.filter(function (c) { return c.suit === targetSuit; })
                        .map(function (c) { return c.rank; });
    var plural = SUIT_EN_TO_PLURAL[targetSuit] || targetSuit;
    speakNow(matching.length > 0
        ? matching.length + ' ' + plural + ': ' + matching.join(' ')
        : '0 ' + plural);
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) { speakNow(ownerName + ': no cards visible.'); return; }
    var parts = [];
    SUIT_ORDER_EN.forEach(function (suit) {
        var vals = cards.filter(function (c) { return c.suit === suit; })
                        .map(function (c) { return c.rank; });
        if (vals.length > 0) parts.push(vals.length + ' ' + suit + ': ' + vals.join(' '));
    });
    speakNow(ownerName + '. ' + parts.join('. '));
}

function readPlayerNames() {
    var names = [];
    var seats = [
        { sel:'.seat-bottom .seat-name .text-truncate', dir:'S' },
        { sel:'.seat-top    .seat-name .text-truncate', dir:'N' },
        { sel:'.seat-left   .seat-name .text-truncate', dir:'W' },
        { sel:'.seat-right  .seat-name .text-truncate', dir:'E' }
    ];
    seats.forEach(function (s) {
        var el = document.querySelector(s.sel);
        if (el) names.push((DIRECTION_EN[s.dir] || s.dir) + ': ' + el.textContent.trim());
    });
    speakNow(names.length > 0 ? names.join(', ') : 'Player names not found.');
}

// =========================================================
// 20. STATE RESET
// =========================================================

function forceRefreshState() {
    try {
        pendingInput       = null;
        clearInputTimeout();
        gamePhase          = 'unknown';
        cachedContract     = null;
        activeTurnDirection = null;
        previousPlayedIds   = {};
        currentTrickIds     = {};

        var wasBidding = isBiddingPhase();
        var wasPlay    = isPlayPhase();
        if (wasPlay)    gamePhase = 'play';
        else if (wasBidding) gamePhase = 'bidding';

        var bids       = readAllBids();
        spokenBidCount = bids.length;
        lastBidPollLen = bids.length;

        var c = getContractFromBidHistory();
        if (c && c.strain) cachedContract = c;

        if (gamePhase === 'play') {
            initTrickStateFromDOM();
            previousTrickSnapshot = trickSnapshot(readAllPlayedCards());
            if (currentTrick.length > 0) {
                var last = currentTrick[currentTrick.length - 1];
                activeTurnDirection = getNextDirection(last.direction);
            }
        }
        speakNow('Extension memory reset.');
    } catch (e) {
        speakNow('Error in reset.');
    }
}

// =========================================================
// 21. KEYBOARD LISTENER
// =========================================================
// Two modes (toggle with Z):
//   'cards'    – Query keys work with bare keys; bidding/playing blocked
//   'keyboard' – Bidding/playing work; query keys require Alt

var inputMode = 'cards';

function handleQueryKey(key, block) {
    if (key === 'm') { block(); forceRefreshState(); return true; }

    // Own hand
    if (key === 'g') { block(); readAllCards(getUserHand(), 'My hand');       return true; }
    if (key === 'a') { block(); readSuitCards(getUserHand(), 'Spade');         return true; }
    if (key === 's') { block(); readSuitCards(getUserHand(), 'Heart');         return true; }
    if (key === 'd') { block(); readSuitCards(getUserHand(), 'Diamond');       return true; }
    if (key === 'f') { block(); readSuitCards(getUserHand(), 'Club');          return true; }

    // Dummy hand
    if (key === 't') {
        block();
        var dt = getDummyHand();
        dt.length === 0 ? speakNow('Dummy not visible.') : readAllCards(dt, 'Dummy');
        return true;
    }
    if (key === 'q') { block(); var dq = getDummyHand(); if (!dq.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(dq, 'Spade');   return true; }
    if (key === 'w') { block(); var dw = getDummyHand(); if (!dw.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(dw, 'Heart');   return true; }
    if (key === 'e') { block(); var de = getDummyHand(); if (!de.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(de, 'Diamond'); return true; }
    if (key === 'r') { block(); var dr = getDummyHand(); if (!dr.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(dr, 'Club');    return true; }

    // Trick on table
    if (key === 'p') {
        block();
        var trick = currentTrick.length > 0 ? currentTrick : sortTrickChronologically(readCurrentTrickCards());
        speakNow(trick.length === 0
            ? 'No cards on table.'
            : 'Trick: ' + trick.map(function (c) {
                return (DIRECTION_EN[c.direction] || c.direction) + ' ' + c.suit + ' ' + c.rank;
              }).join(', '));
        return true;
    }

    // Bid history
    if (key === 'b') {
        block();
        var bids = readAllBids();
        speakNow(bids.length === 0
            ? 'No bids.'
            : 'Bids: ' + bids.map(function (b) { return b.directionEn + ' ' + b.translation; }).join(', '));
        return true;
    }

    // Board / contract / direction info
    if (key === 'x') {
        block();
        var parts = [];
        var uDir  = getUserDirection();
        parts.push('My direction: ' + (DIRECTION_EN[uDir] || uDir));
        var vul = readVulnerability();
        parts.push(vulnerabilityTextEn(vul));
        var hcp = readHcp();
        if (hcp) parts.push('South: ' + hcp + ' HCP');
        var contract = readContractDisplay();
        parts.push(contract ? 'Contract: ' + contract : 'No contract yet');
        speakNow(parts.join('. ') + '.');
        return true;
    }

    // Vulnerability
    if (key === 'v') {
        block();
        var vul2 = readVulnerability();
        speakNow(vulnerabilityTextEn(vul2) + '.');
        return true;
    }

    // Trick count
    if (key === 'c') { block(); readTrickCount(); return true; }

    // Player names
    if (key === 'n') { block(); readPlayerNames(); return true; }

    return false;
}

// =========================================================
// F2 – SAAVUTETTAVAT KORTIT (heikkonäköisille)
// =========================================================

var cardButtonMode   = false;
var cardButtonIndex  = 0;
var cardButtonList   = [];

var CARD_BUTTON_STYLE = [
    'position:absolute',
    'z-index:9999',
    'top:0', 'left:0', 'width:100%', 'height:100%',
    'background:#242425',
    'color:#FFE600',
    'font-size:18px',
    'font-weight:900',
    'font-family:Arial,sans-serif',
    'border:4px solid #FFE600',
    'border-radius:10px',
    'cursor:pointer',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'text-align:center',
    'line-height:1.2',
    'padding:4px',
    'box-sizing:border-box',
    'outline:none'
].join(';');

var CARD_BUTTON_FOCUS_BORDER = '4px solid #FFFFFF';

var SUIT_SYMBOL = { 'Spade':'♠', 'Heart':'♥', 'Diamond':'♦', 'Club':'♣' };

function buildCardLabel(card) {
    var sym  = SUIT_SYMBOL[card.suit] || card.suit;
    return sym + '\n' + card.rank;
}

function buildAriaLabel(card, handName) {
    return card.suit + ' ' + card.rank + ', ' + handName;
}

function activateCardButtonMode() {
    cardButtonMode  = true;
    cardButtonList  = [];
    cardButtonIndex = 0;

    var hands = [
        { cls: 'cards-hand-BOTTOM',      name: 'Own hand' },
        { cls: getDummyHandClass(), name: 'Dummy'     }
    ];

    hands.forEach(function (h) {
        var container = document.querySelector('.' + h.cls);
        if (!container) return;
        container.querySelectorAll('.bridge-card').forEach(function (cardEl) {
            if (cardEl.classList.contains('bridge-card-played')) return;

            var useEl = cardEl.querySelector('.bridge-card-svg use');
            var card  = useEl ? parseFunbridgeHref(getHref(useEl)) : null;
            if (!card) return;

            // Ylivuotokerros joka peittää kortin
            var overlay = document.createElement('button');
            overlay.setAttribute('type', 'button');
            overlay.setAttribute('role', 'button');
            overlay.setAttribute('tabindex', '0');
            overlay.setAttribute('aria-label', buildAriaLabel(card, h.name));
            overlay.setAttribute('data-fb-card-btn', '1');
            overlay.style.cssText = CARD_BUTTON_STYLE;
            overlay.textContent   = buildCardLabel(card);

            // Korosta aktiiviset kortit vihreällä reunuksella
            if (cardEl.classList.contains('bridge-card-active')) {
                overlay.style.borderColor = '#FFFFFF';
                overlay.style.color       = '#FFFFFF';
            }

            // Pelaa kortti Enter/Välilyönti/klikkaus – päivitä tila pelaamisen jälkeen
            overlay.addEventListener('click', function () {
                playCard(card.suitLetter, card.rank);
                setTimeout(refreshCardButtons, 400);
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playCard(card.suitLetter, card.rank);
                    setTimeout(refreshCardButtons, 400);
                }
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveCardFocus(1);
                }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveCardFocus(-1);
                }
                if (e.key === 'F2' || e.key === 'Escape') {
                    e.preventDefault();
                    deactivateCardButtonMode();
                }
            });

            // Lisää korttikortin position:relative jos ei jo ole
            var pos = window.getComputedStyle(cardEl).position;
            if (pos === 'static') cardEl.style.position = 'relative';

            cardEl.appendChild(overlay);
            cardButtonList.push(overlay);
        });
    });

    if (cardButtonList.length === 0) {
        cardButtonMode = false;
        speakNow('No cards available.');
        return;
    }

    // Fokus ensimmäiseen
    focusCardButton(0);
    speakNow('Card buttons active. ' + cardButtonList.length + ' cards. Arrow keys to browse, Enter to play, F2 to close.');
}

// Päivitä painikkeet pelin edetessä (pelattu kortti poistettu, uusi vuoro)
function refreshCardButtons() {
    if (!cardButtonMode) return;
    var prevIdx = cardButtonIndex;
    // Poista vanhat painikkeet
    document.querySelectorAll('[data-fb-card-btn]').forEach(function (btn) { btn.remove(); });
    cardButtonList  = [];
    cardButtonIndex = 0;
    // Rakenna uudelleen
    var hands = [
        { cls: 'cards-hand-BOTTOM',      name: 'Own hand' },
        { cls: getDummyHandClass(), name: 'Dummy'     }
    ];
    hands.forEach(function (h) {
        var container = document.querySelector('.' + h.cls);
        if (!container) return;
        container.querySelectorAll('.bridge-card').forEach(function (cardEl) {
            if (cardEl.classList.contains('bridge-card-played')) return;
            var useEl = cardEl.querySelector('.bridge-card-svg use');
            var card  = useEl ? parseFunbridgeHref(getHref(useEl)) : null;
            if (!card) return;

            var overlay = document.createElement('button');
            overlay.setAttribute('type', 'button');
            overlay.setAttribute('role', 'button');
            overlay.setAttribute('tabindex', '0');
            overlay.setAttribute('aria-label', buildAriaLabel(card, h.name));
            overlay.setAttribute('data-fb-card-btn', '1');
            overlay.style.cssText = CARD_BUTTON_STYLE;
            overlay.textContent   = buildCardLabel(card);

            if (cardEl.classList.contains('bridge-card-active')) {
                overlay.style.borderColor = '#FFFFFF';
                overlay.style.color       = '#FFFFFF';
            }

            overlay.addEventListener('click', function () {
                playCard(card.suitLetter, card.rank);
                setTimeout(refreshCardButtons, 400);
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playCard(card.suitLetter, card.rank);
                    setTimeout(refreshCardButtons, 400);
                }
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveCardFocus(1);  }
                if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); moveCardFocus(-1); }
                if (e.key === 'F2' || e.key === 'Escape') { e.preventDefault(); deactivateCardButtonMode(); }
            });

            var pos = window.getComputedStyle(cardEl).position;
            if (pos === 'static') cardEl.style.position = 'relative';
            cardEl.appendChild(overlay);
            cardButtonList.push(overlay);
        });
    });

    if (cardButtonList.length === 0) {
        // Ei kortteja (esim. tikki menossa) – odota ja yritä uudelleen
        setTimeout(refreshCardButtons, 600);
        return;
    }
    // Palauta fokus samaan indeksiin tai viimeiseen
    focusCardButton(Math.min(prevIdx, cardButtonList.length - 1));
}

function deactivateCardButtonMode() {
    cardButtonMode = false;
    document.querySelectorAll('[data-fb-card-btn]').forEach(function (btn) {
        btn.remove();
    });
    cardButtonList  = [];
    cardButtonIndex = 0;
    speakNow('Card buttons off.');
}

function focusCardButton(idx) {
    if (cardButtonList.length === 0) return;
    cardButtonIndex = Math.max(0, Math.min(idx, cardButtonList.length - 1));
    var btn = cardButtonList[cardButtonIndex];
    // Korostusreunus fokuksessa
    cardButtonList.forEach(function (b) {
        b.style.outline = '';
    });
    btn.style.outline = '4px solid #FFFFFF';
    btn.focus();
}

function moveCardFocus(delta) {
    focusCardButton(cardButtonIndex + delta);
}

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var key = e.key.toLowerCase();
    if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (cardButtonMode) deactivateCardButtonMode();
        else                activateCardButtonMode();
    }
}, true);

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var key = e.key.toLowerCase();

    function block() {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    // Escape cancels pending two-key input
    if (key === 'escape' && pendingInput !== null) {
        block(); cancelPendingInput(); return;
    }

    // Second key of two-key sequence
    if (pendingInput !== null) {
        block(); handleSecondKey(key); return;
    }

    // Z – toggle mode
    if (key === 'z' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        block();
        inputMode = (inputMode === 'cards') ? 'keyboard' : 'cards';
        speakNow(inputMode === 'cards' ? 'Cards mode.' : 'Keyboard mode.');
        return;
    }

    // Alt+key – query commands always work in both modes
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        handleQueryKey(key, block);
        return;
    }

    // Arrow Up / Down – play extreme card (keyboard mode, play phase)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !e.altKey && !e.ctrlKey && !e.metaKey &&
        inputMode === 'keyboard' && pendingInput === null) {
        block();
        playExtreme(e.key === 'ArrowDown' ? 'low' : 'high');
        return;
    }

    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        if (inputMode === 'cards') {
            handleQueryKey(key, block);
            return;
        }
        if (inputMode === 'keyboard') {
            handleFirstKey(key, block);
            return;
        }
    }
}, true);

// =========================================================
// 22. MUTATIONOBSERVER
// =========================================================

var boardTimer = null;
var bidTimer   = null;
var trickTimer = null;

var gameObserver = new MutationObserver(function (mutations) {
    var checkTrick = false;
    var checkBids  = false;
    var checkBoard = false;

    mutations.forEach(function (mutation) {
        // -------------------------------------------------------
        // Tarjouslaatikon (table-center-bids) katoaminen DOM:sta
        // → siirrytään pelivaiheeseen VÄLITTÖMÄSTI ilman polling-viivettä.
        // -------------------------------------------------------
        mutation.removedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.classList && node.classList.contains('table-center-bids')) {
                if (gamePhase !== 'play') {
                    gamePhase = 'play';
                    playPhaseConfirmCount = PLAY_PHASE_CONFIRM_NEEDED;
                    var contractForLead = getOrBuildCachedContract();
                    if (contractForLead && contractForLead.declarer) {
                        activeTurnDirection = getNextDirection(contractForLead.declarer);
                    }
                    var contractText = readContractDisplay();
                    speak(contractText ? 'Bidding ended. Contract: ' + contractText + '.'
                                       : 'Bidding ended. Play phase starts.');
                    if (cardButtonMode) setTimeout(refreshCardButtons, 500);
                }
            }
        });

        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;

            // Trick changes: bridge-card appears/disappears outside hands
            if (node.classList && (node.classList.contains('bridge-card') ||
                node.querySelector && node.querySelector('.bridge-card'))) {
                checkTrick = true;
            }

            // Bid changes: new bid appears in auction box
            var id = (node.id || '');
            if (id.indexOf('AUCTION-BOX') !== -1) checkBids = true;
            if (node.classList && (node.classList.contains('auction-box-bid') ||
                node.classList.contains('auction-box'))) checkBids = true;
            if (node.querySelector && node.querySelector('[id*="AUCTION-BOX"]')) checkBids = true;

            // Board changes: vulnerability display
            if (node.classList && node.classList.contains('vulnerability-hcp')) checkBoard = true;
            if (node.closest && node.closest('.vulnerability-hcp')) checkBoard = true;

            // Table-center-bids change (bidding box appears)
            if (node.classList && node.classList.contains('table-center-bids')) {
                checkBids  = true;
                checkTrick = true;
            }
        });

        if (mutation.type === 'characterData') {
            var p = mutation.target.parentElement;
            if (p) {
                if (p.closest('.vulnerability-hcp'))  checkBoard = true;
                if (p.closest('.auction-box'))         checkBids  = true;
            }
        }

        if (mutation.type === 'attributes' || mutation.type === 'childList') {
            var tgt = mutation.target;
            if (tgt.classList && tgt.classList.contains('cards-hand-BOTTOM')) checkTrick = true;
            if (tgt.classList && tgt.classList.contains('table-center'))      checkTrick = true;
            // Key: watch for bridge-card-played class being added/removed
            if (tgt.classList && tgt.classList.contains('bridge-card-played')) checkTrick = true;
            if (tgt.classList && tgt.classList.contains('bridge-card'))        checkTrick = true;
            // Watch cards-hand-active changes (turn changes)
            if (tgt.classList && (
                tgt.classList.contains('cards-hand-TOP') ||
                tgt.classList.contains('cards-hand-BOTTOM') ||
                tgt.classList.contains('cards-hand-LEFT') ||
                tgt.classList.contains('cards-hand-RIGHT')
            )) checkTrick = true;
            // Lepääjän käsi tuli näkyviin → päivitä F2-painikkeet
            if (cardButtonMode && tgt.classList &&
                tgt.classList.contains('cards-hand-TOP') &&
                tgt.classList.contains('cards-hand-dummy')) {
                setTimeout(refreshCardButtons, 500);
            }
        }
    });

    if (checkTrick) { if (trickTimer) clearTimeout(trickTimer); trickTimer = setTimeout(detectTrickChanges, 150); }
    if (checkBids)  { if (bidTimer)   clearTimeout(bidTimer);   bidTimer   = setTimeout(checkNewBids, 350);       }
    if (checkBoard) { if (boardTimer) clearTimeout(boardTimer); boardTimer = setTimeout(announceBoard, 600);       }
});

gameObserver.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'style']
});

// =========================================================
// 23. POLLING (fallback for missed mutations)
// =========================================================

setInterval(function () {
    var bids = readAllBids().length;
    if (bids !== lastBidPollLen) checkNewBids();
    updateGamePhase();
}, 500);

setInterval(function () {
    var snap = trickSnapshot(readAllPlayedCards());
    if (snap !== previousTrickSnapshot) detectTrickChanges();
}, 300);

setInterval(function () {
    var vul = readVulnerability() || '';
    var hcp = readHcp() || '';
    var key = vul + '|' + hcp;
    if (key !== lastAnnouncedBoard && vul) announceBoard();
}, 2500);

// =========================================================
// 24. INITIALIZATION
// =========================================================

setTimeout(function () {
    announceBoard();
    updateGamePhase();
    var bids = readAllBids();
    spokenBidCount = bids.length;
    lastBidPollLen = bids.length;
    var c = getContractFromBidHistory();
    if (c && c.strain) cachedContract = c;
}, 2000);

// =========================================================
// CONSOLE HELP
// =========================================================
console.log([
    '=== Funbridge Accessibility Extension V1.0 ===',
    '',
    'MODES (toggle with Z):',
    '  Z           = Switch between Cards mode and Keyboard mode.',
    '  F2          = Toggle accessible card buttons (high contrast, for low vision)',
    '                Arrow keys browse cards, Enter plays, F2/Escape cancels.',
    '',
    'CARDS MODE (default – browsing):',
    '  G           = My entire hand',
    '  A / S / D / F = My Spades / Hearts / Diamonds / Clubs',
    '  T           = Entire dummy hand',
    '  Q / W / E / R = Dummy Spades / Hearts / Diamonds / Clubs',
    '  P           = Current trick on table',
    '  B           = Bidding history',
    '  X           = Direction, vulnerability, HCP, contract',
    '  V           = Vulnerability',
    '  C           = Trick count',
    '  N           = Player names',
    '  M           = Reset extension state',
    '',
    'KEYBOARD MODE (bidding / playing):',
    'PLAYING A CARD (two keys):',
    '  1. Suit:  s=Spade  h=Heart  d=Diamond  c=Club',
    '  2. Rank:  a k q j t 9 8 7 6 5 4 3 2',
    '  e.g.: s → "Spade?" → a → plays Ace of Spades',
    '',
    'QUICK PLAY:',
    '  Arrow Down = Play lowest card of led suit',
    '  Arrow Up   = Play highest card of led suit',
    '',
    'BIDDING (two keys):',
    '  1. Level: 1 2 3 4 5 6 7',
    '  2. Suit:  c d h s n',
    '  p = Pass   x = Double/Redouble   Escape = Cancel',
    '',
    'Alt+key query commands always work in both modes.'
].join('\n'));
