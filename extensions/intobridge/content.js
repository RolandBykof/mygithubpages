// =========================================================
// IntoBridge Esteettömyyslaajennus (NVDA-ruudunlukijatuki)
// Versio 1.7 (Lepokäden/pöydän korttien pelaaminen lisätty)
// =========================================================

console.log("IntoBridge Esteettömyyslaajennus V1.7 ladattu");

// =========================================================
// 1. RUUDUNLUKIJAPUHUJA
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
// 2. VIRHELOKI
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
// 3. VAKIOT
// =========================================================

var SUIT_LETTER_TO_FI = { 'S': 'Pata', 'H': 'Hertta', 'D': 'Ruutu', 'C': 'Risti' };
var H3_CLASS_TO_SUIT  = { 's': 'S', 'h': 'H', 'd': 'D', 'c': 'C' };

var SUIT_FI_TO_PLURAL  = { 'Pata': 'Padat', 'Hertta': 'Hertat', 'Ruutu': 'Ruudut', 'Risti': 'Ristit' };
var SUIT_ORDER_FI      = ['Pata', 'Hertta', 'Ruutu', 'Risti'];
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
var BID_STRAIN_FI = { 'C':'Risti','D':'Ruutu','H':'Hertta','S':'Pata','N':'SA','NT':'SA' };

var VULNERABILITY_PATTERN = [
    'None','NS','EW','All','NS','EW','All','None',
    'EW','All','None','NS','All','None','NS','EW'
];

var DIRECTION_FI   = { 'N':'Pohjoinen','E':'Itä','S':'Etelä','W':'Länsi' };

var BID_CALL_FI = {
    'Pass':'Passi','Passi':'Passi',
    'X':'Kontra','Dbl':'Kontra',
    'XX':'Rekontra','Rdbl':'Rekontra'
};

// =========================================================
// 4. KORTTIEN TUNNISTUS
// =========================================================

function isCardTestId(id) {
    if (!id || id.length < 2) return false;
    if (!SUIT_LETTER_TO_FI[id.charAt(0).toUpperCase()]) return false;
    return /^(10|[2-9TJQKA])$/.test(id.substring(1).toUpperCase());
}

function parseCardTestId(id) {
    if (!isCardTestId(id)) return null;
    var sl  = id.charAt(0).toUpperCase();
    var val = id.substring(1).toUpperCase();
    return { suitLetter: sl, suit: SUIT_LETTER_TO_FI[sl], value: val, key: sl + val };
}

function suitFromH3(h3el) {
    if (!h3el) return null;
    for (var i = 0; i < h3el.classList.length; i++) {
        var sl = H3_CLASS_TO_SUIT[h3el.classList[i].toLowerCase()];
        if (sl) return SUIT_LETTER_TO_FI[sl];
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
// 5. KÄSIEN JA SUUNTIEN TUNNISTUS
// =========================================================

function getUserHand() {
    var el = document.querySelector('#bottom-seat, [data-testid="bottom-seat"]');
    if (!el) { dlog('getUserHand: #bottom-seat ei löydy'); return []; }
    return sortCards(getCardsInElement(el));
}

function getDummyHand() {
    var vertEl = document.querySelector(
        '#opponents-row [data-testid="vertical-hand"], [data-testid="vertical-hand"]'
    );
    if (vertEl) {
        var vc = sortCards(getCardsInElement(vertEl));
        if (vc.length > 0) { dlog('getDummyHand: vertical-hand ' + vc.length + ' kpl'); return vc; }
    }
    var topEl = document.querySelector('#partner-seat, [data-testid="top-seat"]');
    if (topEl) {
        var tc = sortCards(getCardsInElement(topEl));
        if (tc.length > 0) { dlog('getDummyHand: top-seat ' + tc.length + ' kpl'); return tc; }
    }
    dlog('getDummyHand: ei kortteja');
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
// 6. VAIHEEN TUNNISTUS
// =========================================================

var gamePhase = 'unknown';

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
        dlog('Vaiheen muutos → tarjousvaihe');
    } else if (isPlay && gamePhase !== 'play') {
        gamePhase = 'play';
        dlog('Vaiheen muutos → pelausvaihe');
        speak('Pelausvaihe alkaa.');
    }
}

// =========================================================
// 7. KLIKKAUSSIMULOI (React / Chakra UI)
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
// 8. KORTIN PELAAMINEN (Omasta tai lepokädestä)
// =========================================================

function playCard(suitLetter, value) {
    var testId = suitLetter + value;
    var suitFi = SUIT_LETTER_TO_FI[suitLetter] || suitLetter;

    // 1. Etsi ensin omasta kädestä (bottom-seat)
    var seat = document.querySelector('#bottom-seat, [data-testid="bottom-seat"]');
    if (seat) {
        var cardEl = seat.querySelector('[data-testid="' + testId + '"]');
        if (cardEl) {
            simulateClick(cardEl);
            speakNow(suitFi + ' ' + value + ' pelattu omasta kädestä.');
            dlog('playCard: ' + testId + ' klikattu omasta kädestä');
            return;
        }
    }

    // 2. Jos ei löydy omasta kädestä, etsitään pöydästä (lepokäsi)
    // Lepokäsi voi olla DOM:ssa vastustajien rivillä (vertical-hand) tai yläpuolella (partner-seat/top-seat)
    var dummyVert = document.querySelector('#opponents-row [data-testid="vertical-hand"], [data-testid="vertical-hand"]');
    var dummyTop  = document.querySelector('#partner-seat, [data-testid="top-seat"]');
    
    var dummyCardEl = null;
    if (dummyVert) dummyCardEl = dummyVert.querySelector('[data-testid="' + testId + '"]');
    if (!dummyCardEl && dummyTop) dummyCardEl = dummyTop.querySelector('[data-testid="' + testId + '"]');

    if (dummyCardEl) {
        simulateClick(dummyCardEl);
        speakNow(suitFi + ' ' + value + ' pelattu pöydästä.');
        dlog('playCard: ' + testId + ' klikattu pöydästä (lepokäsi)');
        return;
    }

    // 3. Jos ei löytynyt kummastakaan
    speakNow('Ei ' + suitFi + ' ' + value + ':tä kädessä eikä pöydässä.');
    dlog('playCard: kortti ' + testId + ' ei löydy omasta eikä lepokädestä');
}

// =========================================================
// 9. TARJOAMINEN
// =========================================================

function submitBid(level, strain) {
    var levelBtn  = document.querySelector('[data-testid="bid-level-' + level + '"]');
    var strainBtn = document.querySelector('[data-testid="bid-trump-' + strain + '"]');
    var strainFi  = BID_STRAIN_FI[strain] || strain;

    if (!levelBtn)  { speakNow('Tasopainike ' + level + ' ei löydy. Ei tarjousvuorossa?');  dlog('submitBid: level-btn puuttuu');  return; }
    if (!strainBtn) { speakNow('Maapainike ' + strain + ' ei löydy. Ei tarjousvuorossa?'); dlog('submitBid: strain-btn puuttuu'); return; }

    simulateClick(levelBtn);
    setTimeout(function () {
        simulateClick(strainBtn);
        speakNow('Tarjous: ' + level + ' ' + strainFi + '.');
        dlog('submitBid: ' + level + ' ' + strain);
    }, 120);
}

function submitPass() {
    var btn = document.querySelector('[data-testid="bid-pass"]');
    if (!btn) { speakNow('Passipainike ei löydy. Ei tarjousvuorossa?'); return; }
    simulateClick(btn);
    speakNow('Passi.');
    dlog('submitPass');
}

function submitDouble() {
    var btn = document.querySelector('[data-testid="bid-double"]');
    if (!btn) { speakNow('Kontrapainike ei löydy. Ei tarjousvuorossa?'); return; }
    var label = (btn.textContent || '').trim().toUpperCase();
    simulateClick(btn);
    speakNow(label === 'XX' ? 'Rekontra.' : 'Kontra.');
    dlog('submitDouble: ' + label);
}

// =========================================================
// 10. KAKSOISPAINALLUKSEN TILAKONE
// =========================================================

var pendingInput       = null;
var inputTimeoutHandle = null;
var INPUT_TIMEOUT_MS   = 5000;

function setInputTimeout() {
    clearInputTimeout();
    inputTimeoutHandle = setTimeout(function () {
        if (pendingInput !== null) {
            pendingInput = null;
            speakNow('Aikakatkaisu, syöte peruutettu.');
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
    speakNow('Peruutettu.');
}

function handleFirstKey(key, blockFn) {
    if (KEY_TO_SUIT[key] && isPlayPhase()) {
        blockFn();
        pendingInput = { type: 'card', suit: KEY_TO_SUIT[key] };
        setInputTimeout();
        speakNow(SUIT_LETTER_TO_FI[pendingInput.suit] + '?');
        return true;
    }
    if (key >= '1' && key <= '7' && isBiddingPhase()) {
        blockFn();
        pendingInput = { type: 'bid', level: key };
        setInputTimeout();
        speakNow('Taso ' + key + '?');
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
            speakNow(SUIT_LETTER_TO_FI[pendingInput.suit] + '?');
            return;
        }
        var value = KEY_TO_CARD_VALUE[key];
        if (value) {
            var suit = pendingInput.suit;
            pendingInput = null;
            playCard(suit, value);
            return;
        }
        speakNow('Tuntematon arvo. ' + SUIT_LETTER_TO_FI[pendingInput.suit] + '?');
        setInputTimeout();
        return;
    }

    if (pendingInput.type === 'bid') {
        if (key >= '1' && key <= '7') {
            pendingInput.level = key;
            setInputTimeout();
            speakNow('Taso ' + key + '?');
            return;
        }
        var strain = KEY_TO_BID_STRAIN[key];
        if (strain) {
            var level = pendingInput.level;
            pendingInput = null;
            submitBid(level, strain);
            return;
        }
        speakNow('Tuntematon maa. Taso ' + pendingInput.level + '?');
        setInputTimeout();
        return;
    }
}

// =========================================================
// 11. NYKYTEMPPU
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
            pos: pos, direction: dir, directionFi: DIRECTION_FI[dir] || dir,
            suit: parsed.suit, value: parsed.value, key: parsed.key
        });
    });
    return result;
}

function trickSnapshot(cards) {
    return cards.map(function (c) { return c.pos + ':' + c.key; }).sort().join('|');
}

var previousTrickSnapshot = '';
var currentTrick          = [];

function detectTrickChanges() {
    var cards    = readCurrentTrickCards();
    var snapshot = trickSnapshot(cards);
    if (snapshot === previousTrickSnapshot) return;

    if (cards.length < currentTrick.length && currentTrick.length >= 4) {
        dlog('Temppu päättyi'); currentTrick = [];
    }

    var prevKeys = currentTrick.map(function (c) { return c.key; });
    cards.forEach(function (c) {
        if (prevKeys.indexOf(c.key) === -1) {
            var msg = c.directionFi + ': ' + c.suit + ' ' + c.value;
            speak(msg);
            dlog('Pelattu: ' + msg);
        }
    });

    currentTrick          = cards;
    previousTrickSnapshot = snapshot;
}

// =========================================================
// 12. TIKKILASKU
// =========================================================

function readTrickCount() {
    var contractEl = document.querySelector('.board-contract');
    if (!contractEl) {
        speakNow('Tikkilasku ei saatavilla.');
        dlog('readTrickCount: .board-contract ei löydy');
        return;
    }

    var pEls = contractEl.querySelectorAll('button p.css-722v25');
    dlog('readTrickCount: p.css-722v25 löytyi ' + pEls.length + ' kpl');

    if (pEls.length >= 2) {
        var me   = (pEls[0].textContent || '').trim();
        var they = (pEls[1].textContent || '').trim();
        speakNow('Me: ' + me + ', he: ' + they + ' temppua.');
        return;
    }

    var pEls2 = contractEl.querySelectorAll('p.css-722v25');
    dlog('readTrickCount: varahaku p.css-722v25 löytyi ' + pEls2.length + ' kpl');
    if (pEls2.length >= 2) {
        speakNow('Me: ' + (pEls2[0].textContent || '').trim() +
                 ', he: ' + (pEls2[1].textContent || '').trim() + ' temppua.');
        return;
    }

    speakNow('Tikkilasku ei saatavilla.');
}

// =========================================================
// 13. JAKO-INFO JA HAAVOITTUVUUS
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

function vulnerabilityTextFi(bn) {
    var v = getVulnerability(bn);
    if (v.ns && v.ew)   return 'Kaikki haavoittuvia';
    if (!v.ns && !v.ew) return 'Ei haavoittuvia';
    if (v.ns)           return 'Pohjoinen-Etelä haavoittuvat';
    return 'Itä-Länsi haavoittuvat';
}

// =========================================================
// 14. SOPIMUS
// =========================================================

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

    for (var i = bids.length - 1; i >= 0; i--) {
        var raw = (bids[i].raw || '').toUpperCase().replace(/\s+/g,'');
        if (raw === 'PASS' || raw === 'PASSI' || raw === 'X' || raw === 'XX') continue;
        var m = raw.match(/^([1-7])([CDHSN]{1,2})$/);
        if (m) return { level: m[1], strain: m[2] === 'NT' ? 'N' : m[2], declarer: bids[i].dir };
        break;
    }
    return null;
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
        dlog('readContractDisplay: live-haku onnistui ' + live.level + live.strain);
    }

    if (!source && cachedContract && cachedContract.strain) {
        source = cachedContract;
        dlog('readContractDisplay: käytetään välimuistia ' + cachedContract.level + cachedContract.strain);
    }

    if (!level && !source) { dlog('readContractDisplay: ei tasoa eikä sopimusta'); return null; }

    var strainFi   = source ? (BID_STRAIN_FI[source.strain] || source.strain) : '';
    var declarerFi = source && source.declarer ? (DIRECTION_FI[source.declarer] || source.declarer) : '';

    if (!level && source) level = source.level;

    var contract = level + (strainFi ? ' ' + strainFi : '');
    if (declarerFi) contract = declarerFi + ' ' + contract;
    dlog('readContractDisplay: ' + contract);
    return contract || null;
}

// =========================================================
// 15. TARJOUSHISTORIA
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
                dlog('learnBidSvg (path): ' + suit + ' path opittu (' + d.length + ' merkkiä)');
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
        return { raw: raw, translationFi: BID_CALL_FI[raw] || BID_CALL_FI[raw.toUpperCase()] || raw };
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
                    dlog('parseBidButton: maa path-d:stä → ' + strain);
                }
            }
            if (!strain) {
                svg.classList.forEach(function (cls) {
                    if (bidSvgToSuit[cls]) strain = bidSvgToSuit[cls];
                });
                if (strain) dlog('parseBidButton: maa CSS-luokasta → ' + strain);
            }
        }
    }

    var raw = level + (strain || '');
    var strainFi = BID_STRAIN_FI[strain] || strain;
    var translationFi = level + (strainFi ? ' ' + strainFi : '');
    return { raw: raw, translationFi: translationFi };
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
                directionFi: DIRECTION_FI[directions[idx]] || directions[idx],
                raw:         parsed.raw,
                translation: parsed.translationFi
            });
        });
    });
    return bids;
}

var spokenBidCount    = 0;
var lastBidPollLen    = 0;
var cachedContract    = null;

function checkNewBids() {
    learnBidSvgClasses();
    var bids = readAllBids();
    if (bids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < bids.length; i++) {
            speak(bids[i].directionFi + ': ' + bids[i].translation);
            dlog('Tarjous: ' + bids[i].directionFi + ' ' + bids[i].translation);
        }
        spokenBidCount = bids.length;
    } else if (bids.length < spokenBidCount) {
        dlog('Tarjoukset nollattu');
        spokenBidCount = bids.length;
    }
    lastBidPollLen = bids.length;

    if (isBiddingPhase()) {
        var c = getContractFromBidHistory();
        if (c && c.strain) {
            cachedContract = c;
            dlog('cachedContract: ' + c.level + c.strain + ' julistaja=' + c.declarer);
        }
    }
    
    updateGamePhase();
}

// =========================================================
// 16. JAKO-ILMOITUS
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

    var vulText = vulnerabilityTextFi(bn);
    var msg = 'Jako ' + bn + '. ' + vulText + '.';
    speak(msg);
    dlog('announceBoard: ' + msg);
}

// =========================================================
// 17. KORTTIEN LUKEMINEN ÄÄNEEN
// =========================================================

function readSuitCards(cards, targetSuit) {
    var matching = cards.filter(function (c) { return c.suit === targetSuit; })
                        .map(function (c) { return c.value; });
    var plural = SUIT_FI_TO_PLURAL[targetSuit] || targetSuit;
    speakNow(matching.length > 0
        ? matching.length + ' ' + plural + ': ' + matching.join(' ')
        : '0 ' + plural);
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) { speakNow(ownerName + ': ei kortteja näkyvissä.'); return; }
    var parts = [];
    SUIT_ORDER_FI.forEach(function (suit) {
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
        if (name) names.push((DIRECTION_FI[dir] || dir) + ': ' + name);
    });
    speakNow(names.length > 0 ? names.join(', ') : 'Pelaajien nimiä ei löydy.');
}

// =========================================================
// 18. NÄPPÄINKUUNTELIJA
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
        if (key === 'o') { block(); readAllCards(getUserHand(), 'Oma käsi'); return; }
        if (key === 'a') { block(); readSuitCards(getUserHand(), 'Pata');    return; }
        if (key === 's') { block(); readSuitCards(getUserHand(), 'Hertta');  return; }
        if (key === 'd') { block(); readSuitCards(getUserHand(), 'Ruutu');   return; }
        if (key === 'f') { block(); readSuitCards(getUserHand(), 'Risti');   return; }

        if (key === 'l') {
            block();
            var d = getDummyHand();
            d.length === 0 ? speakNow('Lepokäsi ei näkyvissä.') : readAllCards(d, 'Lepokäsi');
            return;
        }
        if (key === 'q') { block(); var dq = getDummyHand(); if (!dq.length) { speakNow('Lepokäsi ei näkyvissä.'); return; } readSuitCards(dq, 'Pata');   return; }
        if (key === 'w') { block(); var dw = getDummyHand(); if (!dw.length) { speakNow('Lepokäsi ei näkyvissä.'); return; } readSuitCards(dw, 'Hertta'); return; }
        if (key === 'e') { block(); var de = getDummyHand(); if (!de.length) { speakNow('Lepokäsi ei näkyvissä.'); return; } readSuitCards(de, 'Ruutu');  return; }
        if (key === 'r') { block(); var dr = getDummyHand(); if (!dr.length) { speakNow('Lepokäsi ei näkyvissä.'); return; } readSuitCards(dr, 'Risti');  return; }

        if (key === 'p') {
            block();
            var trick = readCurrentTrickCards();
            speakNow(trick.length === 0
                ? 'Ei kortteja pöydällä.'
                : 'Pöytä: ' + trick.map(function (c) {
                    return c.directionFi + ' ' + c.suit + ' ' + c.value;
                }).join(', '));
            return;
        }

        if (key === 'b') {
            block();
            var bids = readAllBids();
            speakNow(bids.length === 0
                ? 'Ei tarjouksia.'
                : 'Tarjoukset: ' + bids.map(function (b) {
                    return b.directionFi + ' ' + b.translation;
                }).join(', '));
            return;
        }

        if (key === 'x') {
            block();
            var parts = [];
            
            var uDir = getUserDirection();
            var uDirFi = uDir ? (DIRECTION_FI[uDir] || uDir) : 'Tuntematon';
            parts.push('Oma suunta: ' + uDirFi);
            
            var bn = readBoardNumber();
            if (bn > 0) {
                parts.push('Jako ' + bn + '. ' + vulnerabilityTextFi(bn));
            } else {
                parts.push('Jako-numero ei saatavilla');
            }
            
            var contract = readContractDisplay();
            parts.push(contract ? 'Sopimus: ' + contract : 'Ei sopimusta vielä');
            
            speakNow(parts.join('. ') + '.');
            return;
        }

        if (key === 'v') {
            block();
            var bnv = readBoardNumber();
            speakNow(bnv > 0
                ? 'Jako ' + bnv + ': ' + vulnerabilityTextFi(bnv) + '.'
                : 'Jako-numero ei saatavilla.');
            return;
        }

        if (key === 't' || key === 'c') { block(); readTrickCount();   return; }
        if (key === 'n') { block(); readPlayerNames();  return; }
        if (key === 'g') { block(); downloadDebugLog(); speakNow('Virheloki ladattu.'); return; }

        return;
    }

    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        handleFirstKey(key, block);
    }

}, true);

// =========================================================
// 19. MUTATIONOBSERVER JA ILMOITUKSET
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
    if (btns.length < 2) {
        dlog('labelClaimButtons: alle 2 nappia löytyi (' + btns.length + ')');
        return;
    }

    var claimText = (alertEl.textContent || '').replace(/\s+/g, ' ').trim();
    var shortText = claimText.length > 80 ? claimText.substring(0, 80) + '...' : claimText;

    btns[0].setAttribute('aria-label', 'Hyväksy väite: ' + shortText);
    btns[1].setAttribute('aria-label', 'Hylkää väite: ' + shortText);
    btns[0].setAttribute('tabindex', '0');
    btns[1].setAttribute('tabindex', '0');

    dlog('labelClaimButtons: nimetty. "' + shortText + '"');
    speak('Vaatimus: ' + shortText + '. Hyväksy tai hylkää väite.');
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
// 20. MODAALIEN AUTOFOKUS (NVDA)
// =========================================================

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
        if (txt) speak('Dialogi: ' + (txt.length > 200 ? txt.substring(0, 200) + '...' : txt));
    }, 400);
}

var modalObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            var role = node.getAttribute ? node.getAttribute('role') : '';
            if (role === 'dialog' || role === 'alertdialog') { focusDialog(node); return; }
            if (node.querySelector) {
                var dlg = node.querySelector('[role="dialog"],[role="alertdialog"]');
                if (dlg) focusDialog(dlg);
            }
        });
    });
});
modalObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// 21. KÄYNNISTYS JA POLLAUS
// =========================================================

setTimeout(function () {
    learnBidSvgClasses();
    announceBoard();
    updateGamePhase();
    dlog('V1.7 käynnistetty. Oma suunta: ' + (getUserDirection() || '?'));
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
// OHJEET KONSOLIIN
// =========================================================
console.log([
    '=== IntoBridge Esteettömyyslaajennus V1.7 ===',
    '',
    'KORTIN PELAAMINEN (kaksi näppäintä, ei Alt, vain pelausvaihe):',
    '  1. Maa:   s=Pata  h=Hertta  d=Ruutu  c=Risti',
    '  2. Arvo:  a k q j t 9 8 7 6 5 4 3 2',
    '  Esim: s → "Pata?" → a → pelaa Pata A',
    '  *Jos korttia ei löydy omasta kädestä, laajennus etsii sen myös pöydästä (lepokädestä)*',
    '',
    'TARJOAMINEN (kaksi näppäintä, ei Alt, vain tarjousvaihe):',
    '  1. Taso:  1 2 3 4 5 6 7',
    '  2. Maa:   c=Risti  d=Ruutu  h=Hertta  s=Pata  n=SA',
    '  p = Passi   x = Kontra/Rekontra   Escape = Peruuta',
    '',
    'KYSELYKOMENNOT (Alt+kirjain):',
    '  Alt+O       = Oma käsi kokonaan',
    '  Alt+A/S/D/F = Omat padat/hertat/ruudut/ristit',
    '  Alt+L       = Lepokäsi kokonaan',
    '  Alt+Q/W/E/R = Lepokäden padat/hertat/ruudut/ristit',
    '  Alt+P       = Nykytemppu pöydällä',
    '  Alt+B       = Tarjoushistoria',
    '  Alt+X       = Oma suunta, jako-info ja sopimus',
    '  Alt+V       = Haavoittuvuus',
    '  Alt+T       = Tikkilasku (me / he)',
    '  Alt+N       = Pelaajien nimet',
    '  Alt+G       = Lataa virheloki'
].join('\n'));