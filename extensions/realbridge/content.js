// =============================================================
// RealBridge Accessibility Extension (NVDA-ruudunlukijatuki)
// Versio 1.0 – perustuu Funbridge V1.0 / IntoBridge V1.17 -arkkitehtuuriin
// Tekijä: Ville Lamminen / Näkövammaisten liitto
//
// TÄRKEÄ HUOMIO – korttiomistajan tunnistus:
// RealBridge käyttää CSS zIndex-arvoa kertomaan, missä kukin kortti on.
// Logiikka on käänteismallinnettu Gonzalo Godedin TamperMonkey-skriptistä (v0.14).
//
//   zIndex < 10           → ei käytössä / piilotettu
//   zIndex 100–119        → nykyinen tikki (paikka = zIndex − 100, eli 0–3)
//   zIndex 120–199        → lepääjän käsi
//   zIndex 200–249        → pelaaja itse on lepääjä (dummy), kump. pelinviejä pelaa
//   zIndex 250–1199       → pelattu kortti (menneet tikit)
//   zIndex 1200–95199     → lepääjän käsi (suurempi arvo)
//   zIndex 95200–109999   → oma käsi (main)
// =============================================================

console.log('RealBridge Accessibility Extension V1.0 Loaded');

// =============================================================
// 1. ARIA LIVE REGION (NVDA)
// =============================================================

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
    speechQueue = [];
    isSpeaking  = false;
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

// =============================================================
// 2. VAKIOT
// =============================================================

// Korttien kiertosuunta – padat, hertat, ruudut, ristit
var RB_SUIT_ORDER = ['s', 'h', 'd', 'c'];
// Arvojen kiertosuunta – korkein ensin
var RB_RANK_ORDER = ['a','k','q','j','t','9','8','7','6','5','4','3','2'];

var RB_RANK_TO_EN = {
    'a':'A','k':'K','q':'Q','j':'J','t':'10',
    '9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2'
};
// Käänteinen hakemisto kortin arvo (string) → RealBridge-merkki
var RB_EN_TO_RANK = (function () {
    var m = {};
    Object.keys(RB_RANK_TO_EN).forEach(function (k) { m[RB_RANK_TO_EN[k]] = k; });
    return m;
}());

var RB_SUIT_TO_EN     = { 's':'Spade','h':'Heart','d':'Diamond','c':'Club' };
var RB_SUIT_TO_LETTER = { 's':'S','h':'H','d':'D','c':'C' };
var SUIT_LETTER_TO_EN = { 'S':'Spade','H':'Heart','D':'Diamond','C':'Club' };
var SUIT_EN_TO_PLURAL = { 'Spade':'Spades','Heart':'Hearts','Diamond':'Diamonds','Club':'Clubs' };
var SUIT_LETTER_ORDER = ['S','H','D','C'];

var CARD_RANK = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    '10':10,'J':11,'Q':12,'K':13,'A':14
};

// Näppäinten tulkinta
var KEY_TO_CARD_VALUE = {
    'a':'A','k':'K','q':'Q','j':'J','t':'10',
    '9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2'
};
var KEY_TO_SUIT        = { 's':'S','h':'H','d':'D','c':'C' };
var KEY_TO_BID_STRAIN  = { 'c':'C','d':'D','h':'H','s':'S','n':'N' };
var BID_STRAIN_EN      = { 'C':'Clubs','D':'Diamonds','H':'Hearts','S':'Spades','N':'NT' };

// RealBridge-positiot → luettava teksti
var RB_POS_TO_EN = {
    'main':'You', 'cho':'Partner', 'lho':'Left', 'rho':'Right'
};

// Myötäpäivinen pelausjärjestys (Gonzalo: main→lho→cho→rho→main)
var RB_NEXT    = { 'main':'lho','lho':'cho','cho':'rho','rho':'main' };
var RB_PARTNER = { 'main':'cho','cho':'main','lho':'rho','rho':'lho' };

// Tarjousnappi-ID: (taso-1)*5 + siirtymä; siirtymät: C=1, D=2, H=3, S=4, N=5
var STRAIN_TO_OFFSET = { 'C':1,'D':2,'H':3,'S':4,'N':5 };

// Pelin tila
var gamePhase          = 'unknown'; // 'bidding' | 'play' | 'unknown'
var cachedContract     = null;      // { level, strain, declarer }
var activeTurnPosition = null;      // 'main'|'lho'|'cho'|'rho'
var rbDeclarer         = null;      // 'main'|'lho'|'cho'|'rho'

// =============================================================
// 3. KORTTIOMISTAJAN TUNNISTUS (zIndex)
// =============================================================

function getRBCardOwner(suit, rank) {
    var el = document.getElementById('card_' + suit + rank);
    if (!el) return '';
    var z = parseInt(el.style.zIndex, 10);
    if (isNaN(z) || z < 10) return '';                              // ei käytössä
    if (z >= 100 && z < 120) return 's' + (z - 100);               // nykyinen tikki s0..s3
    if (z >= 120 && z < 200) return 'dummy';                        // lepääjä
    if (z >= 200 && z < 250) return 'dec-dummy';                    // pelaaja on lepääjänä
    if (z >= 250 && z < 1200) return 'played';                      // menneet tikit
    if (z >= 1200 && z < 95200) return 'dummy';                     // lepääjä (suurempi arvo)
    if (z >= 95200 && z < 110000) return 'main';                    // oma käsi
    return '';
}

function buildCardObj(suit, rank) {
    return {
        suit:       RB_SUIT_TO_EN[suit],
        suitLetter: RB_SUIT_TO_LETTER[suit],
        rank:       RB_RANK_TO_EN[rank],
        rbSuit:     suit,
        rbRank:     rank
    };
}

// =============================================================
// 4. KÄSIEN LUKEMINEN
// =============================================================

function getUserHand() {
    var cards = [];
    RB_SUIT_ORDER.forEach(function (s) {
        RB_RANK_ORDER.forEach(function (r) {
            if (getRBCardOwner(s, r) === 'main') cards.push(buildCardObj(s, r));
        });
    });
    return cards; // jo suit- ja arvosortissa
}

function getDummyHand() {
    var cards = [];
    RB_SUIT_ORDER.forEach(function (s) {
        RB_RANK_ORDER.forEach(function (r) {
            var owner = getRBCardOwner(s, r);
            if (owner === 'dummy' || owner === 'dec-dummy') cards.push(buildCardObj(s, r));
        });
    });
    return cards;
}

// =============================================================
// 5. VUORON TUNNISTUS (backgroundColor)
// =============================================================
// Aktiivinen vuoro: background-color sisältää "255" (rgb(0,255,255) = syaani)

var RB_POS_TO_NAME_CONTAINER = {
    'main': 'self_name_container',
    'lho':  'lho_name_container',
    'rho':  'rho_name_container',
    'cho':  'partner_name_container'
};

function getRBWhosTurn() {
    for (var pos in RB_POS_TO_NAME_CONTAINER) {
        var el = document.getElementById(RB_POS_TO_NAME_CONTAINER[pos]);
        if (el) {
            var bg = el.style.backgroundColor || '';
            if (bg.includes('255, 255') || bg.includes('0, 255')) return pos;
        }
    }
    return '';
}

// =============================================================
// 6. VAIHEEN TUNNISTUS
// =============================================================

function isBiddingPhase() {
    if (gamePhase === 'play') return false;
    var bb = document.getElementById('bb_container');
    if (!bb) return false;
    var s = window.getComputedStyle(bb);
    // Tarjouslaatikko näkyy kun se ei ole piilotettu
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    // Tarkistetaan myös sijainnilla: Gonzalo käyttää left:-1000px piilottamiseen
    if (bb.style.left && bb.style.left.includes('-1000')) return false;
    return true;
}

function isPlayPhase() {
    if (gamePhase === 'play') return true;
    var decl = document.getElementById('contract_declarer');
    return !!(decl && decl.textContent.trim() !== '');
}

var playPhaseConfirmCount = 0;
var PLAY_PHASE_CONFIRM_NEEDED = 2;

function updateGamePhase() {
    var bidding = isBiddingPhase();
    var play    = isPlayPhase();

    if (bidding) {
        playPhaseConfirmCount = 0;
        if (gamePhase !== 'bidding') gamePhase = 'bidding';
        return;
    }

    if (play) {
        playPhaseConfirmCount++;
        if (playPhaseConfirmCount >= PLAY_PHASE_CONFIRM_NEEDED && gamePhase !== 'play') {
            var wasUnknown = (gamePhase === 'unknown');
            gamePhase = 'play';
            rbDeclarer = detectDeclarer();
            if (rbDeclarer) {
                activeTurnPosition = RB_NEXT[rbDeclarer]; // avaustikki: pelinviejän jälkeinen
            }
            if (!wasUnknown) {
                var ct = readContractDisplay();
                speak(ct ? 'Bidding ended. Contract: ' + ct + '.'
                         : 'Bidding ended. Play begins.');
            }
        }
    } else {
        playPhaseConfirmCount = 0;
    }
}

// =============================================================
// 7. JAKAJAN JA PELINVIEJÄN TUNNISTUS
// =============================================================

var RB_POS_TO_VUL_BOX = {
    'main': 'self_vul_box',
    'lho':  'lho_vul_box',
    'rho':  'rho_vul_box',
    'cho':  'partner_vul_box'
};

function detectDealer() {
    // Jakajalla on ylimääräinen merkki (esim. "D") haavoittuvuuslaatikossaan
    for (var pos in RB_POS_TO_VUL_BOX) {
        var el = document.getElementById(RB_POS_TO_VUL_BOX[pos]);
        if (el && el.textContent.trim().length > 1) return pos;
    }
    return 'main'; // oletus
}

function detectDeclarer() {
    var declEl = document.getElementById('contract_declarer');
    if (!declEl || !declEl.textContent.trim()) return null;
    var firstChar = declEl.textContent.trim()[0].toUpperCase();

    for (var pos in RB_POS_TO_NAME_CONTAINER) {
        var el = document.getElementById(RB_POS_TO_NAME_CONTAINER[pos]);
        if (el && el.textContent.trim()[0] &&
            el.textContent.trim()[0].toUpperCase() === firstChar) {
            return pos;
        }
    }
    return null;
}

// =============================================================
// 8. KLIKKAUKSEN SIMULOINTI
// =============================================================

function simulateClick(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;
    var down = { bubbles:true, cancelable:true, view:window,
                 clientX:cx, clientY:cy, screenX:cx, screenY:cy, button:0, buttons:1 };
    var up   = Object.assign({}, down, { buttons:0 });

    el.dispatchEvent(new PointerEvent('pointerover',  down));
    el.dispatchEvent(new MouseEvent ('mouseover',     down));
    el.dispatchEvent(new PointerEvent('pointerenter', down));
    el.dispatchEvent(new PointerEvent('pointerdown',  down));
    el.dispatchEvent(new MouseEvent ('mousedown',     down));
    el.dispatchEvent(new PointerEvent('pointerup',    up));
    el.dispatchEvent(new MouseEvent ('mouseup',       up));
    el.dispatchEvent(new MouseEvent ('click',         up));
    el.focus();
    return true;
}

function simulateClickById(id) {
    return simulateClick(document.getElementById(id));
}

// =============================================================
// 9. KORTIN PELAAMINEN
// =============================================================

function getTrickLeadSuit() {
    var trick = getCurrentTrick();
    if (trick.length === 0 || trick.length === 4) return null;
    return trick[0].suitLetter;
}

function getEffectiveHand() {
    // Kenen kättä pelataan: oman käden tai lepääjän
    var turn = getRBWhosTurn();
    if (!turn) return getUserHand();
    if (rbDeclarer && turn === RB_PARTNER[rbDeclarer]) return getDummyHand();
    return getUserHand();
}

function playCard(suitLetter, rank) {
    var suitEn = SUIT_LETTER_TO_EN[suitLetter] || suitLetter;

    // Suit-following tarkistus
    var leadSuit = getTrickLeadSuit();
    if (leadSuit && leadSuit !== suitLetter) {
        var hand = getEffectiveHand();
        var hasLead = hand.some(function (c) { return c.suitLetter === leadSuit; });
        if (hasLead) {
            speakNow('Must follow ' + (SUIT_LETTER_TO_EN[leadSuit] || leadSuit) + ' suit.');
            return;
        }
    }

    var rbRank = RB_EN_TO_RANK[rank];
    if (!rbRank) { speakNow('Unknown rank: ' + rank); return; }

    var cardId = 'card_' + suitLetter.toLowerCase() + rbRank;
    if (simulateClickById(cardId)) {
        speakNow(suitEn + ' ' + rank + ' played.');
    } else {
        speakNow('Card ' + suitEn + ' ' + rank + ' not found.');
    }
}

function playExtreme(direction) {
    if (!isPlayPhase()) { speakNow('Not in play phase.'); return; }
    var leadSuit = getTrickLeadSuit();
    if (!leadSuit) { speakNow('No trick. Lead with suit key.'); return; }

    var hand = getEffectiveHand();
    var leadSuitEn = SUIT_LETTER_TO_EN[leadSuit] || leadSuit;
    var candidates = hand.filter(function (c) { return c.suitLetter === leadSuit; });
    if (candidates.length === 0) {
        speakNow('No ' + leadSuitEn + '. Discard with suit key.');
        return;
    }
    var sorted = candidates.slice().sort(function (a, b) {
        return (CARD_RANK[a.rank] || 0) - (CARD_RANK[b.rank] || 0);
    });
    var chosen = direction === 'low' ? sorted[0] : sorted[sorted.length - 1];
    playCard(chosen.suitLetter, chosen.rank);
}

// =============================================================
// 10. TARJOAMINEN
// =============================================================

function submitBid(level, strain) {
    var offset   = STRAIN_TO_OFFSET[strain.toUpperCase()];
    if (!offset) { speakNow('Unknown strain.'); return; }
    var bidNum   = (parseInt(level, 10) - 1) * 5 + offset;
    var strainEn = BID_STRAIN_EN[strain.toUpperCase()] || strain;
    if (simulateClickById('bid' + bidNum)) {
        speakNow('Bid: ' + level + ' ' + strainEn + '.');
    } else {
        speakNow(level + ' ' + strainEn + ' not available.');
    }
}

function submitPass() {
    if (simulateClickById('bpass')) speakNow('Pass.');
    else speakNow('Pass not available.');
}

function submitDouble() {
    var re  = document.getElementById('bredouble');
    var dbl = document.getElementById('bdouble');
    var el  = null;

    if (re) {
        var s = window.getComputedStyle(re);
        if (s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0') el = re;
    }
    if (!el && dbl) el = dbl;

    if (el) {
        simulateClick(el);
        speakNow(el === re ? 'Redouble.' : 'Double.');
    } else {
        speakNow('Double not available.');
    }
}

// =============================================================
// 11. KAKSIVAIHEINEN SYÖTTÖ (State Machine)
// =============================================================

var pendingInput       = null;
var inputTimeoutHandle = null;
var INPUT_TIMEOUT_MS   = 5000;

function setInputTimeout() {
    clearInputTimeout();
    inputTimeoutHandle = setTimeout(function () {
        if (pendingInput !== null) { pendingInput = null; speakNow('Timeout, cancelled.'); }
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
    // Kortin pelaaminen: suit-näppäin
    if (KEY_TO_SUIT[key] && isPlayPhase()) {
        blockFn();
        var chosenSuit = KEY_TO_SUIT[key];
        pendingInput = { type:'card', suit:chosenSuit };
        setInputTimeout();

        var leadSuit = getTrickLeadSuit();
        if (leadSuit && leadSuit !== chosenSuit) {
            var hand = getEffectiveHand();
            if (hand.some(function (c) { return c.suitLetter === leadSuit; })) {
                speakNow((SUIT_LETTER_TO_EN[chosenSuit] || chosenSuit) +
                    '? Warning: must follow ' + (SUIT_LETTER_TO_EN[leadSuit] || leadSuit) + '.');
                return;
            }
        }
        speakNow((SUIT_LETTER_TO_EN[chosenSuit] || chosenSuit) + '?');
        return;
    }

    // Tarjoaminen: tasonäppäin 1–7
    if (key >= '1' && key <= '7' && isBiddingPhase()) {
        blockFn();
        pendingInput = { type:'bid', level:key };
        setInputTimeout();
        speakNow('Level ' + key + '?');
        return;
    }

    if (key === 'p' && isBiddingPhase()) { blockFn(); submitPass();   return; }
    if (key === 'x' && isBiddingPhase()) { blockFn(); submitDouble(); return; }
}

function handleSecondKey(key) {
    clearInputTimeout();

    if (pendingInput.type === 'card') {
        // Suit-näppäin uudestaan → vaihda maa
        if (KEY_TO_SUIT[key]) {
            pendingInput.suit = KEY_TO_SUIT[key];
            setInputTimeout();
            var leadSuit = getTrickLeadSuit();
            if (leadSuit && leadSuit !== pendingInput.suit) {
                var hand = getEffectiveHand();
                if (hand.some(function (c) { return c.suitLetter === leadSuit; })) {
                    speakNow((SUIT_LETTER_TO_EN[pendingInput.suit] || pendingInput.suit) +
                        '? Warning: must follow ' + (SUIT_LETTER_TO_EN[leadSuit] || leadSuit) + '.');
                    return;
                }
            }
            speakNow((SUIT_LETTER_TO_EN[pendingInput.suit] || pendingInput.suit) + '?');
            return;
        }
        var value = KEY_TO_CARD_VALUE[key];
        if (value) {
            var suit = pendingInput.suit;
            pendingInput = null;
            playCard(suit, value);
            return;
        }
        speakNow('Unknown value. ' + (SUIT_LETTER_TO_EN[pendingInput.suit] || pendingInput.suit) + '?');
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

// =============================================================
// 12. TIKIN LUKEMINEN (zIndex s0..s3)
// =============================================================

function getCurrentTrick() {
    var trick = {};
    RB_SUIT_ORDER.forEach(function (s) {
        RB_RANK_ORDER.forEach(function (r) {
            var owner = getRBCardOwner(s, r);
            if (owner && owner.charAt(0) === 's') {
                var pos = parseInt(owner.substring(1), 10);
                if (!isNaN(pos) && pos >= 0 && pos <= 3) {
                    trick[pos] = buildCardObj(s, r);
                }
            }
        });
    });
    var result = [];
    for (var i = 0; i <= 3; i++) {
        if (trick[i]) result.push(trick[i]);
    }
    return result;
}

function trickSnapshot(trick) {
    return trick.map(function (c) { return c.suitLetter + c.rank; }).join('|');
}

function readCurrentTrick() {
    var trick = getCurrentTrick();
    if (trick.length === 0) { speakNow('No cards on table.'); return; }

    // Määritä kuka aloitti tikin
    var leadPos = activeTurnPosition;

    var parts = trick.map(function (c, idx) {
        var who = '';
        if (leadPos) {
            var pos = leadPos;
            for (var i = 0; i < idx; i++) pos = RB_NEXT[pos];
            who = (RB_POS_TO_EN[pos] || pos) + ': ';
        }
        return who + c.suit + ' ' + c.rank;
    });
    speakNow('Trick: ' + parts.join(', ') + '.');
}

// =============================================================
// 13. TIKIN VOITTAJAN ARVIOINTI
// =============================================================

function evaluateTrickWinner(trickCards, leadPosition, trumpStrain) {
    // trickCards: buildCardObj-objektit järjestyksessä (s0 ensin)
    if (!trickCards || trickCards.length === 0) return null;

    var leadSuit = trickCards[0].suitLetter;
    var winner   = { idx:0, card:trickCards[0] };

    for (var i = 1; i < trickCards.length; i++) {
        var c        = trickCards[i];
        var isTrump  = trumpStrain && c.suitLetter === trumpStrain;
        var winTrump = trumpStrain && winner.card.suitLetter === trumpStrain;

        if (isTrump && !winTrump) {
            winner = { idx:i, card:c };
        } else if (isTrump && winTrump) {
            if ((CARD_RANK[c.rank] || 0) > (CARD_RANK[winner.card.rank] || 0))
                winner = { idx:i, card:c };
        } else if (!winTrump && c.suitLetter === leadSuit) {
            if ((CARD_RANK[c.rank] || 0) > (CARD_RANK[winner.card.rank] || 0))
                winner = { idx:i, card:c };
        }
    }

    // Voittajan positio: leadPosition + winner.idx kierroksia eteenpäin
    var pos = leadPosition;
    for (var j = 0; j < winner.idx; j++) pos = RB_NEXT[pos];
    return pos;
}

// =============================================================
// 14. TARJOUSHISTORIAN LUKEMINEN (img-rotaatiomenetelmä)
// =============================================================
// Gonzalo-menetelmä: pelatut tarjouskuvat ovat body img -elementtejä
// joilla ei ole id:tä, src sisältää "bidbox/png" ja zIndex=0.
// CSS-rotaatio kertoo pelaajan: ~90° = main, ~180° = lho, ~270° = cho, ~0/360° = rho.

function getCSSRotation(el) {
    var st = window.getComputedStyle(el, null);
    var tm = st.getPropertyValue('transform') ||
             st.getPropertyValue('-webkit-transform') || 'none';
    if (tm === 'none') return 0;
    try {
        var vals  = tm.split('(')[1].split(')')[0].split(',');
        var angle = Math.round(
            Math.atan2(parseFloat(vals[1]), parseFloat(vals[0])) * (180 / Math.PI)
        );
        return angle < 0 ? angle + 360 : angle;
    } catch (e) { return 0; }
}

function parseBidFromImgSrc(src) {
    if (src.includes('PASSBB')) return { level:0, strain:null, en:'Pass',      raw:'pass' };
    if (src.includes('XXBB'))  return { level:0, strain:null, en:'Redouble',   raw:'xx'   };
    if (src.includes('XBB'))   return { level:0, strain:null, en:'Double',     raw:'x'    };

    var strains = ['NT','S','H','D','C'];
    var strainMap = { 'NT':'N','S':'S','H':'H','D':'D','C':'C' };
    for (var li = 1; li <= 7; li++) {
        for (var si = 0; si < strains.length; si++) {
            var st = strains[si];
            if (src.includes(li + st + 'BB')) {
                var sl = strainMap[st];
                return {
                    level:  li,
                    strain: sl,
                    en:     li + ' ' + (BID_STRAIN_EN[sl] || st),
                    raw:    li + sl
                };
            }
        }
    }
    return null;
}

function readAllBids() {
    var perPlayer = { main:[], cho:[], rho:[], lho:[] };

    document.querySelectorAll('body img').forEach(function (img) {
        if (!img.src || !img.src.includes('bidbox/png')) return;
        if (img.id) return;                                // tarjouslaatikon napit → ohita
        var z = parseInt(img.style.zIndex, 10) || 0;
        if (z > 0) return;
        if (img.style.left && img.style.left.includes('-1000')) return;

        var bid = parseBidFromImgSrc(img.src);
        if (!bid) return;

        // Rotaation perusteella: 45–135° = main, 135–225° = lho, 225–315° = cho, muut = rho
        var rot    = getCSSRotation(img);
        var player = 'rho';
        if (rot >= 45  && rot < 135) player = 'main';
        else if (rot >= 135 && rot < 225) player = 'lho';
        else if (rot >= 225 && rot < 315) player = 'cho';

        perPlayer[player].push(bid);
    });

    // Rekonstruoi kronologinen järjestys jakajan perusteella
    var dealer = detectDealer();
    var cloned = {
        main: perPlayer.main.slice(),
        cho:  perPlayer.cho.slice(),
        rho:  perPlayer.rho.slice(),
        lho:  perPlayer.lho.slice()
    };
    var result = [];
    var cur    = dealer;
    var safety = 0;
    while (safety++ < 80) {
        if (!cloned[cur] || cloned[cur].length === 0) break;
        var b = cloned[cur].shift();
        result.push({ position:cur, en:b.en, raw:b.raw, strain:b.strain, level:b.level });
        cur = RB_NEXT[cur];
    }
    return result;
}

var spokenBidCount = 0;

function checkNewBids() {
    var bids = readAllBids();
    if (bids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < bids.length; i++) {
            speak((RB_POS_TO_EN[bids[i].position] || bids[i].position) + ': ' + bids[i].en);
        }
        spokenBidCount = bids.length;
    } else if (bids.length < spokenBidCount) {
        spokenBidCount = bids.length; // lauta vaihtui
    }

    var c = getContractFromBidHistory(bids);
    if (c && c.strain) cachedContract = c;
}

// =============================================================
// 15. KONTRAKTIN LUKEMINEN
// =============================================================

function getContractFromBidHistory(bids) {
    if (!bids) bids = readAllBids();
    if (bids.length === 0) return null;

    var finalBid = null;
    var finalIdx = -1;
    for (var i = bids.length - 1; i >= 0; i--) {
        var b = bids[i];
        if (b.raw === 'pass' || b.raw === 'x' || b.raw === 'xx') continue;
        if (b.level > 0 && b.strain) { finalBid = b; finalIdx = i; break; }
    }
    if (!finalBid) return null;

    // Pelinviejä: sama puoli, joka ensin tarjosi tätä maata
    var NS   = ['main','cho'];
    var EW   = ['lho','rho'];
    var side = (NS.indexOf(finalBid.position) !== -1) ? NS : EW;
    var declarer = finalBid.position;

    for (var j = 0; j <= finalIdx; j++) {
        var bb = bids[j];
        if (side.indexOf(bb.position) === -1) continue;
        if (bb.strain === finalBid.strain) { declarer = bb.position; break; }
    }

    return { level:finalBid.level, strain:finalBid.strain, declarer:declarer };
}

function getOrBuildCachedContract() {
    if (cachedContract && cachedContract.strain) return cachedContract;
    var c = getContractFromBidHistory();
    if (c && c.strain) cachedContract = c;
    return cachedContract;
}

function readContractDisplay() {
    var contract = getOrBuildCachedContract();
    if (!contract) {
        // Fallback: lue suoraan DOM-elementeistä
        var lvlEl  = document.getElementById('contract_level');
        var stEl   = document.getElementById('contract_suit');
        var declEl = document.getElementById('contract_declarer');
        if (lvlEl && stEl && declEl) {
            var decName = declEl.textContent.trim();
            var lvl     = lvlEl.textContent.trim();
            var st      = stEl.textContent.trim();
            return (decName ? decName + ' ' : '') + lvl + ' ' + st;
        }
        return null;
    }
    var strainEn = BID_STRAIN_EN[contract.strain] || contract.strain;
    var declEn   = RB_POS_TO_EN[contract.declarer] || contract.declarer;
    return declEn + ' ' + contract.level + ' ' + strainEn;
}

// =============================================================
// 16. HAAVOITTUVUUS JA LAUTA-INFO
// =============================================================

function readVulnerability() {
    // Yritetään ensin tekstielementtejä
    var candidates = [
        document.getElementById('vul_display'),
        document.querySelector('.vulnerability'),
        document.querySelector('[id*="vulnerability"]')
    ];
    for (var ci = 0; ci < candidates.length; ci++) {
        if (candidates[ci]) {
            var t = candidates[ci].textContent.trim();
            if (t) return t;
        }
    }
    // Fallback: haavoittuvat punaisella taustavärillä
    var vulPositions = [];
    for (var pos in RB_POS_TO_VUL_BOX) {
        var el = document.getElementById(RB_POS_TO_VUL_BOX[pos]);
        if (el) {
            var bg = window.getComputedStyle(el).backgroundColor;
            if (bg && (bg.includes('255, 0, 0') || bg.includes('220, 0') || bg.includes('200, 0'))) {
                vulPositions.push(pos);
            }
        }
    }
    if (vulPositions.length === 0) return 'None';
    if (vulPositions.length === 4) return 'All';
    var NS = vulPositions.filter(function (p) { return p === 'main' || p === 'cho'; });
    var EW = vulPositions.filter(function (p) { return p === 'lho' || p === 'rho'; });
    if (NS.length === 2 && EW.length === 0) return 'You-Partner';
    if (EW.length === 2 && NS.length === 0) return 'Opponents';
    return vulPositions.map(function (p) { return RB_POS_TO_EN[p] || p; }).join('+');
}

function readPlayerNames() {
    var parts = [];
    for (var pos in RB_POS_TO_NAME_CONTAINER) {
        var el = document.getElementById(RB_POS_TO_NAME_CONTAINER[pos]);
        if (el) {
            var name = el.textContent.trim().replace(/\s+/g, ' ');
            if (name) parts.push((RB_POS_TO_EN[pos] || pos) + ': ' + name);
        }
    }
    speakNow(parts.length > 0 ? parts.join('. ') + '.' : 'Names not found.');
}

var lastAnnouncedBoard = '';

function announceBoard() {
    var vul = readVulnerability() || '';
    if (vul === lastAnnouncedBoard) return;
    lastAnnouncedBoard = vul;

    // Nollaa pelin tila uudelle laudalle
    spokenBidCount    = 0;
    cachedContract    = null;
    activeTurnPosition = null;
    rbDeclarer        = null;
    gamePhase         = 'unknown';
    prevTrickSnapshot = '';
    prevTrickLen      = 0;
    prevTrickCards    = [];

    speak(vul ? 'Vulnerable: ' + vul + '.' : 'New board.');
}

// =============================================================
// 17. KÄSIEN LUKU ÄÄNEEN
// =============================================================

function readSuitCards(cards, suitLetter) {
    var matching = cards.filter(function (c) { return c.suitLetter === suitLetter; })
                        .map(function (c) { return c.rank; });
    var suitEn = SUIT_LETTER_TO_EN[suitLetter] || suitLetter;
    var plural = SUIT_EN_TO_PLURAL[suitEn] || suitEn;
    speakNow(matching.length > 0
        ? matching.length + ' ' + plural + ': ' + matching.join(' ')
        : '0 ' + plural);
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) { speakNow(ownerName + ': no cards.'); return; }
    var parts = [];
    SUIT_LETTER_ORDER.forEach(function (sl) {
        var suitEn = SUIT_LETTER_TO_EN[sl] || sl;
        var vals = cards.filter(function (c) { return c.suitLetter === sl; })
                        .map(function (c) { return c.rank; });
        if (vals.length > 0) parts.push(vals.length + ' ' + suitEn + ': ' + vals.join(' '));
    });
    speakNow(ownerName + '. ' + parts.join('. ') + '.');
}

// =============================================================
// 18. TIKKIMÄÄRÄ
// =============================================================

function readTrickCount() {
    // Laske menneet tikit: korttien joiden owner='played' lukumäärä / 4
    var playedCards = 0;
    RB_SUIT_ORDER.forEach(function (s) {
        RB_RANK_ORDER.forEach(function (r) {
            if (getRBCardOwner(s, r) === 'played') playedCards++;
        });
    });
    var tricks = Math.floor(playedCards / 4);
    speakNow(tricks + ' tricks played (' + playedCards + ' cards).');
}

// =============================================================
// 19. TILA-RESET
// =============================================================

function forceRefreshState() {
    try {
        pendingInput = null;
        clearInputTimeout();
        gamePhase          = 'unknown';
        cachedContract     = null;
        activeTurnPosition = null;
        rbDeclarer         = null;
        prevTrickSnapshot  = '';
        prevTrickLen       = 0;
        prevTrickCards     = [];

        updateGamePhase();

        var bids = readAllBids();
        spokenBidCount = bids.length;
        var c = getContractFromBidHistory(bids);
        if (c && c.strain) cachedContract = c;

        if (isPlayPhase()) {
            rbDeclarer = detectDeclarer();
            if (rbDeclarer) activeTurnPosition = RB_NEXT[rbDeclarer];
        }

        speakNow('State reset.');
    } catch (err) {
        speakNow('Error in reset: ' + err.message);
    }
}

// =============================================================
// 20. QUERY-KOMENNOT (Alt+näppäin tai kortit-tilassa ilman modifioijaa)
// =============================================================

function handleQueryKey(key, blockFn) {
    if (key === 'm') { blockFn(); forceRefreshState(); return true; }

    // Oma käsi
    if (key === 'g') { blockFn(); readAllCards(getUserHand(), 'My hand');       return true; }
    if (key === 'a') { blockFn(); readSuitCards(getUserHand(), 'S');             return true; }
    if (key === 's') { blockFn(); readSuitCards(getUserHand(), 'H');             return true; }
    if (key === 'd') { blockFn(); readSuitCards(getUserHand(), 'D');             return true; }
    if (key === 'f') { blockFn(); readSuitCards(getUserHand(), 'C');             return true; }

    // Lepääjä
    if (key === 't') {
        blockFn();
        var dt = getDummyHand();
        dt.length === 0 ? speakNow('Dummy not visible.') : readAllCards(dt, 'Dummy');
        return true;
    }
    if (key === 'q') {
        blockFn();
        var dq = getDummyHand();
        if (!dq.length) { speakNow('Dummy not visible.'); return true; }
        readSuitCards(dq, 'S'); return true;
    }
    if (key === 'w') {
        blockFn();
        var dw = getDummyHand();
        if (!dw.length) { speakNow('Dummy not visible.'); return true; }
        readSuitCards(dw, 'H'); return true;
    }
    if (key === 'e') {
        blockFn();
        var de = getDummyHand();
        if (!de.length) { speakNow('Dummy not visible.'); return true; }
        readSuitCards(de, 'D'); return true;
    }
    if (key === 'r') {
        blockFn();
        var dr = getDummyHand();
        if (!dr.length) { speakNow('Dummy not visible.'); return true; }
        readSuitCards(dr, 'C'); return true;
    }

    // Tikki pöydällä
    if (key === 'p') { blockFn(); readCurrentTrick(); return true; }

    // Tarjoushistoria
    if (key === 'b') {
        blockFn();
        var bids = readAllBids();
        if (bids.length === 0) { speakNow('No bids.'); return true; }
        speakNow('Bids: ' + bids.map(function (b) {
            return (RB_POS_TO_EN[b.position] || b.position) + ' ' + b.en;
        }).join(', ') + '.');
        return true;
    }

    // Lauta-info
    if (key === 'x') {
        blockFn();
        var parts = [];
        var vul  = readVulnerability();
        parts.push('Vulnerable: ' + (vul || 'unknown'));
        var ct = readContractDisplay();
        parts.push(ct ? 'Contract: ' + ct : 'No contract yet');
        var turn = getRBWhosTurn();
        if (turn) parts.push('Turn: ' + (RB_POS_TO_EN[turn] || turn));
        speakNow(parts.join('. ') + '.');
        return true;
    }

    // Haavoittuvuus
    if (key === 'v') {
        blockFn();
        speakNow('Vulnerable: ' + (readVulnerability() || 'unknown') + '.');
        return true;
    }

    // Tikkimäärä
    if (key === 'c') { blockFn(); readTrickCount(); return true; }

    // Pelaajien nimet
    if (key === 'n') { blockFn(); readPlayerNames(); return true; }

    return false;
}

// =============================================================
// 21. F2 – SAAVUTETTAVAT KORTTINAPIT (heikkonäköisille)
// =============================================================

var cardButtonMode  = false;
var cardButtonIndex = 0;
var cardButtonList  = [];

var CARD_BUTTON_STYLE = [
    'position:absolute',
    'z-index:99999',
    'top:0','left:0','width:100%','height:100%',
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

var SUIT_SYMBOL = { 'Spade':'♠','Heart':'♥','Diamond':'♦','Club':'♣' };

function buildCardLabel(card) {
    return (SUIT_SYMBOL[card.suit] || card.suit[0]) + '\n' + card.rank;
}
function buildAriaLabel(card, handName) {
    return card.suit + ' ' + card.rank + ', ' + handName;
}

function buildCardButtons() {
    var cardData = [];
    RB_SUIT_ORDER.forEach(function (s) {
        RB_RANK_ORDER.forEach(function (r) {
            var owner = getRBCardOwner(s, r);
            if (owner !== 'main' && owner !== 'dummy' && owner !== 'dec-dummy') return;
            var el = document.getElementById('card_' + s + r);
            if (!el) return;
            cardData.push({
                card:     buildCardObj(s, r),
                el:       el,
                handName: owner === 'main' ? 'Own hand' : 'Dummy'
            });
        });
    });
    return cardData;
}

function activateCardButtonMode() {
    cardButtonMode  = true;
    cardButtonList  = [];
    cardButtonIndex = 0;

    var cardData = buildCardButtons();
    if (cardData.length === 0) {
        cardButtonMode = false;
        speakNow('No cards available.');
        return;
    }

    cardData.forEach(function (item) {
        var overlay = document.createElement('button');
        overlay.setAttribute('type', 'button');
        overlay.setAttribute('role', 'button');
        overlay.setAttribute('tabindex', '0');
        overlay.setAttribute('aria-label', buildAriaLabel(item.card, item.handName));
        overlay.setAttribute('data-rb-card-btn', '1');
        overlay.style.cssText = CARD_BUTTON_STYLE;
        overlay.textContent   = buildCardLabel(item.card);

        overlay.addEventListener('click', function () {
            playCard(item.card.suitLetter, item.card.rank);
            setTimeout(refreshCardButtons, 400);
        });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playCard(item.card.suitLetter, item.card.rank);
                setTimeout(refreshCardButtons, 400);
            }
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveCardFocus(1);  }
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); moveCardFocus(-1); }
            if (e.key === 'F2' || e.key === 'Escape') { e.preventDefault(); deactivateCardButtonMode(); }
        });

        var pos = window.getComputedStyle(item.el).position;
        if (pos === 'static') item.el.style.position = 'relative';
        item.el.appendChild(overlay);
        cardButtonList.push(overlay);
    });

    if (cardButtonList.length === 0) { cardButtonMode = false; speakNow('No cards available.'); return; }
    focusCardButton(0);
    speakNow('Card buttons: ' + cardButtonList.length + ' cards. Arrows to browse, Enter to play, F2 to close.');
}

function refreshCardButtons() {
    if (!cardButtonMode) return;
    var prevIdx = cardButtonIndex;
    document.querySelectorAll('[data-rb-card-btn]').forEach(function (btn) { btn.remove(); });
    cardButtonList  = [];
    cardButtonIndex = 0;

    var cardData = buildCardButtons();
    if (cardData.length === 0) { setTimeout(refreshCardButtons, 600); return; }

    cardData.forEach(function (item) {
        var overlay = document.createElement('button');
        overlay.setAttribute('type', 'button');
        overlay.setAttribute('role', 'button');
        overlay.setAttribute('tabindex', '0');
        overlay.setAttribute('aria-label', buildAriaLabel(item.card, item.handName));
        overlay.setAttribute('data-rb-card-btn', '1');
        overlay.style.cssText = CARD_BUTTON_STYLE;
        overlay.textContent   = buildCardLabel(item.card);

        overlay.addEventListener('click', function () {
            playCard(item.card.suitLetter, item.card.rank);
            setTimeout(refreshCardButtons, 400);
        });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playCard(item.card.suitLetter, item.card.rank);
                setTimeout(refreshCardButtons, 400);
            }
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveCardFocus(1);  }
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); moveCardFocus(-1); }
            if (e.key === 'F2' || e.key === 'Escape') { e.preventDefault(); deactivateCardButtonMode(); }
        });

        var pos = window.getComputedStyle(item.el).position;
        if (pos === 'static') item.el.style.position = 'relative';
        item.el.appendChild(overlay);
        cardButtonList.push(overlay);
    });

    focusCardButton(Math.min(prevIdx, cardButtonList.length - 1));
}

function deactivateCardButtonMode() {
    cardButtonMode = false;
    document.querySelectorAll('[data-rb-card-btn]').forEach(function (btn) { btn.remove(); });
    cardButtonList  = [];
    cardButtonIndex = 0;
    speakNow('Card buttons off.');
}

function focusCardButton(idx) {
    if (cardButtonList.length === 0) return;
    cardButtonIndex = Math.max(0, Math.min(idx, cardButtonList.length - 1));
    cardButtonList.forEach(function (b) { b.style.outline = ''; });
    var btn = cardButtonList[cardButtonIndex];
    btn.style.outline = '4px solid #FFFFFF';
    btn.focus();
}

function moveCardFocus(delta) {
    focusCardButton(cardButtonIndex + delta);
}

// F2-näppäin: korttinapit päälle/pois
document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (cardButtonMode) deactivateCardButtonMode();
        else                activateCardButtonMode();
    }
}, true);

// =============================================================
// 22. PÄÄKUUNTELIJA
// =============================================================

var inputMode = 'cards'; // 'cards' | 'keyboard'

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var key = e.key.toLowerCase();

    function block() {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    // Escape peruuttaa odottavan syötteen
    if (key === 'escape' && pendingInput !== null) {
        block(); cancelPendingInput(); return;
    }

    // Kaksivaiheisen syötteen toinen näppäin
    if (pendingInput !== null) {
        block(); handleSecondKey(key); return;
    }

    // Z – vaihda tila
    if (key === 'z' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        block();
        inputMode = (inputMode === 'cards') ? 'keyboard' : 'cards';
        speakNow(inputMode === 'cards' ? 'Cards mode.' : 'Keyboard mode.');
        return;
    }

    // Alt+näppäin – query-komennot toimivat aina
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        handleQueryKey(key, block);
        return;
    }

    // Nuoli ylös/alas – korkein/matalin kortti (näppäintila, pelivaihe)
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

// =============================================================
// 23. AUTOMAATTINEN SELOSTUS (Narrator) + POLLING
// =============================================================

var prevTrickSnapshot = '';
var prevTrickLen      = 0;
var prevTrickCards    = [];

setInterval(function () {
    updateGamePhase();

    // Tarjousvaiheen seuranta
    if (gamePhase === 'bidding' || gamePhase === 'unknown') {
        var bids = readAllBids();
        if (bids.length > spokenBidCount) {
            for (var i = spokenBidCount; i < bids.length; i++) {
                speak((RB_POS_TO_EN[bids[i].position] || bids[i].position) + ': ' + bids[i].en);
            }
            spokenBidCount = bids.length;
            var c = getContractFromBidHistory(bids);
            if (c && c.strain) cachedContract = c;
        }
    }

    // Pelivaiheen tikkiseuranta
    if (gamePhase === 'play') {
        var trick = getCurrentTrick();
        var snap  = trickSnapshot(trick);

        if (snap !== prevTrickSnapshot) {
            if (trick.length > prevTrickLen && trick.length <= 4) {
                // Uusia kortteja tikissä
                for (var j = prevTrickLen; j < trick.length; j++) {
                    var c2 = trick[j];
                    var who = '';
                    if (activeTurnPosition) {
                        who = (RB_POS_TO_EN[activeTurnPosition] || activeTurnPosition) + ': ';
                        activeTurnPosition = RB_NEXT[activeTurnPosition];
                    }
                    speak(who + c2.suit + ' ' + c2.rank + '.');
                    if (cardButtonMode) setTimeout(refreshCardButtons, 300);
                }
            } else if (trick.length < prevTrickLen && prevTrickLen === 4) {
                // Tikki päättyi (s0–s3 siirtyivät 'played'-tilaan)
                // Laske voittaja edellisestä täydestä tikistä
                if (prevTrickCards.length === 4) {
                    var contract = getOrBuildCachedContract();
                    var trumpSuit = (contract && contract.strain && contract.strain !== 'N')
                                    ? contract.strain : null;
                    // Johtavana pelinviejän jälkeinen pelaaja (tai activeTurnPosition ennen tikkiä)
                    // Emme enää tiedä leadPosia varmasti, käytetään cachedContractia
                    var leadPos = rbDeclarer ? RB_NEXT[rbDeclarer] : null;
                    // Yleensä aktiveTurnPosition on jo nollattu, joten arvataan
                    var winner = evaluateTrickWinner(prevTrickCards, leadPos, trumpSuit);
                    if (winner) {
                        speak((RB_POS_TO_EN[winner] || winner) + ' wins the trick.');
                        activeTurnPosition = winner;
                    }
                }
                if (cardButtonMode) setTimeout(refreshCardButtons, 400);
            }

            prevTrickCards    = trick.slice();
            prevTrickLen      = trick.length;
            prevTrickSnapshot = snap;
        }
    }

    // Uusi lauta?
    var vul = readVulnerability() || '';
    if (vul && vul !== lastAnnouncedBoard) announceBoard();

}, 400);

// =============================================================
// 24. ALUSTUS
// =============================================================

setTimeout(function () {
    updateGamePhase();
    var bids = readAllBids();
    spokenBidCount = bids.length;
    var c = getContractFromBidHistory(bids);
    if (c && c.strain) cachedContract = c;
    if (isPlayPhase()) {
        rbDeclarer = detectDeclarer();
        if (rbDeclarer) activeTurnPosition = RB_NEXT[rbDeclarer];
    }
    speak('RealBridge accessibility loaded. Press Z to switch mode, F2 for card buttons.');
}, 2000);

// =============================================================
// OHJEET KONSOLISSA
// =============================================================
console.log([
    '=== RealBridge Accessibility Extension V1.0 ===',
    '',
    'TILAT (vaihto Z-näppäimellä):',
    '  Z             = Vaihda kortit-tila ↔ näppäintila',
    '  F2            = Saavutettavat korttinapit päälle/pois',
    '                  (nuolet selaa, Enter pelaa, F2/Esc sulkee)',
    '',
    'KORTIT-TILA (oletus) – kysely ilman modifioijaa:',
    '  G             = Oma käsi kokonaan',
    '  A / S / D / F = Omat Padat / Hertat / Ruudut / Ristit',
    '  T             = Lepääjän koko käsi',
    '  Q / W / E / R = Lepääjän Padat / Hertat / Ruudut / Ristit',
    '  P             = Nykyinen tikki pöydällä',
    '  B             = Tarjoushistoria',
    '  X             = Lauta-info (haavoittuvuus, kontratti, vuoro)',
    '  V             = Haavoittuvuus',
    '  C             = Tikkimäärä',
    '  N             = Pelaajien nimet',
    '  M             = Nollaa laajennuksen tila',
    '',
    'NÄPPÄINTILA – tarjoaminen ja pelaaminen:',
    '  Kortti (2 näppäintä):',
    '    1. Maa:  s=Pata  h=Hertta  d=Ruutu  c=Risti',
    '    2. Arvo: a k q j t 9 8 7 6 5 4 3 2',
    '    esim. s → "Spade?" → a → pelataan pata-ässä',
    '  Nopea pelaus:',
    '    Nuoli alas  = Lyö matalin tikin maan kortti',
    '    Nuoli ylös  = Lyö korkein tikin maan kortti',
    '  Tarjous (2 näppäintä):',
    '    1. Taso: 1–7',
    '    2. Maa:  c d h s n',
    '  p = Passi    x = Tupla/Retupla    Esc = Peruuta',
    '',
    'Alt+näppäin toimii query-komentona molemmissa tiloissa.',
    '',
    'Pelaajanimet: You=main, Partner=cho, Left=lho, Right=rho'
].join('\n'));
