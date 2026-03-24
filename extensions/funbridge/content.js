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
        var card = parseFunbridgeHref(getHref(use));
        if (card) {
            card.element = use.closest('.bridge-card');
            cards.push(card);
        }
    });
    return sortCards(cards);
}

function getUserHand()  { return getHandCards('cards-hand-BOTTOM'); }
function getDummyHand() { return getHandCards('cards-hand-TOP'); }

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

function resolveAllowedHand() {
    var myDir      = getUserDirection();
    var partnerDir = myDir ? getNextDirection(getNextDirection(myDir)) : null;
    var contract   = getOrBuildCachedContract();

    if (!activeTurnDirection || !myDir) return 'both';

    var iAmDeclarer = contract && contract.declarer === myDir;

    if (activeTurnDirection === myDir)                     return 'mine';
    if (activeTurnDirection === partnerDir && iAmDeclarer) return 'dummy';
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
        var topCont = document.querySelector('.cards-hand-TOP');
        if (topCont) {
            var useD = null;
            topCont.querySelectorAll('use').forEach(function (u) {
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

function readCurrentTrickCards() {
    var result = [];
    document.querySelectorAll('.bridge-card.bridge-card-played').forEach(function (cardEl) {
        var useEl = cardEl.querySelector('.bridge-card-svg use');
        var card  = useEl ? parseFunbridgeHref(getHref(useEl)) : null;
        if (!card) return;
        // Direction from containing hand class
        var dir = null;
        for (var cls in HAND_CLASS_TO_DIR) {
            if (cardEl.closest('.' + cls)) { dir = HAND_CLASS_TO_DIR[cls]; break; }
        }
        if (!dir) return;
        result.push({
            direction: dir, directionEn: DIRECTION_EN[dir] || dir,
            suit: card.suit, rank: card.rank, key: card.key
        });
    });
    return result;
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

var previousTrickSnapshot = '';
var currentTrick          = [];

function detectTrickChanges() {
    var domCards = readCurrentTrickCards();
    var snapshot = trickSnapshot(domCards);
    if (snapshot === previousTrickSnapshot) return;

    if (domCards.length < currentTrick.length || domCards.length === 0) {
        // Trick cleared: evaluate winner
        if (currentTrick.length === 4) {
            var trump = (cachedContract && cachedContract.strain !== 'N') ? cachedContract.strain : null;
            var winner = evaluateWinner(currentTrick, trump);
            if (winner) {
                activeTurnDirection = winner;
                speak((DIRECTION_EN[winner] || winner) + ' wins the trick.');
            }
        }
        currentTrick = [];
    }

    var newCards = domCards.filter(function (dc) {
        return !currentTrick.some(function (cc) { return cc.key === dc.key && cc.direction === dc.direction; });
    });

    if (newCards.length > 1 && domCards.length < 4) {
        var sorted = sortTrickChronologically(domCards);
        newCards = sorted.filter(function (dc) {
            return !currentTrick.some(function (cc) { return cc.key === dc.key && cc.direction === dc.direction; });
        });
    }

    newCards.forEach(function (c) {
        currentTrick.push(c);
        speak((DIRECTION_EN[c.direction] || c.direction) + ': ' + c.suit + ' ' + c.rank);
        activeTurnDirection = getNextDirection(c.direction);
    });

    if (currentTrick.length === 4) {
        var ct    = getOrBuildCachedContract();
        var trump2 = (ct && ct.strain !== 'N') ? ct.strain : null;
        var w2 = evaluateWinner(currentTrick, trump2);
        if (w2) activeTurnDirection = w2;
    }

    currentTrick = currentTrick.filter(function (cc) {
        return domCards.some(function (dc) { return dc.key === cc.key && dc.direction === cc.direction; });
    });

    previousTrickSnapshot = snapshot;
}

// =========================================================
// 14. TRICK COUNT
// =========================================================

function readTrickCount() {
    // Look for trick score display in Funbridge sidebar or table area
    var scoreEls = document.querySelectorAll('.trick-count, [class*="trickCount"], [class*="trick-score"]');
    if (scoreEls.length >= 2) {
        speakNow('We: ' + scoreEls[0].textContent.trim() +
                 ', they: ' + scoreEls[1].textContent.trim() + ' tricks.');
        return;
    }
    // Fallback: count cards remaining in each hand
    var bottomCount = getUserHand().length;
    var totalPlayed = 13 - bottomCount;
    speakNow(totalPlayed + ' tricks played. ' + bottomCount + ' cards remaining in your hand.');
}

// =========================================================
// 15. PHASE DETECTION
// =========================================================

function isBiddingPhase() {
    // Bidding phase: bid buttons exist AND are not hidden.
    // During play phase Funbridge hides or removes .table-center-bids.
    var bidsContainer = document.querySelector('.table-center-bids');
    if (!bidsContainer) return false;
    // Check container is actually visible (not display:none)
    var style = window.getComputedStyle(bidsContainer);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    // Confirm at least one interactive bid button is present
    var btn = bidsContainer.querySelector('.bid.bid-hover');
    return !!btn;
}

function isPlayPhase() {
    // Play phase: .cards-hand-TOP gets class cards-hand-dummy when dummy is on table
    var topHand = document.querySelector('.cards-hand-TOP');
    if (topHand && topHand.classList.contains('cards-hand-dummy')) return true;
    // Secondary: BOTTOM has cards-hand-fan and no bidding box visible
    var bottomHand = document.querySelector('.cards-hand-BOTTOM');
    if (bottomHand && bottomHand.classList.contains('cards-hand-fan') && !isBiddingPhase()) return true;
    return false;
}

function updateGamePhase() {
    var isBidding = isBiddingPhase();
    var isPlay    = isPlayPhase();

    if (isBidding && gamePhase !== 'bidding') {
        gamePhase = 'bidding';
    } else if (isPlay && gamePhase !== 'play') {
        var wasUnknown = (gamePhase === 'unknown');
        gamePhase = 'play';
        var contractForLead = getOrBuildCachedContract();
        if (contractForLead && contractForLead.declarer) {
            activeTurnDirection = getNextDirection(contractForLead.declarer);
        }
        // Only announce transition if we were previously in bidding phase
        if (!wasUnknown) {
            var contractText = readContractDisplay();
            speak(contractText ? 'Bidding ended. Contract: ' + contractText + '.'
                               : 'Bidding ended. Play phase starts.');
        }
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
    if (/^PA/i.test(code))  return { raw:'Pass',  en:'Pass'      };
    if (/^X2/i.test(code))  return { raw:'XX',    en:'Redouble'  };
    if (/^X1/i.test(code))  return { raw:'X',     en:'Double'    };
    var m = code.match(/^([1-7])([NSHDC])$/i);
    if (m) {
        var strain = m[2].toUpperCase();
        return { raw: code.toUpperCase(), en: m[1] + ' ' + (BID_STRAIN_EN[strain] || strain) };
    }
    return null;
}

function readAllBids() {
    var box = document.querySelector('.auction-box');
    if (!box) return [];

    // Column directions from header
    var dirs = [];
    box.querySelectorAll('.px-2.row.g-0:first-child .auction-box-title span').forEach(function (s) {
        dirs.push(s.textContent.trim().toUpperCase());
    });
    if (dirs.length === 0) {
        // Fallback: look for any auction-box-title
        box.querySelectorAll('.auction-box-title span').forEach(function (s) {
            dirs.push(s.textContent.trim().toUpperCase());
        });
    }
    if (dirs.length === 0) return [];

    var bids = [];
    box.querySelectorAll('.overflow-auto .row').forEach(function (row) {
        var cols = row.querySelectorAll('.col.d-grid');
        cols.forEach(function (col, idx) {
            if (idx >= dirs.length) return;
            var bidEl = col.querySelector('[id*="AUCTION-BOX"]');
            if (!bidEl) return;
            var id = bidEl.id || '';
            var m  = id.match(/^BID-(.+?)-\d+-AUCTION-BOX/);
            if (!m) return;
            var parsed = parseFunbridgeBidCode(m[1]);
            if (!parsed) return;
            bids.push({
                direction:   dirs[idx],
                directionEn: DIRECTION_EN[dirs[idx]] || dirs[idx],
                raw:         parsed.raw,
                translation: parsed.en
            });
        });
    });
    return bids;
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
    updateGamePhase();
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
    previousTrickSnapshot = '';
    cachedContract        = null;
    activeTurnDirection   = null;

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

        var wasBidding = isBiddingPhase();
        var wasPlay    = isPlayPhase();
        if (wasPlay)    gamePhase = 'play';
        else if (wasBidding) gamePhase = 'bidding';

        var bids       = readAllBids();
        spokenBidCount = bids.length;
        lastBidPollLen = bids.length;

        var c = getContractFromBidHistory();
        if (c && c.strain) cachedContract = c;

        var domCards = readCurrentTrickCards();
        currentTrick          = sortTrickChronologically(domCards);
        previousTrickSnapshot = trickSnapshot(domCards);

        if (gamePhase === 'play' && currentTrick.length > 0) {
            if (currentTrick.length === 4) {
                var rc    = getOrBuildCachedContract();
                var rT    = (rc && rc.strain !== 'N') ? rc.strain : null;
                activeTurnDirection = evaluateWinner(currentTrick, rT);
            } else {
                var last  = currentTrick[currentTrick.length - 1];
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

            // Table-center-bids change (bidding box appears/disappears)
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
    var snap = trickSnapshot(readCurrentTrickCards());
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
