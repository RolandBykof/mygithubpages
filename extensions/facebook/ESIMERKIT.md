# Esimerkkejä h5-otsikoista

## Miltä otsikot kuulostavat ruudunlukijalla?

Kun painat **5**-näppäintä NVDA:lla tai JAWS:illa, kuulet seuraavankaltaisia otsikoita:

### Esimerkki 1: Tavallinen julkaisu
**Otsikko:** "Ostin Temusta ja säästin. Täällä hifistellään liitosten paremmuudesta..."
**Hyöty:** Näet heti että kyseessä on julkaisu ostokokemuksesta

### Esimerkki 2: Uutisjulkaisu
**Otsikko:** "Tapasin tänään EU:n ulko- ja turvallisuuspolitiikan korkean edustajan..."
**Hyöty:** Tiedät että kyseessä on poliittinen tapaaminen

### Esimerkki 3: Mainos
**Otsikko:** "Brittisarjojen parhaimmisto on täällä! BritBox ja BBC Nordic+ ovat..."
**Hyöty:** Tunnista mainokset heti

### Esimerkki 4: Kysymys
**Otsikko:** "Onko kenelläkään kokemusta tästä tuotteesta? Harkitsen ostamista..."
**Hyöty:** Näet että kyseessä on kysymys jossa voit auttaa

### Esimerkki 5: Tapahtumakutsu
**Otsikko:** "Tervetuloa huomenna klo 18 järjestämäämme konserttiin! Liput..."
**Hyöty:** Huomaat tapahtumakutsun välittömästi

## Navigointikulku NVDA:lla

Kuvitellaan että Facebook-syötteessä on 3 julkaisua:

```
[Paina 5]
→ NVDA: "Tason 5 otsikko: Ostin Temusta ja säästin. Täällä hifistellään..."

[Paina 5 uudelleen]
→ NVDA: "Tason 5 otsikko: Tapasin tänään EU:n ulko- ja turvallisuuspolitiikan..."

[Paina 5 uudelleen]
→ NVDA: "Tason 5 otsikko: Brittisarjojen parhaimmisto on täällä! BritBox ja..."

[Paina Shift+5]
→ NVDA: "Tason 5 otsikko: Tapasin tänään EU:n ulko- ja turvallisuuspolitiikan..."
(takaisin edelliseen)
```

**HUOM v1.2:** Nyt saat VAIN yhden otsikon per julkaisu - ei enää tekijän nimiä tai aikaleimoja!

## Vertailu: Ilman laajennusta vs. Laajennuksen kanssa

### ILMAN LAAJENNUSTA:

1. Paina nuoli-alas
2. Kuuntele julkaisun tekijä
3. Kuuntele julkaisuaika
4. Kuuntele mahdolliset tagit
5. Kuuntele toimintopainikkeet
6. VIHDOIN: Kuuntele julkaisun teksti
7. Jos ei kiinnosta → Toista vaiheet 1-6 seuraavalle julkaisulle

**Aika:** ~15-30 sekuntia per julkaisu selataksesi läpi 3 julkaisua
**Yhteensä:** 45-90 sekuntia

### LAAJENNUKSEN KANSSA:

1. Paina 5 (siirtyy julkaisuun)
2. Kuuntele julkaisun teksti suoraan otsikosta
3. Jos kiinnostaa → Paina Enter lukeaksesi koko julkaisun
4. Jos ei → Paina 5 uudelleen siirtyäksesi seuraavaan

**Aika:** ~2-5 sekuntia per julkaisu selataksesi läpi 3 julkaisua
**Yhteensä:** 6-15 sekuntia

**SÄÄSTÄT:** 39-75 sekuntia! ⚡

## Otsikkolistan käyttö (Insert+F7 NVDA:ssa)

Voit myös avata kaikki otsikot listana:

```
1. Paina Insert+F7
2. Valitse "Otsikot"
3. Suodata taso 5 -otsikoilla
4. Näet listan:
   - Ostin Temusta ja säästin...
   - Tapasin tänään EU:n ulko-...
   - Brittisarjojen parhaimmisto...
   - Onko kenelläkään kokemusta...
5. Valitse nuolinäppäimillä mielenkiintoinen
6. Paina Enter → Siirtyy suoraan siihen julkaisuun!
```

## Miten otsikon pituus määräytyy?

Laajennus ottaa julkaisutekstistä:
- **Maksimi:** 80 merkkiä
- **Katkaisee:** Viimeisestä kokonaisesta sanasta
- **Lisää:** "..." jos teksti katkaistiin

### Esimerkki katkaisusta:

**Alkuperäinen teksti (120 merkkiä):**
"Kävin tänään lääkärissä ja sain hyvät uutiset! Kaikki testi tulokset olivat normaaleja ja voin jatkaa harrastuksiani normaalisti."

**Otsikko (80 merkkiä):**
"Kävin tänään lääkärissä ja sain hyvät uutiset! Kaikki testi tulokset..."

Huomaa: 
- Ei katkea kesken sanan ("tulok..." ❌)
- Katkaisee kokonaisten sanojen jälkeen ("tulokset..." ✅)
- Lisää "..." merkiksi että tekstiä jatkuu

## Erityistapaukset

### Lyhyet julkaisut (alle 80 merkkiä):
**Teksti:** "Hyvää huomenta kaikille! ☀️"
**Otsikko:** "Hyvää huomenta kaikille! ☀️"
(Ei "..." koska teksti on lyhyt)

### Pelkkä emoji:
**Teksti:** "🎉🎊🎈"
**Otsikko:** "🎉🎊🎈"

### "Näytä lisää" -teksti:
**Teksti:** "Tämä on pitkä tarina... Näytä lisää"
**Otsikko:** "Tämä on pitkä tarina..."
(Laajennus poistaa "Näytä lisää" automaattisesti)

---

**Vinkki:** Kokeile itse! Mene Facebookiin ja paina 5 useita kertoja.
Huomaat kuinka nopeasti löydät mielenkiintoiset julkaisut!
