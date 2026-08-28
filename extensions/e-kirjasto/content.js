let isCopying = false;
let bookText = "";

document.addEventListener("keydown", async (event) => {
    if (event.key === "F2") {
        isCopying = !isCopying;
        
        if (isCopying) {
            console.log("Kopiointi aloitettu...");
            bookText = ""; 
            await startCopying();
        } else {
            console.log("Kopiointi keskeytetty.");
            downloadText(bookText);
        }
    }
});

async function startCopying() {
    let lastChapterId = ""; // Käytetään tunnistamaan luvun alku

    while (isCopying) {
        let currentChapterText = "";
        
        const iframes = document.querySelectorAll('iframe.readium-navigator-iframe');
        
        for (let iframe of iframes) {
            try {
                if (iframe.contentDocument && iframe.contentDocument.body) {
                    // innerText hakee näkyvän tekstin ja säilyttää rivivaihdot
                    const text = iframe.contentDocument.body.innerText.trim();
                    if (text) {
                        currentChapterText += text + "\n\n";
                    }
                }
            } catch (e) {
                console.warn("Iframe-sisältöön ei päästy käsiksi.");
            }
        }

        currentChapterText = currentChapterText.trim();

        // LUODAAN TUNNISTE VERTAILUA VARTEN: 
        // Poistetaan kaikki välilyönnit ja rivivaihdot, ja otetaan 100 ensimmäistä merkkiä.
        // Näin pienet asettelu- tai whitespace-muutokset eivät aiheuta turhia tuplakopiointeja.
        let currentId = currentChapterText.replace(/\s+/g, '').substring(0, 100);

        // TARKISTUS: Onko tekstiä ja poikkeaako sen alku edellisestä?
        if (currentChapterText !== "" && currentId !== lastChapterId) {
            console.log("Uusi luku/sivu löydetty ja kopioitu!");
            bookText += currentChapterText + "\n\n--- UUSI LUKU ---\n\n";
            lastChapterId = currentId; // Päivitetään tunniste
        }

        // Tarkistetaan, ollaanko lopussa
        const progressDiv = document.querySelector('div[aria-label="Current progression"]');
        if (progressDiv && progressDiv.innerText.includes("100%")) {
            console.log("Kirja luettu 100%!");
            isCopying = false;
            downloadText(bookText);
            break;
        }

        // Klikataan "Go forward"
        const forwardButton = document.querySelector('button[aria-label="Go forward"]');
        if (forwardButton) {
            forwardButton.click();
        } else {
            console.log("Seuraava-painiketta ei löytynyt. Lopetetaan.");
            isCopying = false;
            downloadText(bookText);
            break;
        }

        // PIDENNETTY ODOTUSAIKA: 
        // 1500 ms (1.5 sekuntia) antaa selaimelle ja lukusovellukselle oikeasti aikaa 
        // ladata uusi sivu ja päivittää iframe ennen seuraavaa lukukertaa.
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

function downloadText(text) {
    if (!text) {
        console.log("Ei kopioitavaa tekstiä.");
        return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kirjan_teksti_kokonaisena.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Tiedosto ladattu!");
}