# LinkedIn Listbox Navigation

Selainlaajennus, joka luo nuolinäppäimillä selattavan luettelonäkymän LinkedIn-syötejulkaisuista. Mahdollistaa nopean navigoinnin julkaisusta toiseen ruudunlukijalla.

## Ominaisuudet

- Avaa kelluvan luettelonäkymän kaikista syötteen julkaisuista
- Nuolinäppäimillä navigointi (ylös/alas)
- Home/End siirtää ensimmäiseen/viimeiseen julkaisuun
- Enter siirtyy valittuun julkaisuun sivulla
- L tykkää valitusta julkaisusta
- Esc sulkee luettelon
- Näyttää julkaisijan nimen, tekstin esikatselun ja ajan
- Koko julkaisun teksti näkyy esikatselupaneelissa
- ARIA-yhteensopiva ruudunlukijoille

## Asennus Chromeen/Edgeen

1. Pura ZIP-tiedosto haluamaasi kansioon
2. Avaa Chrome ja siirry osoitteeseen `chrome://extensions/`
   - Edgessä: `edge://extensions/`
3. Ota käyttöön "Kehittäjätila" (Developer mode) oikeasta yläkulmasta
4. Napsauta "Lataa pakkaamaton" (Load unpacked)
5. Valitse purettu kansio
6. Laajennus on nyt aktiivinen

## Käyttö

### Luettelon avaaminen
- Paina `Alt+L` LinkedIn-syötesivulla

### Navigointi luettelossa
| Näppäin | Toiminto |
|---------|----------|
| ↑ / ↓ | Siirry edelliseen / seuraavaan julkaisuun |
| Home | Siirry ensimmäiseen julkaisuun |
| End | Siirry viimeiseen julkaisuun |
| Enter | Siirry valittuun julkaisuun sivulla |
| L | Tykkää valitusta julkaisusta |
| R | Päivitä luettelo (scrollaa ja kerää uudelleen) |
| Esc | Sulje luettelo |

### Ruudunlukijatuki
Luettelo käyttää ARIA listbox -mallia:
- `role="listbox"` ja `role="option"` -rakenne
- `aria-selected` osoittaa valitun kohteen
- `aria-activedescendant` kertoo aktiivisen vaihtoehdon
- `aria-live="assertive"` ilmoittaa muutokset automaattisesti

NVDA ja JAWS tunnistavat luettelon automaattisesti ja lukevat valinnan muuttuessa julkaisijan nimen, tekstin alun ja sijainnin (esim. "Julkaisu 3 / 12").

## Tekniset tiedot

- Manifest versio: 3
- Toimii osoitteessa linkedin.com/feed
- Ei lähetä dataa ulkoisille palvelimille
- Kerää julkaisut dynaamisesti sivulta

## Versiohistoria

### 2.2
- Parannettu scrollauslogiikka: max 100 scrollausta, 1 sekunnin viive
- Lopetetaan vasta kun 6 peräkkäistä scrollausta ei tuota uusia julkaisuja
- Pienempi scrollaushyppäys (600px) LinkedInin latauksen varmistamiseksi
- Esc-näppäin peruuttaa keräyksen
- Keräys voi kestää ~30 sekuntia, mutta löytää enemmän julkaisuja

### 2.1
- Laajennus scrollaa nyt sivun läpi kerätäkseen kaikki julkaisut
- Näyttää latausilmoituksen keräyksen aikana
- R-näppäin päivittää luettelon
- Duplikaattien esto

### 2.0
- Täysin uudelleenkirjoitettu luettelonäkymä
- ARIA listbox -toteutus
- Nuolinäppäinnavigointi
- Esikatselupaneeli koko tekstillä
- Enter siirtyy julkaisuun
- L tykkää julkaisusta

### 1.1
- Lisätty Alt+L näppäinkomento tykkäämiseen
- H4-otsikko sisältää koko julkaisun tekstin

### 1.0
- Ensimmäinen versio
- H4-otsikot syötejulkaisuille
