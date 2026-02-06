# Asennusohje - Facebook Accessibility Headers

## Pikaohjeet

### Chrome/Edge/Brave/Opera:
1. Pura ZIP-tiedosto
2. Mene: `chrome://extensions/`
3. Ota "Kehittäjätila" käyttöön
4. "Lataa paketoitu laajennus" → Valitse kansio
5. Mene Facebookiin ja testaa!

### Firefox:
1. Pura ZIP-tiedosto
2. Mene: `about:debugging#/runtime/this-firefox`
3. "Lataa väliaikainen lisäosa" → Valitse manifest.json
4. Mene Facebookiin ja testaa!

---

## Yksityiskohtainen asennusohje

### Google Chrome

**Vaihe 1: Lataa ja pura tiedostot**
1. Lataa `facebook-accessibility-headers.zip`
2. Pura ZIP johonkin pysyvään paikkaan (esim. `C:\Ohjelmat\facebook-accessibility-headers\`)
3. **ÄLÄ POISTA** tätä kansiota asennuksen jälkeen!

**Vaihe 2: Avaa laajennussivu**
1. Avaa Chrome
2. Kirjoita osoitekenttään: `chrome://extensions/`
3. Paina Enter

**Vaihe 3: Ota kehittäjätila käyttöön**
1. Etsi oikeasta yläkulmasta kytkin "Developer mode" / "Kehittäjätila"
2. Klikkaa sitä päälle (sininen)

**Vaihe 4: Lataa laajennus**
1. Klikkaa "Load unpacked" / "Lataa paketoitu laajennus"
2. Selaa kansioon johon purit ZIP:n
3. Valitse `facebook-accessibility-headers` -kansio
4. Klikkaa "Valitse kansio" / "Select Folder"

**Vaihe 5: Tarkista asennus**
1. Näet laajennuksen listalla: "Facebook Accessibility Headers"
2. Tarkista että se on päällä (sininen kytkin)
3. Avaa uusi välilehti ja mene: https://www.facebook.com

**Vaihe 6: Testaa**
1. Facebookin etusivulla, avaa selaimen konsoli (paina F12)
2. Mene "Console"-välilehdelle
3. Näet tekstit:
   - "Facebook Accessibility Headers: Alustetaan..."
   - "Facebook A11y: Käsitelty X julkaisutekstiä"
4. Käynnistä NVDA tai JAWS
5. Paina **H**-näppäintä siirtyäksesi otsikoista toiseen
6. Paina **5**-näppäintä siirtyäksesi vain julkaisuteksteihin
7. Ruudunlukija lukee julkaisun tekstin alun (esim. "Olin tänään ostoksilla...")

---

### Microsoft Edge

Edge käyttää samaa moottoria kuin Chrome, joten ohjeet ovat identtiset:

1. Kirjoita osoitekenttään: `edge://extensions/`
2. Jatka Chromen ohjeilla kohdasta "Vaihe 3"

---

### Mozilla Firefox

**Vaihe 1: Lataa ja pura tiedostot**
1. Lataa `facebook-accessibility-headers.zip`
2. Pura ZIP johonkin paikkaan
3. Huomaa: Firefoxissa laajennus on väliaikainen ja poistuu selaimen sulkemisen yhteydessä

**Vaihe 2: Avaa debugging-sivu**
1. Avaa Firefox
2. Kirjoita osoitekenttään: `about:debugging#/runtime/this-firefox`
3. Paina Enter

**Vaihe 3: Lataa laajennus**
1. Klikkaa "Lataa väliaikainen lisäosa" / "Load Temporary Add-on"
2. Selaa kansioon johon purit ZIP:n
3. Valitse `manifest.json` -tiedosto
4. Klikkaa "Avaa" / "Open"

**Vaihe 4: Tarkista ja testaa**
1. Näet laajennuksen listalla
2. Avaa uusi välilehti: https://www.facebook.com
3. Testaa H-näppäimellä

**Huom Firefox:** Laajennus poistuu kun suljet Firefoxin. Joudut lataamaan sen uudelleen joka kerta. Pysyvää asennusta varten laajennus pitää julkaista Mozilla Add-ons -palvelussa.

---

### Brave Browser

Brave käyttää samaa moottoria kuin Chrome:

1. Kirjoita osoitekenttään: `brave://extensions/`
2. Jatka Chromen ohjeilla kohdasta "Vaihe 3"

---

### Opera

Opera käyttää samaa moottoria kuin Chrome:

1. Kirjoita osoitekenttään: `opera://extensions/`
2. Jatka Chromen ohjeilla kohdasta "Vaihe 3"

---

## Käyttöönotto NVDA:lla

**Perustesti:**
1. Avaa Facebook.com
2. Käynnistä NVDA (Ctrl+Alt+N)
3. Odota että sivu latautuu kokonaan
4. Paina **H** siirtyäksesi seuraavaan otsikkoon
5. Paina **5** siirtyäksesi seuraavaan tason 5 otsikkoon (julkaisuun)

**Navigointikomennot:**
- **H** = Seuraava otsikko (kaikki tasot)
- **Shift+H** = Edellinen otsikko
- **5** = Seuraava tason 5 otsikko (vain julkaisut)
- **Shift+5** = Edellinen tason 5 otsikko
- **Insert+F7** = Elementtilista → Valitse "Otsikot" (näet kaikki julkaisut)

---

## Käyttöönotto JAWS:illa

**Perustesti:**
1. Avaa Facebook.com
2. Käynnistä JAWS
3. Odota että sivu latautuu
4. Paina **H** siirtyäksesi seuraavaan otsikkoon
5. Paina **5** siirtyäksesi julkaisuun

**Navigointikomennot:**
- **H** = Seuraava otsikko
- **Shift+H** = Edellinen otsikko  
- **5** = Seuraava tason 5 otsikko (julkaisut)
- **Shift+5** = Edellinen tason 5 otsikko
- **Insert+F6** = Otsikkolista (näet kaikki otsikot)

---

## Yleisimmät ongelmat

### "En näe laajennusta extensions-sivulla"

**Ratkaisu:**
- Varmista että purit ZIP:n oikein
- Tarkista että valitsit KANSION, et yksittäistä tiedostoa
- Kokeile purkaa ZIP uudelleen toiseen paikkaan

### "Laajennus on harmaana / disabled"

**Ratkaisu:**
- Klikkaa laajennuksen vieressä olevaa kytkintä
- Tarkista että "Kehittäjätila" on päällä
- Poista laajennus ja asenna uudelleen

### "Konsoli näyttää virheitä"

**Ratkaisu:**
- Ota kuvakaappaus virheestä
- Tarkista että kaikki tiedostot ovat kansiossa
- Kokeila päivittää sivu (F5)

### "Ruudunlukija ei löydä otsikoita"

**Ratkaisu:**
- Odota 5-10 sekuntia sivun latauksen jälkeen
- Tarkista konsolista: "Käsitelty X julkaisutekstiä"
- Varmista että painat **H** (ei nuolinäppäimiä)
- Päivitä sivu (F5)

### "Otsikot näkyvät sivulla (ei haluttu)"

**Ratkaisu:**
1. Avaa `styles.css` tekstieditorilla
2. Tarkista että `.fb-accessibility-heading` käyttää "screen reader only" -tyyliä
3. Jos vaihtoehtoinen tyyli on käytössä, kommentoi se pois
4. Tallenna ja päivitä Facebook-sivu

---

## Tekninen tuki

### Debug-tiedot:

Kun pyydät apua, lähetä seuraavat tiedot:

1. **Selain ja versio:** (esim. Chrome 120.0.6099.109)
2. **Ruudunlukija:** (esim. NVDA 2023.3)
3. **Konsolin viestit:** (Avaa F12 → Console, kopioi viestit)
4. **Mitä tapahtuu:** (Kuvaile ongelma)

### Konsolin avaaminen:

- **Chrome/Edge/Brave/Opera:** Paina F12 tai Ctrl+Shift+I
- **Firefox:** Paina F12 tai Ctrl+Shift+K

---

## Lisätietoja

- README.md: Yleistietoa laajennuksesta
- GitHub: [tuleva linkki]
- Palaute: [tuleva sähköposti]

---

**Versio:** 1.0  
**Päivitetty:** 6.2.2026
