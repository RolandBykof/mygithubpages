let isCopying = false;
let bookText = "";

// Kuunnellaan F2-näppäimen painallusta
document.addEventListener("keydown", async (event) => {
    if (event.key === "F2") {
        isCopying = !isCopying; // Vaihdetaan tilaa (päälle/pois)
        
        if (isCopying) {
            console.log("Kopiointi aloitettu.");
            bookText = ""; // Nollataan teksti uutta aloitusta varten
            await startCopying();
        } else {
            console.log("Kopiointi keskeytetty F2-näppäimellä.");
            downloadText(bookText);
        }
    }
});

async function startCopying() {
    while (isCopying) {
        let pageText = "";
        
        // 1. Haetaan iframet, joiden sisällä kirjan teksti on[cite: 1]
        const iframes = document.querySelectorAll('iframe.readium-navigator-iframe');
        
        for (let iframe of iframes) {
            try {
                // Yritetään lukea iframen sisältö. 
                // Tämä onnistuu vain, jos sisältö tulee samasta alkuperästä (same-origin policy).
                if (iframe.contentDocument && iframe.contentDocument.body) {
                    const text = iframe.contentDocument.body.innerText.trim();
                    if (text) {
                        pageText += text + "\n\n";
                    }
                }
            } catch (e) {
                console.warn("Iframe-sisältöön ei päästy käsiksi tietoturvarajoituksen vuoksi.");
            }
        }

        if (pageText) {
            bookText += pageText + "\n---\n";
        }

        // 2. Tarkistetaan, ollaanko lopussa. Etsitään edistymistä osoittava elementti[cite: 1].
        const progressDiv = document.querySelector('div[aria-label="Current progression"]');
        if (progressDiv && progressDiv.innerText.includes("100%")) {
            console.log("Kirja luettu 100%!");
            isCopying = false;
            downloadText(bookText);
            break;
        }

        // 3. Etsitään ja painetaan "Go forward" -painiketta seuraavalle sivulle siirtymiseksi[cite: 1].
        const forwardButton = document.querySelector('button[aria-label="Go forward"]');
        if (forwardButton) {
            forwardButton.click();
        } else {
            console.log("Seuraava-painiketta ei löytynyt. Lopetetaan kopiointi.");
            isCopying = false;
            downloadText(bookText);
            break;
        }

        // 4. Odotetaan hetki, että seuraava sivu ehtii latautua iframeen. (1500 millisekuntia)
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

// Funktio, joka lataa kopioidun tekstin tiedostona selaimeen asennettuun latauskansioon.
function downloadText(text) {
    if (!text) {
        console.log("Ei kopioitavaa tekstiä ladattavaksi.");
        return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kirjan_teksti.txt"; // Tiedoston nimi
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Tekstitiedosto ladattu.");
}