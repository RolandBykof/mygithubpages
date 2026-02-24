chrome.commands.onCommand.addListener((command) => {
  const queryOptions = { active: true, currentWindow: true };
  
  chrome.tabs.query(queryOptions, (tabs) => {
    if (!tabs[0]) return;

    let delayTime = 0;
    if (command === "delayed-freeze") {
      delayTime = 10000; 
    }

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      args: [delayTime],
      function: convertAndDownloadDOM,
      world: 'MAIN'
    });
  });
});

function convertAndDownloadDOM(delay) {
  const performCapture = () => {
    const focusedEl = document.activeElement;
    const hoveredEls = Array.from(document.querySelectorAll(':hover'));

    function getElementData(el, depth = 0) {
      if (!el || !el.tagName) return "";
      
      // MUUTOS 1: Poistettu 'IFRAME' ignore-listalta, jotta se huomataan.
      const ignore = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'DIV#dom-freeze-timer', 'DIV#freeze-overlay'];
      if (ignore.includes(el.tagName) || el.id === 'dom-freeze-timer' || el.id === 'freeze-overlay') return "";
  
      const indent = "  ".repeat(depth);
      const tag = el.tagName.toLowerCase();
      
      const id = el.id ? `#${el.id}` : "";
      let classes = "";
      if (el.classList && el.classList.length > 0) {
        classes = "." + Array.from(el.classList).join(".");
      }
      
      const importantAttrs = ['role', 'aria-label', 'aria-labelledby', 'aria-describedby', 
                             'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-checked',
                             'aria-owns', 'aria-controls',
                             'href', 'src', 'alt', 'title', 'type', 'name', 'placeholder',
                             'data-testid', 'tabindex'];
      let attrs = [];
      for (let attr of importantAttrs) {
        if (el.hasAttribute(attr)) {
          let value = el.getAttribute(attr);
          if (value && value.length > 300) {
            value = value.substring(0, 300) + "...";
          }
          attrs.push(`${attr}="${value}"`);
        }
      }
      const attrStr = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";

      // MUUTOS 2: Pysäytetään iframen käsittely tähän, jotta sen sisältöä ei yritetä lukea.
      // Kirjataan ylös vain sen olemassaolo ja attribuutit (esim. src ja title).
      if (tag === 'iframe') {
        return `${indent}- <iframe${id}${classes}>${attrStr} **[HUOM: IFRAME LÖYDETTY - SISÄLTÖÄ EI LUETA]**\n`;
      }
      
      let directText = "";
      for (let node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text.length > 0) {
            const truncated = text.length > 100 ? text.substring(0, 100) + "..." : text;
            directText += truncated + " ";
          }
        }
      }
      directText = directText.trim();
      let textPart = directText ? ` "${directText}"` : "";

      let statusTags = "";
      if (el === focusedEl) statusTags += " **[FOKUS]**"; 
      if (hoveredEls.includes(el) && el === hoveredEls[hoveredEls.length - 1]) statusTags += " **[HIIRI]**";

      let info = `${indent}- <${tag}${id}${classes}>${attrStr}${textPart}${statusTags}\n`;
  
      // Luetaan normaalit lapset (Light DOM)
      for (let child of el.children) {
        info += getElementData(child, depth + 1);
      }

      // Luetaan Shadow DOM
      if (el.shadowRoot) {
        info += `${indent}  [SHADOW-ROOT]\n`;
        for (let child of el.shadowRoot.children) {
          info += getElementData(child, depth + 2);
        }
      }
  
      return info;
    }
  
    if (!document.body) {
      alert("DOM ei ole vielä latautunut!");
      return;
    }
  
    const pageTitle = document.title || "Ei otsikkoa";
    const pageUrl = window.location.href;
    
    let markdownContent = `# DOM-analyysi\n\n`;
    markdownContent += `**Sivu:** ${pageTitle}\n`;
    markdownContent += `**URL:** ${pageUrl}\n`;
    markdownContent += `**Aika:** ${new Date().toLocaleString('fi-FI')}\n`;
    
    if (document.activeElement) {
       let activeTag = document.activeElement.tagName.toLowerCase();
       let activeId = document.activeElement.id ? "#" + document.activeElement.id : "";
       markdownContent += `**Aktiivinen fokus:** <${activeTag}${activeId}>\n`;
    }
    
    markdownContent += `\n## Sivun rakenne\n\n`;
    markdownContent += getElementData(document.body);
    
    const blob = new Blob([markdownContent], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dom_analyysi_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!delay || delay <= 0) {
    performCapture();
    return;
  }

  // --- AJASTIN JA JÄÄDYTYS ---
  const timerDiv = document.createElement('div');
  timerDiv.id = 'dom-freeze-timer';
  timerDiv.style.cssText = `
    position: fixed; top: 10px; right: 10px; 
    background: red; color: white; font-size: 20px; font-weight: bold; 
    padding: 15px; z-index: 2147483647; border-radius: 5px; 
    box-shadow: 0 0 10px rgba(0,0,0,0.5); pointer-events: none;
  `;
  document.body.appendChild(timerDiv);

  let secondsLeft = delay / 1000;
  timerDiv.innerText = `Jäädytys: ${secondsLeft} s`;

  const interval = setInterval(() => {
    secondsLeft--;
    timerDiv.innerText = `Jäädytys: ${secondsLeft} s`;

    if (secondsLeft <= 0) {
      clearInterval(interval);
      timerDiv.remove();
      
      performCapture();

      const overlay = document.createElement('div');
      overlay.id = 'freeze-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(255, 0, 0, 0.1); 
        z-index: 2147483647; 
        cursor: not-allowed;
        display: flex; justify-content: center; align-items: center;
        color: red; font-size: 30px; font-weight: bold; text-shadow: 1px 1px 2px black;
      `;
      overlay.innerText = "SIVU JÄÄDYTETTY (F8 jatkaa)";
      document.body.appendChild(overlay);

      setTimeout(() => {
        debugger; 
      }, 50);
    }
  }, 1000);
}