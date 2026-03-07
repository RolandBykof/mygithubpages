// =========================================================
// BBO:n Saavutettavuuslaajennus (Ruudunlukijatuki) - V4.0
// =========================================================
// Korjattu versio: Maat tunnistetaan suitPanelClass-rakenteesta,
// pelatut kortit handDiagramCurrentTrickClass-elementeista.
// =========================================================
console.log("BBO Accessibility Extension ladattu (V4 - Rakennekorjattu)!");

// ---------------------------------------------------------
// 1. RUUDUNLUKUOHJELMAN PUHUJA
// ---------------------------------------------------------
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.style.position = 'absolute';
liveRegion.style.left = '-9999px';
document.body.appendChild(liveRegion);

function puhu(teksti) {
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = teksti; }, 50);
}

// ---------------------------------------------------------
// 2. VAKIOT JA APUFUNKTIOT
// ---------------------------------------------------------

// suitPanelClass-elementit ovat kaden sisalla jarjestyksessa:
// indeksi 0 = Risti, 1 = Ruutu, 2 = Hertta, 3 = Pata
const MAAT_JARJESTYKSESSA = ['Risti', 'Ruutu', 'Hertta', 'Pata'];

// Maasymboleista suomenkieliseen nimeen (pelatuille korteille)
const SYMBOLI_MAAKSI = {
    '\u2663': 'Risti',   // club
    '\u2666': 'Ruutu',   // diamond
    '\u2665': 'Hertta',  // heart
    '\u2660': 'Pata'     // spade
};

/**
 * Jasentaa pelatun kortin tekstista maan ja arvon.
 * handDiagramCurrentTrickClass-elementtien innerText sisaltaa
 * maasymbolin ja arvon (esim. symboli + "A" tai symboli + "10").
 */
function jasennaPelattuKortti(teksti) {
    if (!teksti) return null;
    teksti = teksti.replace(/\n/g, '').trim();
    if (teksti.length === 0) return null;
    var symboli = teksti.charAt(0);
    var maa = SYMBOLI_MAAKSI[symboli];
    if (!maa) return null;
    var arvo = teksti.substring(1).trim();
    if (!arvo) return null;
    return { maa: maa, arvo: arvo };
}

// ---------------------------------------------------------
// 3. KASIEN TUNNISTUS (DOM-rakenteen perusteella)
// ---------------------------------------------------------

// BBO:n DOM-rakenne:
//   handDiagramPanelClass (kasi)
//     suitPanelClass [0] = Risti
//       handDiagramCardClass (arvo: "A")
//       handDiagramCardClass (arvo: "K")
//     suitPanelClass [1] = Ruutu
//     suitPanelClass [2] = Hertta
//     suitPanelClass [3] = Pata

function lueKadenKortit(kasiElementti) {
    var kortit = [];
    if (!kasiElementti) return kortit;
    var maaPaneelit = kasiElementti.querySelectorAll('.suitPanelClass');
    for (var i = 0; i < maaPaneelit.length && i < 4; i++) {
        var maa = MAAT_JARJESTYKSESSA[i];
        var kadenKortit = maaPaneelit[i].querySelectorAll('div.handDiagramCardClass');
        for (var j = 0; j < kadenKortit.length; j++) {
            var arvo = kadenKortit[j].innerText.replace(/\n| /g, '').trim();
            if (arvo) {
                kortit.push({ maa: maa, arvo: arvo, elementti: kadenKortit[j] });
            }
        }
    }
    return kortit;
}

/**
 * Tunnistaa pelaajan oman kaden ja lepaajan kaden.
 * BBO nayttaa pelaajan kaden ruudun alalaidassa (suurin offsetTop)
 * ja parin kaden ylalaidassa (pienin offsetTop).
 */
function tunnistaPelaajat() {
    var paneelit = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
    if (paneelit.length === 0) return { oma: null, lepaaja: null };

    // Kerataan jokaisesta paneelista tiedot
    var paneelitiedot = paneelit.map(function(paneeli, idx) {
        return {
            el: paneeli,
            idx: idx,
            top: paneeli.getBoundingClientRect().top,
            kortit: lueKadenKortit(paneeli)
        };
    });

    // Lajitellaan getBoundingClientRect().top mukaan (luotettavampi kuin offsetTop)
    paneelitiedot.sort(function(a, b) { return a.top - b.top; });

    // Oma kasi = alin paneeli jossa on kortteja
    var oma = null;
    for (var i = paneelitiedot.length - 1; i >= 0; i--) {
        if (paneelitiedot[i].kortit.length > 0) {
            oma = paneelitiedot[i];
            break;
        }
    }

    // Lepaaja = muu paneeli jossa on kortteja (ei oma)
    var lepaaja = null;
    if (oma) {
        for (var j = 0; j < paneelitiedot.length; j++) {
            if (paneelitiedot[j] === oma) continue;
            if (paneelitiedot[j].kortit.length > 0) {
                lepaaja = paneelitiedot[j];
                break;
            }
        }
    }

    console.log("tunnistaPelaajat: paneeleja=" + paneelit.length +
        ", oma idx=" + (oma ? oma.idx : "null") + " top=" + (oma ? oma.top : "null") + " kortteja=" + (oma ? oma.kortit.length : 0) +
        ", lepaaja idx=" + (lepaaja ? lepaaja.idx : "null") + " top=" + (lepaaja ? lepaaja.top : "null") + " kortteja=" + (lepaaja ? lepaaja.kortit.length : 0));

    return {
        oma: oma ? oma.el : null,
        lepaaja: lepaaja ? lepaaja.el : null
    };
}

/**
 * Lukee poydassa olevat pelatut kortit (nykyinen tikki).
 * handDiagramCurrentTrickClass-elementteja on 4 (S, W, N, E).
 */
function luePelatutKortit() {
    var pelatut = [];
    var elementit = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    elementit.forEach(function(el) {
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var tulos = jasennaPelattuKortti(el.innerText);
            if (tulos) pelatut.push(tulos);
        }
    });
    return pelatut;
}

// ---------------------------------------------------------
// 4. KORTTIEN SAAVUTETTAVUUSATTRIBUUTIT
// ---------------------------------------------------------

function paivitaKorttienSaavutettavuus() {
    var paneelit = document.querySelectorAll('div.handDiagramPanelClass');
    paneelit.forEach(function(paneeli) {
        var maaPaneelit = paneeli.querySelectorAll('.suitPanelClass');
        for (var i = 0; i < maaPaneelit.length && i < 4; i++) {
            var maa = MAAT_JARJESTYKSESSA[i];
            var kortit = maaPaneelit[i].querySelectorAll('div.handDiagramCardClass');
            kortit.forEach(function(kortti) {
                var arvo = kortti.innerText.replace(/\n| /g, '').trim();
                if (arvo) {
                    kortti.setAttribute('aria-label', maa + ' ' + arvo);
                    kortti.setAttribute('role', 'button');
                    if (!kortti.hasAttribute('tabindex')) {
                        kortti.setAttribute('tabindex', '0');
                    }
                }
            });
            // Piilotetaan maasymboli-elementit ruudunlukijalta
            maaPaneelit[i].querySelectorAll('.suitSymbolClass').forEach(function(sym) {
                sym.setAttribute('aria-hidden', 'true');
            });
        }
    });

    // Paivitetaan pelattujen korttien saavutettavuus
    var pelatutElementit = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    pelatutElementit.forEach(function(el) {
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var tulos = jasennaPelattuKortti(el.innerText);
            if (tulos) {
                el.setAttribute('aria-label', tulos.maa + ' ' + tulos.arvo);
            }
        }
    });
}

// ---------------------------------------------------------
// 5. PIKANAPPAIMET JA LUKU
// ---------------------------------------------------------

function lueKorttilistaMaasta(kortit, haettavaMaa, kenenNimi) {
    var maanKortit = kortit
        .filter(function(k) { return k.maa === haettavaMaa; })
        .map(function(k) { return k.arvo; });
    if (maanKortit.length > 0) {
        puhu(kenenNimi + ' ' + haettavaMaa + ': ' + maanKortit.join(', '));
    } else {
        puhu(kenenNimi + ', ei kortteja maassa ' + haettavaMaa + '.');
    }
}

function lueKaikkiKortit(kortit, kenenNimi) {
    if (kortit.length === 0) {
        puhu(kenenNimi + ': kortteja ei ole nakyvissa.');
        return;
    }
    // Bridgen perinteinen jarjestys: Pata, Hertta, Ruutu, Risti
    var jarjestys = ['Pata', 'Hertta', 'Ruutu', 'Risti'];
    var osat = [];
    jarjestys.forEach(function(maa) {
        var maanKortit = kortit
            .filter(function(k) { return k.maa === maa; })
            .map(function(k) { return k.arvo; });
        if (maanKortit.length > 0) {
            osat.push(maa + ': ' + maanKortit.join(', '));
        }
    });
    puhu(kenenNimi + ': ' + osat.join('. '));
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var avain = e.key.toLowerCase();

    // ALT-KOMENNOT: Yksittaisten maiden luku
    if (e.altKey) {
        var pelaajat = tunnistaPelaajat();

        // OMAT KORTIT (Alt + A=Pata, S=Hertta, D=Ruutu, F=Risti)
        if (avain === 'a') { e.preventDefault(); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Pata', 'Oma'); return; }
        if (avain === 's') { e.preventDefault(); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Hertta', 'Oma'); return; }
        if (avain === 'd') { e.preventDefault(); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Ruutu', 'Oma'); return; }
        if (avain === 'f') { e.preventDefault(); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Risti', 'Oma'); return; }

        // DEBUG (Alt + I): Puhuu paneelien tunnistustiedot
        if (avain === 'i') {
            e.preventDefault();
            var paneelit2 = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
            var info = 'Paneeleja: ' + paneelit2.length + '. ';
            paneelit2.forEach(function(p, idx) {
                var maaPaneelit = p.querySelectorAll('.suitPanelClass');
                var kortteja = p.querySelectorAll('div.handDiagramCardClass');
                var tekstilla = 0;
                kortteja.forEach(function(k) {
                    if (k.innerText.replace(/\n| /g, '').trim()) tekstilla++;
                });
                info += 'Paneeli ' + idx + ': top=' + Math.round(p.getBoundingClientRect().top) +
                    ', suitPanels=' + maaPaneelit.length +
                    ', kortteja=' + kortteja.length +
                    ', tekstilla=' + tekstilla + '. ';
            });
            info += 'Oma: ' + (pelaajat.oma ? 'loydetty' : 'null') + '. ';
            info += 'Lepaaja: ' + (pelaajat.lepaaja ? 'loydetty' : 'null') + '. ';
            if (pelaajat.lepaaja) {
                var lepKortit = lueKadenKortit(pelaajat.lepaaja);
                info += 'Lepaajan kortteja: ' + lepKortit.length;
            }
            puhu(info);
            console.log(info);
            return;
        }

        // LEPAAJAN KORTIT (Alt + Q=Pata, W=Hertta, E=Ruutu, R=Risti)
        if (avain === 'q') {
            e.preventDefault();
            if (!pelaajat.lepaaja) { puhu('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Pata', 'Lepaaja');
            return;
        }
        if (avain === 'w') {
            e.preventDefault();
            if (!pelaajat.lepaaja) { puhu('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Hertta', 'Lepaaja');
            return;
        }
        if (avain === 'e') {
            e.preventDefault();
            if (!pelaajat.lepaaja) { puhu('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Ruutu', 'Lepaaja');
            return;
        }
        if (avain === 'r') {
            e.preventDefault();
            if (!pelaajat.lepaaja) { puhu('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Risti', 'Lepaaja');
            return;
        }
    }

    // ENTER TAI VALILYONTI (Kortin pelaaminen)
    if ((avain === 'enter' || avain === ' ') && e.target.getAttribute('role') === 'button') {
        e.preventDefault();
        e.target.click();
        puhu('Pelattiin ' + (e.target.getAttribute('aria-label') || 'valittu kortti'));
        return;
    }

    // O-NAPPAIN: KAIKKI OMAT KORTIT
    if (avain === 'o' && !e.altKey && !e.ctrlKey) {
        var pelaajatO = tunnistaPelaajat();
        lueKaikkiKortit(lueKadenKortit(pelaajatO.oma), 'Omat kortit');
    }

    // L-NAPPAIN: KAIKKI LEPAAJAN KORTIT
    if (avain === 'l' && !e.altKey && !e.ctrlKey) {
        var pelaajatL = tunnistaPelaajat();
        if (!pelaajatL.lepaaja) {
            puhu('Lepaajan kortteja ei ole nakyvissa.');
            return;
        }
        lueKaikkiKortit(lueKadenKortit(pelaajatL.lepaaja), 'Lepaajan kortit');
    }

    // P-NAPPAIN: POYDASSA PELATUT KORTIT (nykyinen tikki)
    if (avain === 'p' && !e.altKey && !e.ctrlKey) {
        var pelatut = luePelatutKortit();
        if (pelatut.length === 0) {
            puhu('Poydassa ei ole kortteja.');
        } else {
            var teksti = pelatut.map(function(k) { return k.maa + ' ' + k.arvo; }).join(', ');
            puhu('Poydassa: ' + teksti);
        }
    }
});

// ---------------------------------------------------------
// 6. TARKKAILIJA (MutationObserver)
// ---------------------------------------------------------
var paivitysAjastin = null;
var edellinenPelattuKorttiMaara = 0;

var peliTarkkailija = new MutationObserver(function(mutations) {
    var tarvitseePaivityksen = false;
    var tarkistaPelatut = false;

    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && (
                        node.classList.contains('handDiagramCardClass') ||
                        node.classList.contains('suitPanelClass') ||
                        node.classList.contains('handDiagramPanelClass')
                    )) {
                        tarvitseePaivityksen = true;
                    }
                    if (node.classList && node.classList.contains('auction-box-cell')) {
                        var tarjous = node.innerText.trim();
                        if (tarjous) puhu('Tarjous: ' + tarjous);
                    }
                }
            });
        }

        // Pelattujen korttien muutokset
        if (mutation.target && mutation.target.classList &&
            mutation.target.classList.contains('handDiagramCurrentTrickClass')) {
            tarkistaPelatut = true;
        }
        // Subtree-muutokset pelatuissa korteissa
        var kohde = mutation.target;
        while (kohde) {
            if (kohde.classList && kohde.classList.contains('handDiagramCurrentTrickClass')) {
                tarkistaPelatut = true;
                break;
            }
            kohde = kohde.parentElement;
        }
    });

    if (tarvitseePaivityksen) {
        if (paivitysAjastin) clearTimeout(paivitysAjastin);
        paivitysAjastin = setTimeout(paivitaKorttienSaavutettavuus, 800);
    }

    if (tarkistaPelatut) {
        setTimeout(function() {
            var pelatut = luePelatutKortit();
            if (pelatut.length > 0 && pelatut.length !== edellinenPelattuKorttiMaara) {
                var viimeisin = pelatut[pelatut.length - 1];
                puhu('Pelattu: ' + viimeisin.maa + ' ' + viimeisin.arvo);
                edellinenPelattuKorttiMaara = pelatut.length;
            }
            if (pelatut.length === 0) {
                edellinenPelattuKorttiMaara = 0;
            }
        }, 200);
    }
});

peliTarkkailija.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// Alkupaivitys kun sivu on ladattu
setTimeout(paivitaKorttienSaavutettavuus, 2000);
