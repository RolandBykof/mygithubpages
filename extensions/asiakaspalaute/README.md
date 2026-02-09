# v2.0 - TYÖJONOT + ASIANTUNTIJALLE SIIRTO

## ✅ Kaksi korjausta

### 1. Työjonot-valikko
- Elementti: `li.parent-page > span.ebs-navigation-panel-text`
- Korjaus: `role="button"`, `aria-haspopup`, `aria-expanded`, `tabindex="0"`

### 2. Asiantuntijalle siirto -modaali
- Elementti: `div.create-subaction[data-value='Asiantuntijan käsittely']`
- Ongelma: CSS piilottaa h3-otsikon tekstin ja lisää uuden CSS:llä
- Korjaus: Lisätään h3:een `aria-label="Asiantuntijalle siirto"`

## PÄIVITÄ v2.0

1. `chrome://extensions/`
2. **Reload** (pyöreä nuoli) TAI **Poista ja lataa uudelleen**
3. Versio: **2.0**

## Testaa

1. Avaa sivu
2. Odota 10 sekuntia
3. Loki latautuu automaattisesti
4. Katso loki:

```
SAAVUTETTAVUUSLAAJENNUS v2.0 - FINAL

2. TYÖJONOT-VALIKKO
   Li 1: 'Työjonot'
      ✓ KORJATTU

3. ASIANTUNTIJALLE SIIRTO (dynaamiset modalit)
   Löydettiin: 1 div.create-subaction
   Div 1: data-value='Asiantuntijan käsittely'
      → 'Asiantuntijan käsittely' LÖYTYI!
      ✓ Korjattu h3: aria-label='Asiantuntijalle siirto'
```

## Huomio: Dynaamiset modalit

"Asiantuntijalle siirto" -modaali luodaan vasta kun käyttäjä klikkaa jotain painiketta. Jos loki näyttää **0 div.create-subaction**, modaali ei ole vielä DOM:issa.

Jos haluat varmistaa että modaali korjautuu:
1. Avaa sivu
2. Klikkaa painiketta joka avaa "Asiantuntijalle siirto" -modalin
3. Katso Developer Console (F12)
4. Pitäisi näkyä uusia korjauksia

## Lähetä loki

Avaa **v2.0 loki** ja lähetä se minulle!

Lokin pitää alkaa:
```
SAAVUTETTAVUUSLAAJENNUS v2.0 - FINAL
```
