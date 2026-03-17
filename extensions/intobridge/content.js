// =========================================================
// IntoBridge Accessibility Extension (NVDA Screen Reader Support)
// Version 1.16 (Added Turn Tracking)
// =========================================================

console.log("IntoBridge Accessibility Extension V1.16 Loaded");

// ---------------------------------------------------------
// PERSISTENT CSS STYLE TO HIDE TOP AD BANNER
// ---------------------------------------------------------
var hideAdStyle = document.createElement('style');
hideAdStyle.textContent = '#desktop-ad-banner { display: none !important; visibility: hidden !important; }';
document.head.appendChild(hideAdStyle);

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

var speechQueue  = [];
var isSpeaking   = false;
var SPEECH_DELAY = 650;

function speak(text) {
    if (!text) return;
    speechQueue.push(text);
    if (!isSpeaking) processSpeechQueue();
}

function speakNow(text) {
    speechQueue     = [];
    isSpeaking      = false;
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = text; }, 50);
}

function processSpeechQueue() {
    if (speechQueue.length === 0) { isSpeaking = false; return; }
    isSpeaking = true;
    var text   = speechQueue.shift();
    liveRegion.textContent = '';
    setTimeout(function () {
        liveRegion.textContent = text;
        setTimeout(processSpeechQueue, SPEECH_DELAY);
    }, 50);
}

// =========================================================
// 2. DEBUG LOG
// =========================================================

var debugLog = [];

function dlog(msg) {
    var ts = new Date().toISOString().substring(11, 23);
    debugLog.push(ts + '  ' + msg);
    if (debugLog.length > 600) debugLog.shift();
}

function downloadDebugLog() {
    var blob = new Blob([debugLog.join('\n')], { type: 'text/plain' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'intobridge_debug_' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =========================================================
// 3. CONSTANTS
// =========================================================

var SUIT_LETTER_TO_EN = { 'S': 'Spade', 'H': 'Heart', 'D': 'Diamond', 'C': 'Club' };
var H3_CLASS_TO_SUIT  = { 's': 'S', 'h': 'H', 'd': 'D', 'c': 'C' };

var SUIT_EN_TO_PLURAL  = { 'Spade': 'Spades', 'Heart': 'Hearts', 'Diamond': 'Diamonds', 'Club': 'Clubs' };
var SUIT_ORDER_EN      = ['Spade', 'Heart', 'Diamond', 'Club'];
var SUIT_LETTER_ORDER  = ['S', 'H', 'D', 'C'];

var CARD_RANK = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    '10':10,'T':10,'J':11,'Q':12,'K':13,'A':14
};

var KEY_TO_CARD_VALUE = {
    'a':'A','k':'K','q':'Q','j':'J','t':'T',
    '9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2'
};

var KEY_TO_SUIT = { 's':'S', 'h':'H', 'd':'D', 'c':'C' };
var KEY_TO_BID_STRAIN = { 'c':'C', 'd':'D', 'h':'H', 's':'S', 'n':'N' };
var BID_STRAIN_EN = { 'C':'Club','D':'Diamond','H':'Heart','S':'Spade','N':'NT','NT':'NT' };

var VULNERABILITY_PATTERN = [
    'None','NS','EW','All','NS','EW','All','None',
    'EW','All','None','NS','All','None','NS','EW'
];

var DIRECTION_EN   = { 'N':'North','E':'East','S':'South','W':'West' };

var BID_CALL_EN = {
    'Pass':'Pass','Passi':'Pass',
    'X':'Double','Dbl':'Double',
    'XX':'Redouble','Rdbl':'Redouble'
};

var gamePhase = 'unknown';
var cachedContract = null;
var activeTurnDirection = null; // Tracks whose turn it is

// =========================================================
// 4. CARD DETECTION
// =========================================================

function isCardTestId(id) {
    if (!id || id.length < 2) return false;
    if (!SUIT_LETTER_TO_EN[id.charAt(0).toUpperCase()]) return false;
    return /^(10|[2-9TJQKA])$/.test(id.substring(1).toUpperCase());
}

function parseCardTestId(id) {
    if (!isCardTestId(id)) return null;
    var sl  = id.charAt(0).toUpperCase();
    var val = id.substring(1).toUpperCase();
    return { suitLetter: sl, suit: SUIT_LETTER_TO_EN[sl], value: val, key: sl + val };
}

function suitFromH3(h3el) {
    if (!h3el) return null;
    for (var i = 0; i < h3el.classList.length; i++) {
        var sl = H3_CLASS_TO_SUIT[h3el.classList[i].toLowerCase()];
        if (sl) return SUIT_LETTER_TO_EN[sl];
    }
    return null;
}

function getCardsInElement(element) {
    if (!element) return [];
    var cards = [];
    element.querySelectorAll('[data-testid]').forEach(function (el) {
        var parsed = parseCardTestId(el.getAttribute('data-testid'));
        if (parsed) { parsed.element = el; cards.push(parsed); }
    });
    return cards;
}

function sortCards(cards) {
    return cards.slice().sort(function (a, b) {
        var si = SUIT_LETTER_ORDER.indexOf(a.suitLetter);
        var sj = SUIT_LETTER_ORDER.indexOf(b.suitLetter);
        if (si !== sj) return si - sj;
        return (CARD_RANK[b.value] || 0) - (CARD_RANK[a.value] || 0);
    });
}

// =========================================================
// 5. HAND AND DIRECTION DETECTION
// =========================================================

function getUserHand() {
    var el = document.querySelector('#bottom-seat, [data-testid="bottom-seat"]');
    if (!el) { dlog('getUserHand: #bottom-seat not found'); return []; }
    return sortCards(getCardsInElement(el));
}

function getDummyHand() {
    var vertEl = document.querySelector(
        '#opponents-row [data-testid="vertical-hand"], [data-testid="vertical-hand"]'
    );
    if (vertEl) {
        var vc = sortCards(getCardsInElement(vertEl));
        if (vc.length > 0) { dlog('getDummyHand: vertical-hand ' + vc.length + ' pcs'); return vc; }
    }
    var topEl = document.querySelector('#partner-seat, [data-testid="top-seat"]');
    if (topEl) {
        var tc = sortCards(getCardsInElement(topEl));
        if (tc.length > 0) { dlog('getDummyHand: top-seat ' + tc.length + ' pcs'); return tc; }
    }
    dlog('getDummyHand: no cards');
    return [];
}

function getUserDirection() {
    var seat = document.querySelector(
        '#bottom-seat [data-testid^="occupied-seat-"],' +
        '[data-testid="bottom-seat"] [data-testid^="occupied-seat-"]'
    );
    if (seat) return seat.getAttribute('data-testid').replace('occupied-seat-', '');

    var bottom = document.querySelector('#bottom-seat, [data-testid="bottom-seat"]');
    if (bottom) {
        var texts = bottom.querySelectorAll('.chakra-text');
        for (var i = 0; i < texts.length; i++) {
            var t = (texts[i].textContent || '').trim();
            if (t === 'N' || t === 'E' || t === 'S' || t === 'W') return t;
        }
    }
    return null;
}

function getNextDirection(dir) {
    var dirs = ['N', 'E', 'S', 'W'];
    var idx = dirs.indexOf(dir);
    return idx === -1 ? null : dirs[(idx + 1) % 4];
}

function getTrickPositionMap() {
    var userDir = getUserDirection() || 'S';
    var dirs = ['N', 'E', 'S', 'W'];
    var idx = dirs.indexOf(userDir);
    if (idx === -1) idx = 2;
    
    return {
        'bottom': dirs[idx],               
        'left':   dirs[(idx + 1) % 4],     
        'top':    dirs[(idx + 2) % 4],     
        'right':  dirs[(idx + 3) % 4]      
    };
}

// =========================================================
// 6. TURN LOGIC AND WINNER EVALUATION
// =========================================================

function evaluateWinner(cards, trumpSuit) {
    if (!cards || cards.length === 0) return null;
    var winner = cards[0];
    for (var i = 1; i < cards.length; i++) {
        var c = cards[i];
        var isTrump = trumpSuit && c.suit === trumpSuit;
        var winnerIsTrump = trumpSuit && winner.suit === trumpSuit;

        if (isTrump && !winnerIsTrump) {
            winner = c;
        } else if (c.suit === winner.suit && (!trumpSuit || isTrump === winnerIsTrump)) {
            if ((CARD_RANK[c.value] || 0) > (CARD_RANK[winner.value] || 0)) {
                winner = c;
            }
        }
    }
    return winner.direction;
}

// =========================================================
// 7. PHASE DETECTION
// =========================================================

function isPlayPhase() {
    var contractStack = document.querySelector('.board-contract [class*="1sqprej"], .board-contract .css-1sqprej');
    if (contractStack && contractStack.textContent.trim().length > 0) return true;
    if (document.querySelector('#current-trick [data-testid]')) return true;
    if (document.querySelector('#opponents-row [data-testid="vertical-hand"] [data-testid]')) return true;

    var passes = 0;
    var btns = document.querySelectorAll('#bids-history tbody button');
    for (var i = btns.length - 1; i >= 0; i--) {
        var t = (btns[i].textContent || '').trim().toUpperCase();
        if (t === 'PASS' || t === 'PASSI') passes++;
        else break;
    }
    if (passes >= 4) return true; 
    if (passes >= 3 && btns.length > passes) return true; 

    return false;
}

function isBiddingPhase() {
    if (isPlayPhase()) return false;
    var history = document.querySelector('#bids-history, [data-testid="bids-history"]');
    var tray = document.querySelector('#bidding-tray, [data-testid="bidding-tray"]');
    var box = document.querySelector('#bidding-box');
    return !!(history || tray || box);
}

function updateGamePhase() {
    var isBidding = isBiddingPhase();
    var isPlay    = isPlayPhase();

    if (isBidding && gamePhase !== 'bidding') {
        gamePhase = 'bidding';
        dlog('Phase change → bidding');
    } else if (isPlay && gamePhase !== 'play') {
        gamePhase = 'play';
        dlog('Phase change → play');
        
        var contractText = readContractDisplay();
        
        // Initialize turn for opening lead
        if (cachedContract && cachedContract.declarer) {
            activeTurnDirection = getNextDirection(cachedContract.declarer);
            dlog('Play started. Opening lead turn: ' + activeTurnDirection);
        } else {
            activeTurnDirection = null;
        }

        if (contractText) {
            speak('Bidding phase ended. Contract: ' + contractText + '.');
        } else {
            speak('Bidding phase ended. Play phase starts.');
        }
    }
}

// =========================================================
// 8. CLICK SIMULATION (React / Chakra UI)
// =========================================================

function simulateClick(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;
    var down    = { bubbles:true, cancelable:true, view:window,
                    clientX:cx, clientY:cy, screenX:cx, screenY:cy, button:0, buttons:1 };
    var up      = Object.assign({}, down, { buttons:0 });
    var noBtn   = Object.assign({}, down, { button:0, buttons:0 });

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
// 9. PLAYING A CARD (From own hand or dummy)
// =========================================================

function playCard(suitLetter, value) {
    var testId = suitLetter + value;
    var suitEn = SUIT_LETTER_TO_EN[suitLetter] || suitLetter;

    var myDir = getUserDirection();
    var partnerDir = myDir ? getNextDirection(getNextDirection(myDir)) : null;

    var allowedHand = 'both'; // Fallback if extension lost track of turn
    
    // Check whose turn it is
    if (activeTurnDirection && myDir) {
        var iAmDeclarer = cachedContract && cachedContract.declarer === myDir;

        if (activeTurnDirection === myDir) {
            allowedHand = 'mine';
        } else if (activeTurnDirection === partnerDir && iAmDeclarer) {
            // It is dummy's turn, and I am the declarer playing the dummy
            allowedHand = 'dummy';
        } else {
            allowedHand = 'none';
        }
    }

    if (allowedHand === 'none') {
        speakNow('Not your turn.');
        dlog('playCard: blocked, active turn is ' + activeTurnDirection);
        return;
    }

    var clicked = false;
    var targetLabel = '';

    // 1. Try my hand
    if (allowedHand === 'mine' || allowedHand === 'both') {
        var seat = document.querySelector('#bottom-seat, [data-testid="bottom-seat"]');
        if (seat) {
            var cardEl = seat.querySelector('[data-testid="' + testId + '"]');
            if (cardEl) {
                simulateClick(cardEl);
                targetLabel = 'hand';
                clicked = true;
            }
        }
    }

    // 2. Try dummy hand
    if (!clicked && (allowedHand === 'dummy' || allowedHand === 'both')) {
        var dummyVert = document.querySelector('#opponents-row [data-testid="vertical-hand"], [data-testid="vertical-hand"]');
        var dummyTop  = document.querySelector('#partner-seat, [data-testid="top-seat"]');
        
        var dummyCardEl = null;
        if (dummyVert) dummyCardEl = dummyVert.querySelector('[data-testid="' + testId + '"]');
        if (!dummyCardEl && dummyTop) dummyCardEl = dummyTop.querySelector('[data-testid="' + testId + '"]');

        if (dummyCardEl) {
            simulateClick(dummyCardEl);
            targetLabel = 'dummy';
            clicked = true;
        }
    }

    // Feedback
    if (clicked) {
        speakNow(suitEn + ' ' + value + ' played from ' + targetLabel + '.');
        dlog('playCard: ' + testId + ' clicked from ' + targetLabel);
    } else {
        if (allowedHand === 'mine') {
            speakNow('No ' + suitEn + ' ' + value + ' in your hand.');
        } else if (allowedHand === 'dummy') {
            speakNow('No ' + suitEn + ' ' + value + ' in dummy.');
        } else {
            speakNow('No ' + suitEn + ' ' + value + ' in hand or dummy.');
        }
        dlog('playCard: card ' + testId + ' not found in allowed hand (' + allowedHand + ')');
    }
}

// =========================================================
// 10. BIDDING
// =========================================================

function submitBid(level, strain) {
    var levelBtn  = document.querySelector('[data-testid="bid-level-' + level + '"]');
    var strainBtn = document.querySelector('[data-testid="bid-trump-' + strain + '"]');
    var strainEn  = BID_STRAIN_EN[strain] || strain;

    if (!levelBtn)  { speakNow('Level button ' + level + ' not found. Not your turn?');  dlog('submitBid: level-btn missing');  return; }
    if (!strainBtn) { speakNow('Suit button ' + strain + ' not found. Not your turn?'); dlog('submitBid: strain-btn missing'); return; }

    simulateClick(levelBtn);
    setTimeout(function () {
        simulateClick(strainBtn);
        speakNow('Bid: ' + level + ' ' + strainEn + '.');
        dlog('submitBid: ' + level + ' ' + strain);
    }, 120);
}

function submitPass() {
    var btn = document.querySelector('[data-testid="bid-pass"]');
    if (!btn) { speakNow('Pass button not found. Not your turn?'); return; }
    simulateClick(btn);
    speakNow('Pass.');
    dlog('submitPass');
}

function submitDouble() {
    var btn = document.querySelector('[data-testid="bid-double"]');
    if (!btn) { speakNow('Double button not found. Not your turn?'); return; }
    var label = (btn.textContent || '').trim().toUpperCase();
    simulateClick(btn);
    speakNow(label === 'XX' ? 'Redouble.' : 'Double.');
    dlog('submitDouble: ' + label);
}

// =========================================================
// 11. DOUBLE PRESS STATE MACHINE
// =========================================================

var pendingInput       = null;
var inputTimeoutHandle = null;
var INPUT_TIMEOUT_MS   = 5000;

function setInputTimeout() {
    clearInputTimeout();
    inputTimeoutHandle = setTimeout(function () {
        if (pendingInput !== null) {
            pendingInput = null;
            speakNow('Timeout, input cancelled.');
            dlog('inputTimeout');
        }
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
        pendingInput = { type: 'card', suit: KEY_TO_SUIT[key] };
        setInputTimeout();
        speakNow(SUIT_LETTER_TO_EN[pendingInput.suit] + '?');
        return true;
    }
    if (key >= '1' && key <= '7' && isBiddingPhase()) {
        blockFn();
        pendingInput = { type: 'bid', level: key };
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
// 12. CURRENT TRICK AND CHRONOLOGICAL SORTING
// =========================================================

function readCurrentTrickCards() {
    var trickEl = document.querySelector('#current-trick');
    if (!trickEl) return [];
    var result = [];
    var posMap = getTrickPositionMap();
    
    Object.keys(posMap).forEach(function (pos) {
        var posEl  = trickEl.querySelector('[class*="CurrentTrick_' + pos + '__"]');
        if (!posEl) return;
        var cardEl = posEl.querySelector('[data-testid]');
        if (!cardEl) return;
        var parsed = parseCardTestId(cardEl.getAttribute('data-testid'));
        if (!parsed) return;
        var suitOverride = suitFromH3(cardEl.querySelector('h3'));
        if (suitOverride) parsed.suit = suitOverride;
        
        var dir = posMap[pos];
        result.push({
            pos: pos, direction: dir, directionEn: DIRECTION_EN[dir] || dir,
            suit: parsed.suit, value: parsed.value, key: parsed.key
        });
    });
    return result;
}

function trickSnapshot(cards) {
    return cards.map(function (c) { return c.pos + ':' + c.key; }).sort().join('|');
}

function sortTrickChronologically(cards) {
    if (cards.length <= 1) return cards.slice();
    
    var dirToIdx = { 'N':0, 'E':1, 'S':2, 'W':3 };
    var idxToDir = ['N', 'E', 'S', 'W'];
    var present = {};
    cards.forEach(function(c) { present[c.direction] = c; });
    
    var leaderDir = null;
    for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var myIdx = dirToIdx[c.direction];
        var ccwIdx = (myIdx + 3) % 4; 
        var ccwDir = idxToDir[ccwIdx];
        
        if (!present[ccwDir]) {
            leaderDir = c.direction;
            break;
        }
    }
    
    if (!leaderDir) return cards.slice(); 
    
    var sorted = [];
    var startIdx = dirToIdx[leaderDir];
    for (var i = 0; i < 4; i++) {
        var checkDir = idxToDir[(startIdx + i) % 4];
        if (present[checkDir]) {
            sorted.push(present[checkDir]);
        }
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
        dlog('Trick ended'); 
        
        // Evaluate winner before clearing the trick
        if (currentTrick.length === 4) {
            var trump = (cachedContract && cachedContract.strain !== 'N') ? cachedContract.strain : null;
            activeTurnDirection = evaluateWinner(currentTrick, trump);
            dlog('Trick winner & next turn: ' + activeTurnDirection);
        }
        
        currentTrick = [];
    }

    var newCards = domCards.filter(function (dc) {
        return !currentTrick.some(function (cc) { return cc.key === dc.key && cc.direction === dc.direction; });
    });

    if (newCards.length > 1 && domCards.length < 4) {
        var sortedDom = sortTrickChronologically(domCards);
        newCards = sortedDom.filter(function (dc) {
            return !currentTrick.some(function (cc) { return cc.key === dc.key && cc.direction === dc.direction; });
        });
    }

    newCards.forEach(function (c) {
        currentTrick.push(c);
        var msg = c.directionEn + ': ' + c.suit + ' ' + c.value;
        speak(msg);
        dlog('Played: ' + msg);

        // Update turn after each card
        activeTurnDirection = getNextDirection(c.direction);
        dlog('Next turn: ' + activeTurnDirection);
    });

    currentTrick = currentTrick.filter(function (cc) {
        return domCards.some(function (dc) { return dc.key === cc.key && cc.direction === cc.direction; });
    });

    previousTrickSnapshot = snapshot;
}

// =========================================================
// 13. TRICK COUNT
// =========================================================

function readTrickCount() {
    var contractEl = document.querySelector('.board-contract');
    if (!contractEl) {
        speakNow('Trick count not available.');
        dlog('readTrickCount: .board-contract not found');
        return;
    }

    var pEls = contractEl.querySelectorAll('button p.css-722v25');
    dlog('readTrickCount: p.css-722v25 found ' + pEls.length + ' pcs');

    if (pEls.length >= 2) {
        var me   = (pEls[0].textContent || '').trim();
        var they = (pEls[1].textContent || '').trim();
        speakNow('We: ' + me + ', they: ' + they + ' tricks.');
        return;
    }

    var pEls2 = contractEl.querySelectorAll('p.css-722v25');
    dlog('readTrickCount: fallback p.css-722v25 found ' + pEls2.length + ' pcs');
    if (pEls2.length >= 2) {
        speakNow('We: ' + (pEls2[0].textContent || '').trim() +
                 ', they: ' + (pEls2[1].textContent || '').trim() + ' tricks.');
        return;
    }

    speakNow('Trick count not available.');
}

// =========================================================
// 14. BOARD INFO AND VULNERABILITY
// =========================================================

function readBoardNumber() {
    var wrapper = document.querySelector('#vulnerability-wrapper');
    if (!wrapper) return 0;
    var els = wrapper.querySelectorAll('div, span, p');
    for (var i = 0; i < els.length; i++) {
        var t = (els[i].textContent || '').trim();
        if (/^\d{1,2}$/.test(t)) {
            var n = parseInt(t, 10);
            if (n >= 1 && n <= 36) return n;
        }
    }
    return 0;
}

function getVulnerability(bn) {
    if (bn < 1) return { ns: false, ew: false };
    var p = VULNERABILITY_PATTERN[(bn - 1) % 16];
    return { ns: (p === 'NS' || p === 'All'), ew: (p === 'EW' || p === 'All') };
}

function vulnerabilityTextEn(bn) {
    var v = getVulnerability(bn);
    if (v.ns && v.ew)   return 'All vulnerable';
    if (!v.ns && !v.ew) return 'None vulnerable';
    if (v.ns)           return 'North-South vulnerable';
    return 'East-West vulnerable';
}

// =========================================================
// 15. CONTRACT
// =========================================================

function getBasicDir(dirStr) {
    var d = (dirStr || '').toUpperCase().charAt(0);
    if (d === 'N' || d === 'S' || d === 'E' || d === 'W') return d;
    return d;
}

function isSameTeam(dir1, dir2) {
    var d1 = getBasicDir(dir1);
    var d2 = getBasicDir(dir2);
    if ((d1 === 'N' || d1 === 'S') && (d2 === 'N' || d2 === 'S')) return true;
    if ((d1 === 'E' || d1 === 'W') && (d2 === 'E' || d2 === 'W')) return true;
    return false;
}

function getContractFromBidHistory() {
    var hist = document.querySelector('#bids-history, [data-testid="bids-history"]');
    if (!hist) return null;

    var directions = [];
    hist.querySelectorAll('thead th').forEach(function (th) {
        directions.push((th.textContent || '').trim());
    });
    if (directions.length === 0) return null;

    var bids = [];
    hist.querySelectorAll('tbody tr').forEach(function (row) {
        row.querySelectorAll('td').forEach(function (td, idx) {
            if (idx >= directions.length) return;
            var tdText = (td.textContent || '').replace(/\s+/g,'').trim();
            if (!tdText || tdText === '?') return;
            var btn    = td.querySelector('button');
            var parsed = btn ? parseBidButton(btn) : null;
            if (!parsed) return;
            bids.push({ raw: parsed.raw, dir: directions[idx] });
        });
    });

    var finalBid = null;
    var finalBidIndex = -1;

    for (var i = bids.length - 1; i >= 0; i--) {
        var raw = (bids[i].raw || '').toUpperCase().replace(/\s+/g,'');
        if (raw === 'PASS' || raw === 'PASSI' || raw === 'X' || raw === 'XX') continue;
        var m = raw.match(/^([1-7])([CDHSN]{1,2})$/);
        if (m) {
            finalBid = { level: m[1], strain: m[2] === 'NT' ? 'N' : m[2], lastDir: bids[i].dir };
            finalBidIndex = i;
            break;
        }
    }

    if (!finalBid) return null;

    var declarer = finalBid.lastDir; 
    
    for (var j = 0; j <= finalBidIndex; j++) {
        var b = bids[j];
        if (isSameTeam(b.dir, finalBid.lastDir)) {
            var bRaw = (b.raw || '').toUpperCase().replace(/\s+/g,'');
            var bMatch = bRaw.match(/^([1-7])([CDHSN]{1,2})$/);
            if (bMatch) {
                var bStrain = bMatch[2] === 'NT' ? 'N' : bMatch[2];
                if (bStrain === finalBid.strain) {
                    declarer = b.dir; 
                    break;
                }
            }
        }
    }

    return { level: finalBid.level, strain: finalBid.strain, declarer: declarer };
}

function readContractDisplay() {
    var stack = document.querySelector('.board-contract .css-1sqprej, .board-contract [class*="1sqprej"]');
    var level = '';
    if (stack) {
        var pEls = stack.querySelectorAll('p.css-1qwnwpn');
        if (pEls.length > 0) level = (pEls[0].textContent || '').trim();
    }

    var source = null;
    var live = getContractFromBidHistory();
    if (live && live.strain) {
        source = live;
        cachedContract = live;
        dlog('readContractDisplay: live search success ' + live.level + live.strain);
    }

    if (!source && cachedContract && cachedContract.strain) {
        source = cachedContract;
        dlog('readContractDisplay: using cache ' + cachedContract.level + cachedContract.strain);
    }

    if (!level && !source) { dlog('readContractDisplay: no level or contract'); return null; }

    var strainEn   = source ? (BID_STRAIN_EN[source.strain] || source.strain) : '';
    var declarerEn = source && source.declarer ? (DIRECTION_EN[source.declarer] || source.declarer) : '';

    if (!level && source) level = source.level;

    var contract = level + (strainEn ? ' ' + strainEn : '');
    if (declarerEn) contract = declarerEn + ' ' + contract;
    dlog('readContractDisplay: ' + contract);
    return contract || null;
}

// =========================================================
// 16. BIDDING HISTORY
// =========================================================

var bidSvgToSuit = {};
var bidPathToSuit = {};

function learnBidSvgClasses() {
    ['C','D','H','S'].forEach(function (suit) {
        var btn = document.querySelector('[data-testid="bid-trump-' + suit + '"]');
        if (!btn) return;
        var svg = btn.querySelector('svg');
        if (!svg) return;
        svg.classList.forEach(function (cls) {
            if (cls.startsWith('css-') && !bidSvgToSuit[cls]) {
                bidSvgToSuit[cls] = suit;
                dlog('learnBidSvg (class): ' + cls + ' → ' + suit);
            }
        });
        var path = svg.querySelector('path');
        if (path) {
            var d = path.getAttribute('d');
            if (d && d.length > 10 && !bidPathToSuit[d]) {
                bidPathToSuit[d] = suit;
                dlog('learnBidSvg (path): ' + suit + ' path learned (' + d.length + ' characters)');
            }
        }
    });
}

function parseBidButton(btn) {
    if (!btn) return null;

    var clone = btn.cloneNode(true);
    clone.querySelectorAll('p.css-1d41y4h').forEach(function (p) { p.remove(); });

    var btnText = (clone.textContent || '').replace(/\s+/g, '').trim();
    if (!btnText || btnText === '?' || btnText === '') return null;

    if (/^(Pass|Passi|X|XX)$/i.test(btnText)) {
        var raw = btnText;
        return { raw: raw, translationEn: BID_CALL_EN[raw] || BID_CALL_EN[raw.toUpperCase()] || raw };
    }

    var level = '';
    var strain = '';

    for (var i = 0; i < clone.childNodes.length; i++) {
        var node = clone.childNodes[i];
        if (node.nodeType === 3) {
            var t = node.textContent.trim();
            if (/^[1-7]$/.test(t)) { level = t; break; }
        }
    }
    if (!level) {
        var m = btnText.match(/^([1-7])/);
        if (m) level = m[1];
    }
    if (!level) return null;

    var span = clone.querySelector('span');
    if (span && (span.textContent || '').trim().toUpperCase() === 'NT') {
        strain = 'N';
    } else {
        learnBidSvgClasses();
        var svg = clone.querySelector('svg');
        if (svg) {
            var path = svg.querySelector('path');
            if (path) {
                var d = path.getAttribute('d');
                if (d && bidPathToSuit[d]) {
                    strain = bidPathToSuit[d];
                    dlog('parseBidButton: suit from path-d → ' + strain);
                }
            }
            if (!strain) {
                svg.classList.forEach(function (cls) {
                    if (bidSvgToSuit[cls]) strain = bidSvgToSuit[cls];
                });
                if (strain) dlog('parseBidButton: suit from CSS class → ' + strain);
            }
        }
    }

    var raw = level + (strain || '');
    var strainEn = BID_STRAIN_EN[strain] || strain;
    var translationEn = level + (strainEn ? ' ' + strainEn : '');
    return { raw: raw, translationEn: translationEn };
}

function readAllBids() {
    var hist = document.querySelector('#bids-history, [data-testid="bids-history"]');
    if (!hist) return [];
    var directions = [];
    hist.querySelectorAll('thead th').forEach(function (th) {
        directions.push((th.textContent || '').trim());
    });
    if (directions.length === 0) return [];

    var bids = [];
    hist.querySelectorAll('tbody tr').forEach(function (row) {
        row.querySelectorAll('td').forEach(function (td, idx) {
            if (idx >= directions.length) return;
            var tdText = (td.textContent || '').replace(/\s+/g,'').trim();
            if (!tdText || tdText === '?') return;

            var btn    = td.querySelector('button');
            var parsed = btn ? parseBidButton(btn) : null;
            if (!parsed) return;

            bids.push({
                direction:   directions[idx],
                directionEn: DIRECTION_EN[directions[idx]] || directions[idx],
                raw:         parsed.raw,
                translation: parsed.translationEn
            });
        });
    });
    return bids;
}

var spokenBidCount    = 0;
var lastBidPollLen    = 0;

function checkNewBids() {
    learnBidSvgClasses();
    var bids = readAllBids();
    if (bids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < bids.length; i++) {
            speak(bids[i].directionEn + ': ' + bids[i].translation);
            dlog('Bid: ' + bids[i].directionEn + ' ' + bids[i].translation);
        }
        spokenBidCount = bids.length;
    } else if (bids.length < spokenBidCount) {
        dlog('Bids reset');
        spokenBidCount = bids.length;
    }
    lastBidPollLen = bids.length;

    if (isBiddingPhase()) {
        var c = getContractFromBidHistory();
        if (c && c.strain) {
            cachedContract = c;
            dlog('cachedContract: ' + c.level + c.strain + ' declarer=' + c.declarer);
        }
    }
    
    updateGamePhase();
}

// =========================================================
// 17. BOARD ANNOUNCEMENT & STATE REFRESH
// =========================================================

var lastAnnouncedBoard = 0;

function announceBoard() {
    var bn = readBoardNumber();
    if (bn < 1 || bn === lastAnnouncedBoard) return;
    lastAnnouncedBoard    = bn;
    spokenBidCount        = 0;
    currentTrick          = [];
    previousTrickSnapshot = '';
    cachedContract        = null;
    activeTurnDirection   = null;

    var vulText = vulnerabilityTextEn(bn);
    var msg = 'Board ' + bn + '. ' + vulText + '.';
    speak(msg);
    dlog('announceBoard: ' + msg);
}

function forceRefreshState() {
    try {
        dlog('forceRefreshState: User requested memory reset (Alt+M).');
        
        pendingInput = null;
        clearInputTimeout();
        
        gamePhase = 'unknown';
        cachedContract = null;
        activeTurnDirection = null;
        
        learnBidSvgClasses();
        
        var wasBidding = isBiddingPhase();
        var wasPlay = isPlayPhase();
        if (wasPlay) {
            gamePhase = 'play';
        } else if (wasBidding) {
            gamePhase = 'bidding';
        }
        
        var bids = readAllBids();
        spokenBidCount = bids.length;
        lastBidPollLen = bids.length;
        
        var c = getContractFromBidHistory();
        if (c && c.strain) {
            cachedContract = c;
        }
        
        var domCards = readCurrentTrickCards();
        currentTrick = sortTrickChronologically(domCards);
        previousTrickSnapshot = trickSnapshot(domCards);

        // Try to recover active turn
        if (gamePhase === 'play' && currentTrick.length > 0) {
            var lastCard = currentTrick[currentTrick.length - 1];
            activeTurnDirection = getNextDirection(lastCard.direction);
        }
        
        speakNow('Extension memory reset.');
    } catch (e) {
        dlog('Error in reset: ' + e.message);
        speakNow('Error in reset.');
    }
}

// =========================================================
// 18. READING CARDS OUT LOUD
// =========================================================

function readSuitCards(cards, targetSuit) {
    var matching = cards.filter(function (c) { return c.suit === targetSuit; })
                        .map(function (c) { return c.value; });
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
                        .map(function (c) { return c.value; });
        if (vals.length > 0) parts.push(vals.length + ' ' + suit + ': ' + vals.join(' '));
    });
    speakNow(ownerName + '. ' + parts.join('. '));
}

function readPlayerNames() {
    var names = [];
    document.querySelectorAll('[data-testid^="occupied-seat-"]').forEach(function (el) {
        var dir  = el.getAttribute('data-testid').replace('occupied-seat-', '');
        var name = (el.textContent || '').trim();
        if (name) names.push((DIRECTION_EN[dir] || dir) + ': ' + name);
    });
    speakNow(names.length > 0 ? names.join(', ') : 'Player names not found.');
}

// =========================================================
// 19. KEYBOARD LISTENERS
// =========================================================

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var key = e.key.toLowerCase();

    function block() {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    if (key === 'escape' && pendingInput !== null) {
        block(); cancelPendingInput(); return;
    }

    if (pendingInput !== null) {
        block(); handleSecondKey(key); return;
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (key === 'm') { block(); forceRefreshState(); return; }

        if (key === 'o') { block(); readAllCards(getUserHand(), 'My hand'); return; }
        if (key === 'a') { block(); readSuitCards(getUserHand(), 'Spade');    return; }
        if (key === 's') { block(); readSuitCards(getUserHand(), 'Heart');  return; }
        if (key === 'd') { block(); readSuitCards(getUserHand(), 'Diamond');   return; }
        if (key === 'f') { block(); readSuitCards(getUserHand(), 'Club');   return; }

        if (key === 'l') {
            block();
            var d = getDummyHand();
            d.length === 0 ? speakNow('Dummy not visible.') : readAllCards(d, 'Dummy');
            return;
        }
        if (key === 'q') { block(); var dq = getDummyHand(); if (!dq.length) { speakNow('Dummy not visible.'); return; } readSuitCards(dq, 'Spade');   return; }
        if (key === 'w') { block(); var dw = getDummyHand(); if (!dw.length) { speakNow('Dummy not visible.'); return; } readSuitCards(dw, 'Heart'); return; }
        if (key === 'e') { block(); var de = getDummyHand(); if (!de.length) { speakNow('Dummy not visible.'); return; } readSuitCards(de, 'Diamond');  return; }
        if (key === 'r') { block(); var dr = getDummyHand(); if (!dr.length) { speakNow('Dummy not visible.'); return; } readSuitCards(dr, 'Club');  return; }

        if (key === 'p') {
            block();
            var trick = currentTrick.length > 0 ? currentTrick : sortTrickChronologically(readCurrentTrickCards());
            speakNow(trick.length === 0
                ? 'No cards on table.'
                : 'Trick: ' + trick.map(function (c) {
                    return c.directionEn + ' ' + c.suit + ' ' + c.value;
                }).join(', '));
            return;
        }

        if (key === 'b') {
            block();
            var bids = readAllBids();
            speakNow(bids.length === 0
                ? 'No bids.'
                : 'Bids: ' + bids.map(function (b) {
                    return b.directionEn + ' ' + b.translation;
                }).join(', '));
            return;
        }

        if (key === 'x') {
            block();
            var parts = [];
            
            var uDir = getUserDirection();
            var uDirEn = uDir ? (DIRECTION_EN[uDir] || uDir) : 'Unknown';
            parts.push('My direction: ' + uDirEn);
            
            var bn = readBoardNumber();
            if (bn > 0) {
                parts.push('Board ' + bn + '. ' + vulnerabilityTextEn(bn));
            } else {
                parts.push('Board number not available');
            }
            
            var contract = readContractDisplay();
            parts.push(contract ? 'Contract: ' + contract : 'No contract yet');
            
            speakNow(parts.join('. ') + '.');
            return;
        }

        if (key === 'v') {
            block();
            var bnv = readBoardNumber();
            speakNow(bnv > 0
                ? 'Board ' + bnv + ': ' + vulnerabilityTextEn(bnv) + '.'
                : 'Board number not available.');
            return;
        }

        if (key === 't' || key === 'c') { block(); readTrickCount();   return; }
        if (key === 'n') { block(); readPlayerNames();  return; }
        if (key === 'g') { block(); downloadDebugLog(); speakNow('Debug log downloaded.'); return; }

        return;
    }

    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        handleFirstKey(key, block);
    }

}, true);

// =========================================================
// 20. MUTATIONOBSERVER
// =========================================================

var boardTimer = null;
var bidTimer   = null;
var trickTimer = null;

function labelClaimButtons(alertEl) {
    if (!alertEl) return;
    var btns = alertEl.querySelectorAll('button:not([aria-label])');
    if (btns.length < 2) {
        btns = alertEl.querySelectorAll('button');
    }
    if (btns.length < 2) return;

    var claimText = (alertEl.textContent || '').replace(/\s+/g, ' ').trim();
    var shortText = claimText.length > 80 ? claimText.substring(0, 80) + '...' : claimText;

    btns[0].setAttribute('aria-label', 'Accept claim: ' + shortText);
    btns[1].setAttribute('aria-label', 'Reject claim: ' + shortText);
    btns[0].setAttribute('tabindex', '0');
    btns[1].setAttribute('tabindex', '0');

    dlog('labelClaimButtons: labeled. "' + shortText + '"');
    speak('Claim: ' + shortText + '. Accept or reject claim.');
    setTimeout(function () { btns[0].focus(); }, 300);
}

(function () {
    var existing = document.querySelector('[role="alert"][data-testid="inline-notification"]');
    if (existing) labelClaimButtons(existing);
})();

var gameObserver = new MutationObserver(function (mutations) {
    var checkBoard = false, checkBids = false, checkTrick = false;

    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            
            var nid = node.id || '';
            var tid = node.getAttribute ? (node.getAttribute('data-testid') || '') : '';

            if (nid === 'current-trick' || (node.closest && node.closest('#current-trick'))) checkTrick = true;
            if (tid && isCardTestId(tid)) checkTrick = true;
            if (node.querySelector && node.querySelector('#current-trick')) checkTrick = true;

            if (nid === 'bids-history' || tid === 'bids-history' ||
                (node.closest && node.closest('#bids-history'))) checkBids = true;

            if (nid === 'vulnerability-wrapper' ||
                (node.closest && node.closest('#vulnerability-wrapper'))) checkBoard = true;

            if (node.getAttribute && node.getAttribute('role') === 'alert') {
                labelClaimButtons(node);
            }
            if (node.querySelector) {
                var alert = node.querySelector('[role="alert"][data-testid="inline-notification"]');
                if (alert) labelClaimButtons(alert);
            }
        });

        if (mutation.type === 'characterData') {
            var p = mutation.target.parentElement;
            if (p) {
                if (p.closest('#current-trick'))         checkTrick = true;
                if (p.closest('#vulnerability-wrapper')) checkBoard = true;
                if (p.closest('#bids-history'))          checkBids  = true;
            }
        }

        if (mutation.target) {
            var tgt = mutation.target;
            if (tgt.id === 'current-trick' || (tgt.closest && tgt.closest('#current-trick'))) checkTrick = true;
            if (tgt.id === 'bids-history'  || (tgt.closest && tgt.closest('#bids-history')))  checkBids  = true;
            if (tgt.id === 'vulnerability-wrapper' ||
                (tgt.closest && tgt.closest('#vulnerability-wrapper'))) checkBoard = true;
        }
    });

    if (checkTrick) { if (trickTimer) clearTimeout(trickTimer); trickTimer = setTimeout(detectTrickChanges, 150); }
    if (checkBids)  { if (bidTimer)   clearTimeout(bidTimer);   bidTimer   = setTimeout(checkNewBids, 350); }
    if (checkBoard) {
        if (boardTimer) clearTimeout(boardTimer);
        boardTimer = setTimeout(function () {
            var bn = readBoardNumber();
            if (bn > 0 && bn !== lastAnnouncedBoard) announceBoard();
        }, 600);
    }
});

gameObserver.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: false
});

// =========================================================
// 21. ALLOWED MODALS (Whitelist)
// =========================================================

var ALLOWED_MODALS = [
    "claim",
    "concede",
    "accept",
    "reject"
];

function isAllowedModal(text) {
    if (!text) return false;
    var lower = text.toLowerCase();
    for (var i = 0; i < ALLOWED_MODALS.length; i++) {
        if (lower.indexOf(ALLOWED_MODALS[i]) !== -1) return true;
    }
    return false;
}

function focusDialog(dialogEl) {
    if (!dialogEl) return;
    if (!dialogEl.getAttribute('tabindex'))   dialogEl.setAttribute('tabindex', '-1');
    if (!dialogEl.getAttribute('role'))       dialogEl.setAttribute('role', 'dialog');
    if (!dialogEl.getAttribute('aria-modal')) dialogEl.setAttribute('aria-modal', 'true');
    setTimeout(function () {
        var target = dialogEl.querySelector(
            'button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        ) || dialogEl;
        if (target === dialogEl && !target.getAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        simulateClick(target);
        target.focus();
        var txt = (dialogEl.textContent || '').trim();
        if (txt) speak('Dialog: ' + (txt.length > 200 ? txt.substring(0, 200) + '...' : txt));
    }, 400);
}

var modalObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            
            var role = node.getAttribute ? node.getAttribute('role') : '';
            var targetDialog = (role === 'dialog' || role === 'alertdialog') ? node : (node.querySelector ? node.querySelector('[role="dialog"],[role="alertdialog"]') : null);
            
            if (targetDialog) {
                var txt = (targetDialog.textContent || '').trim();
                
                if (isAllowedModal(txt)) {
                    dlog('Allowed modal detected, moving focus.');
                    focusDialog(targetDialog);
                } else {
                    dlog('Unknown modal ignored (no focus): ' + (txt.length > 30 ? txt.substring(0,30) + '...' : txt));
                }
            }
        });
    });
});
modalObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// 22. INITIALIZATION AND POLLING
// =========================================================

setTimeout(function () {
    learnBidSvgClasses();
    announceBoard();
    updateGamePhase();
    dlog('V1.16 initialized. My direction: ' + (getUserDirection() || '?'));
}, 2000);

setInterval(function () {
    var bn = readBoardNumber();
    if (bn > 0 && bn !== lastAnnouncedBoard) announceBoard();
}, 2500);

setInterval(function () {
    var len = readAllBids().length;
    if (len !== lastBidPollLen) checkNewBids();
    
    updateGamePhase();
}, 500);

setInterval(function () {
    var snap = trickSnapshot(readCurrentTrickCards());
    if (snap !== previousTrickSnapshot) detectTrickChanges();
}, 300);

// =========================================================
// INSTRUCTIONS TO CONSOLE
// =========================================================
console.log([
    '=== IntoBridge Accessibility Extension V1.16 ===',
    '',
    'PLAYING A CARD (two keys, no Alt, only in play phase):',
    '  1. Suit:  s=Spade  h=Heart  d=Diamond  c=Club',
    '  2. Rank:  a k q j t 9 8 7 6 5 4 3 2',
    '  E.g.: s → "Spade?" → a → plays Ace of Spades',
    '  *Extension tracks the turn and will reject input if it is not your turn.*',
    '',
    'BIDDING (two keys, no Alt, only in bidding phase):',
    '  1. Level: 1 2 3 4 5 6 7',
    '  2. Suit:  c=Club  d=Diamond  h=Heart  s=Spade  n=NT',
    '  p = Pass   x = Double/Redouble   Escape = Cancel',
    '',
    'QUERY COMMANDS (Alt+Letter):',
    '  Alt+O       = My entire hand',
    '  Alt+A/S/D/F = My Spades/Hearts/Diamonds/Clubs',
    '  Alt+L       = Entire dummy hand',
    '  Alt+Q/W/E/R = Dummy Spades/Hearts/Diamonds/Clubs',
    '  Alt+P       = Current trick on table (Chronological order)',
    '  Alt+B       = Bidding history',
    '  Alt+X       = My direction, board info and contract',
    '  Alt+V       = Vulnerability',
    '  Alt+T       = Trick count (We / They)',
    '  Alt+N       = Player names',
    '  Alt+M       = Reset extension memory and refresh state from screen',
    '  Alt+G       = Download debug log'
].join('\n'));