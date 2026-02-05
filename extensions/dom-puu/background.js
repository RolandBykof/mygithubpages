chrome.commands.onCommand.addListener((command) => {
  if (command === "download-markdown") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: convertAndDownloadDOM
        });
      }
    });
  }
});

function convertAndDownloadDOM() {
  function getElementData(el, depth = 0) {
    if (!el || !el.tagName) return "";
    
    // Ohitetaan turhat tagit
    const ignore = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'HEAD', 'META', 'LINK'];
    if (ignore.includes(el.tagName)) return "";

    const indent = "  ".repeat(depth);
    const tag = el.tagName.toLowerCase();
    
    // ID ja luokat
    const id = el.id ? `#${el.id}` : "";
    let classes = "";
    if (el.classList && el.classList.length > 0) {
      classes = "." + Array.from(el.classList).join(".");
    }
    
    // Kerätään tärkeät attribuutit
    const importantAttrs = ['role', 'aria-label', 'aria-labelledby', 'aria-describedby', 
                           'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-checked',
                           'href', 'src', 'alt', 'title', 'type', 'name', 'placeholder',
                           'data-testid', 'tabindex'];
    let attrs = [];
    for (let attr of importantAttrs) {
      if (el.hasAttribute(attr)) {
        let value = el.getAttribute(attr);
        // Lyhennetään pitkät arvot
        if (value && value.length > 50) {
          value = value.substring(0, 50) + "...";
        }
        attrs.push(`${attr}="${value}"`);
      }
    }
    const attrStr = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";
    
    // Kerätään tekstisisältö vain suorista tekstinodeista (ei lapsista)
    let directText = "";
    for (let node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text.length > 0) {
          // Lyhennetään pitkät tekstit
          const truncated = text.length > 100 ? text.substring(0, 100) + "..." : text;
          directText += truncated + " ";
        }
      }
    }
    directText = directText.trim();

    // Muotoillaan rivi
    let textPart = directText ? ` "${directText}"` : "";
    let info = `${indent}- <${tag}${id}${classes}>${attrStr}${textPart}\n`;

    // Käydään lapset läpi rekursiivisesti
    for (let child of el.children) {
      info += getElementData(child, depth + 1);
    }

    return info;
  }

  // Tarkistetaan että body on olemassa
  if (!document.body) {
    alert("DOM ei ole vielä latautunut!");
    return;
  }

  // Kerätään sivun perustiedot
  const pageTitle = document.title || "Ei otsikkoa";
  const pageUrl = window.location.href;
  const lang = document.documentElement.lang || "ei määritelty";
  
  let markdownContent = `# DOM-analyysi\n\n`;
  markdownContent += `**Sivu:** ${pageTitle}\n`;
  markdownContent += `**URL:** ${pageUrl}\n`;
  markdownContent += `**Kieli:** ${lang}\n`;
  markdownContent += `**Aika:** ${new Date().toLocaleString('fi-FI')}\n\n`;
  markdownContent += `## Sivun rakenne\n\n`;
  markdownContent += getElementData(document.body);
  
  // Tiedoston lataus
  const blob = new Blob([markdownContent], { type: 'text/markdown; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dom_analyysi_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
