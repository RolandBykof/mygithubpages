# IntoBridge Esteettömyyslaajennus

NVDA-ruudunlukijatuki IntoBridge-bridgepelisivustolle
(play.intobridge.com)

---

## Tiedostot

```
intobridge-extension/
├── manifest.json   – laajennuksen kuvaus ja asetukset
├── content.js      – pääskripti (esteettömyyslogiikka)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Asennus Chromeen (kehittäjätila)

1. Avaa Chrome ja mene osoitteeseen `chrome://extensions`
2. Ota **Kehittäjätila** (Developer mode) käyttöön oikeasta yläkulmasta
3. Klikkaa **Lataa pakkaamaton laajennus** (Load unpacked)
4. Valitse `intobridge-extension`-kansio
5. Laajennus ilmestyy listaan nimellä "IntoBridge Esteettömyyslaajennus"

Avaa seuraavaksi IntoBridge-pöytä (`play.intobridge.com/table/...`).
Laajennus käynnistyy automaattisesti ja ilmoittaa NVDA:lle:
> "Jako X. [haavoittuvuus]. Jakaja [suunta]."

---

## Asennus Firefoxiin (kehittäjätila)

1. Avaa Firefox ja mene osoitteeseen `about:debugging`
2. Valitse **This Firefox**
3. Klikkaa **Load Temporary Add-on…**
4. Valitse `intobridge-extension/manifest.json`

Huom: Firefox-väliaikaisasennus poistetaan selaimen sulkemisen yhteydessä.
Pysyvää asennusta varten laajennus on allekirjoitettava tai käytettävä
Firefox Developer Edition / Nightly -versiota.

---

## Näppäinkomennot

Kaikki komennot: **Alt + kirjain**

### Oma käsi
| Näppäin | Toiminto |
|---------|----------|
| Alt+O   | Kaikki omat kortit |
| Alt+A   | Omat **padat** |
| Alt+S   | Omat **hertat** |
| Alt+D   | Omat **ruudut** |
| Alt+F   | Omat **ristit** |

### Lepokäsi
| Näppäin | Toiminto |
|---------|----------|
| Alt+L   | Lepokäsi kokonaan |
| Alt+Q   | Lepokäden **padat** |
| Alt+W   | Lepokäden **hertat** |
| Alt+E   | Lepokäden **ruudut** |
| Alt+R   | Lepokäden **ristit** |

### Pelitilanne
| Näppäin | Toiminto |
|---------|----------|
| Alt+P   | Pöydällä olevat kortit (nykytemppu) |
| Alt+B   | Tarjoushistoria |
| Alt+X   | Jako-info: numero, haavoittuvuus, jakaja, sopimus |
| Alt+V   | Haavoittuvuus |
| Alt+T   | Temppuluku / pisteet |
| Alt+N   | Pelaajien nimet ja suunnat |

### Muut
| Näppäin | Toiminto |
|---------|----------|
| Alt+G   | Lataa virheloki (debug-tiedosto) |

---

## Automaattiset ilmoitukset

- **Uusi jako alkaa** → jako-numero, haavoittuvuus, jakaja
- **Uusi tarjous** → suunta suomeksi + tarjous (esim. "Itä: 2 SA")
- **Kortti pelattu** → ilmoitetaan kun kortti poistuu omasta kädestä
- **Modaalidialogi** → autofokus ja sisällön lukeminen NVDA:lle

---

## Vianetsintä

Jos laajennus ei toimi oikein:

1. Paina **Alt+G** ladataksesi virhelokin (intobridge_debug_xxx.txt)
2. Avaa loki tekstieditorissa
3. Tarkista aikarivit — merkintöjä pitäisi näkyä pelin edetessä

Yleisiä syitä ongelmiin:
- **Tarjoukset eivät puhu**: IntoBridge saattaa käyttää eri CSS-luokkia
  päivitysten jälkeen. Tarkista virheloki ja ilmoita versio.
- **Kortit eivät puhu**: Varmista että #bottom-seat löytyy DOM:sta
  (tarkistettavissa Chromen DevTools → Inspector).
- **Jako-numero ei lue**: `#vulnerability-wrapper` ei löydy tai rakenne muuttunut.

---

## Tekniset tiedot

- Manifest V3 (Chrome/Edge) yhteensopiva
- Ei tarvitse palvelinyhteyksiä — toimii täysin paikallisesti
- Ei kerää eikä lähetä tietoja
- Testattu: Chrome, NVDA

---

## Versiohistoria

| Versio | Muutokset |
|--------|-----------|
| 1.0    | Ensimmäinen julkaisu. Kortit, tarjoukset, jako-info, modaalituki. |
