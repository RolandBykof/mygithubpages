# 🔥 VERSIO 1.2 - KRIITTINEN KORJAUS

## Ongelma v1.1:ssä

Painoit **5** ja sait kolme otsikkoa per julkaisu:
1. ❌ "Jaana Argillander" (tekijän nimi - ei haluttu)
2. ❌ "2 pv jaettu seuraaville Jaanan kaverit" (aikaleima - ei haluttu)
3. ✅ "Jolin hammassyöpymäsairaus rajusti edennyt..." (teksti - HALUTTU!)

**Ongelma:** Jouduit painamaan 5:ttä kolme kertaa per julkaisu!

---

## Ratkaisu v1.2:ssä

Painat **5** ja saat yhden otsikon per julkaisu:
1. ✅ "Jolin hammassyöpymäsairaus rajusti edennyt..." (VAIN teksti!)

**Ratkaisu:** Painat 5:ttä kerran → Seuraava julkaisu!

---

## Mitä korjattiin?

### 1. Tekstin vähimmäispituus: 20 merkkiä
- Nimet ovat yleensä 5-20 merkkiä → Suodatetaan pois ✓

### 2. Ei otsikoita otsikkoelementeistä (h1-h6)
- Tekijän nimi on usein h3-elementissä → Suodatetaan pois ✓

### 3. Ei ajantietoja
- "2 pv", "15 min", "1 viikko sitten" → Suodatetaan pois ✓

### 4. Ei jako-infoa
- "jaettu seuraaville", "julkinen", "kaverit" → Suodatetaan pois ✓

### 5. Vain yksi otsikko per article-elementti
- Vaikka löytyisi useita tekstejä → Lisätään vain ensimmäinen ✓

---

## Testaa heti!

```
1. Asenna v1.2 (poista vanha ensin!)
2. Mene Facebookiin
3. Paina 5, 5, 5, 5...
4. Jokainen painallus = uusi julkaisu
5. Ei väli-otsikoita! 🎉
```

---

## Ennen vs. Jälkeen

### ENNEN (v1.1):
```
5 → "Jaana Argillander"
5 → "2 pv jaettu..."
5 → "Jolin hammassyöpymä..." ← Vasta tässä varsinainen teksti!
5 → "Matti Virtanen"
5 → "15 min julkinen"
5 → "Brittisarjojen..." ← Vasta tässä varsinainen teksti!
```
**6 painallusta, 2 julkaisua**

### JÄLKEEN (v1.2):
```
5 → "Jolin hammassyöpymä..." ← Teksti heti!
5 → "Brittisarjojen..." ← Teksti heti!
5 → "Tapasin tänään EU..." ← Teksti heti!
```
**3 painallusta, 3 julkaisua**

---

## Päivitys v1.1 → v1.2

**TÄRKEÄÄ: Poista vanha ensin!**

### Chrome/Edge/Brave:
1. `chrome://extensions/` → Poista vanha
2. Pura uusi ZIP
3. "Lataa paketoitu laajennus"

### Firefox:
1. `about:debugging` → Poista vanha
2. Pura uusi ZIP
3. "Lataa väliaikainen lisäosa"

---

**Versio:** 1.2  
**Julkaistu:** 6.2.2026  
**Päivitys v1.1:stä:** PAKOLLINEN - Korjaa kriittisen ongelman!
