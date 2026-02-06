# PIKAOPAS - Facebook Accessibility Headers

## 🚀 Nopea aloitus (5 minuuttia)

### 1. Lataa ja pura
- Pura `facebook-accessibility-headers.zip` 
- Älä poista kansiota myöhemmin!

### 2. Asenna selaimeen

**Chrome / Edge / Brave:**
```
1. Mene: chrome://extensions/
2. Ota "Kehittäjätila" päälle (oikea ylänurkka)
3. "Lataa paketoitu laajennus" → Valitse kansio
4. Valmis!
```

**Firefox:**
```
1. Mene: about:debugging#/runtime/this-firefox
2. "Lataa väliaikainen lisäosa" → Valitse manifest.json
3. Valmis! (Huom: poistuu selaimen sulkemisen jälkeen)
```

### 3. Testaa Facebookissa

1. Mene: https://www.facebook.com
2. Käynnistä NVDA tai JAWS
3. Paina **H** → Siirtyy otsikoista toiseen
4. Paina **5** → Siirtyy vain julkaisuteksteihin
5. Ruudunlukija lukee julkaisun tekstin alun, esim. "Olin tänään ostoksilla..."

## 🎯 Näppäinkomennot

### NVDA & JAWS:
- **H** = Seuraava otsikko
- **Shift+H** = Edellinen otsikko
- **5** = Seuraava julkaisu (taso 5 otsikko)
- **Shift+5** = Edellinen julkaisu
- **Insert+F7** (NVDA) = Otsikkolista
- **Insert+F6** (JAWS) = Otsikkolista

## ✅ Tarkista että toimii

1. Avaa Facebook
2. Paina F12 (avaa konsoli)
3. Etsi viesti: "Facebook A11y: Käsitelty X julkaisutekstiä"
4. Jos näet tämän → Toimii!
5. Jos et → Päivitä sivu (F5)

## ❓ Ongelma?

**Ei toimi:**
- Odota 5 sekuntia sivun latauksen jälkeen
- Päivitä sivu (F5)
- Tarkista että laajennus on päällä

**Otsikot näkyvät sivulla:**
- Muokkaa `styles.css` → Poista kommentit "screen reader only" -tyylistä

**Ei löydä otsikoita:**
- Varmista että painat **H** (ei nuolinäppäimiä)
- Tarkista konsoli (F12) → Pitäisi näkyä "Käsitelty X julkaisutekstiä"

## 📚 Lisätietoja

- **ASENNUSOHJE.md** = Yksityiskohtaiset ohjeet
- **README.md** = Tekninen dokumentaatio

---

**Vinkki:** Jos haluat nähdä otsikot myös visuaalisesti (testaus), 
muokkaa `styles.css` ja poista kommentit vaihtoehtoisesta tyylistä.

**Hyödyllistä:** Paina Insert+F7 (NVDA) nähdäksesi kaikki julkaisut listana!
