/**
 * LinkedIn Listbox Navigation v2.0
 * Luo nuolinäppäimillä selattavan luettelonäkymän LinkedIn-julkaisuista
 */

(function() {
  'use strict';

  // Globaalit muuttujat
  let listboxPanel = null;
  let isListboxOpen = false;
  let posts = [];
  let currentIndex = 0;
  let loadingCancelled = false;
  let stopAndShow = false;

  /**
   * Etsii julkaisijan nimen
   */
  function getAuthorName(postElement) {
    const authorSpan = postElement.querySelector('.update-components-actor__title span span[aria-hidden="true"]');
    if (authorSpan && authorSpan.textContent.trim()) {
      return authorSpan.textContent.trim();
    }
    const hiddenSpan = postElement.querySelector('.update-components-actor__title .visually-hidden');
    if (hiddenSpan && hiddenSpan.textContent.trim()) {
      return hiddenSpan.textContent.trim();
    }
    return 'Tuntematon';
  }

  /**
   * Etsii julkaisun ajan
   */
  function getPostTime(postElement) {
    const timeSpan = postElement.querySelector('.update-components-actor__sub-description span[aria-hidden="true"]');
    if (timeSpan) {
      const text = timeSpan.textContent.trim();
      const match = text.match(/^[\d\w\s]+/);
      return match ? match[0].trim() : text;
    }
    return '';
  }

  /**
   * Etsii julkaisun koko tekstisisällön
   */
  function getPostText(postElement) {
    const textContainer = postElement.querySelector('.update-components-text .tvm-parent-container > span');
    if (textContainer) {
      let text = textContainer.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    }
    const breakWords = postElement.querySelector('.break-words.tvm-parent-container > span');
    if (breakWords && breakWords.textContent) {
      let text = breakWords.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    }
    return 'Ei tekstisisältöä';
  }

  /**
   * Lyhentää tekstin esikatselua varten
   */
  function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '…';
  }

  /**
   * Kerää kaikki julkaisut sivulta (nykyinen DOM)
   */
  function collectCurrentPosts() {
    const postElements = document.querySelectorAll('.feed-shared-update-v2[role="article"]');
    const seenTexts = new Set();
    posts = [];

    postElements.forEach((element) => {
      const text = getPostText(element);
      const author = getAuthorName(element);
      const key = author + ':' + text.substring(0, 50);
      
      // Vältä duplikaatit
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        posts.push({
          id: posts.length,
          element: element,
          author: author,
          time: getPostTime(element),
          text: text,
          preview: truncateText(text, 100)
        });
      }
    });

    return posts;
  }

  /**
   * Scrollaa sivun läpi ja kerää kaikki julkaisut
   */
  async function collectAllPosts(statusCallback) {
    posts = [];
    const seenTexts = new Set();
    let lastCount = 0;
    let noNewPostsCount = 0;
    const maxScrolls = 100; // Nostettu reilusti - 50 julkaisua vaatii paljon scrollausta
    const maxNoNewPosts = 6; // Lopetetaan vasta kun 6 peräkkäistä scrollausta ei tuota uusia
    let scrollCount = 0;
    loadingCancelled = false;
    stopAndShow = false;

    // Scrollaa ylös ensin
    window.scrollTo(0, 0);
    await sleep(500);

    while (scrollCount < maxScrolls && noNewPostsCount < maxNoNewPosts && !loadingCancelled) {
      // Kerää nykyiset julkaisut
      const postElements = document.querySelectorAll('.feed-shared-update-v2[role="article"]');
      
      postElements.forEach((element) => {
        const text = getPostText(element);
        const author = getAuthorName(element);
        const key = author + ':' + text.substring(0, 50);
        
        if (!seenTexts.has(key)) {
          seenTexts.add(key);
          posts.push({
            id: posts.length,
            element: element,
            author: author,
            time: getPostTime(element),
            text: text,
            preview: truncateText(text, 100)
          });
        }
      });

      if (statusCallback) {
        statusCallback(`${posts.length}`);
      }

      // Tarkista löytyikö uusia
      if (posts.length === lastCount) {
        noNewPostsCount++;
      } else {
        noNewPostsCount = 0;
      }
      lastCount = posts.length;

      // Scrollaa alaspäin - pienempi hyppäys, jotta LinkedIn ehtii ladata
      window.scrollBy(0, 600);
      scrollCount++;
      
      // Odota että LinkedIn lataa lisää - pidempi aika
      await sleep(1000);
    }

    // Scrollaa takaisin ylös
    window.scrollTo(0, 0);
    
    // Poista Esc-kuuntelija
    document.removeEventListener('keydown', handleLoadingEscape);
    
    return posts;
  }

  /**
   * Apufunktio viiveelle
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Escapoi HTML-merkit
   */
  function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Luo listbox-paneelin HTML:n
   */
  function createListboxHTML() {
    const optionsHTML = posts.map((post, index) => `
      <div role="option" 
           id="linkedin-post-option-${index}" 
           data-index="${index}"
           aria-selected="${index === 0 ? 'true' : 'false'}"
           class="linkedin-listbox-option">
        <div class="linkedin-option-author">${escapeHTML(post.author)}</div>
        <div class="linkedin-option-preview">${escapeHTML(post.preview)}</div>
        <div class="linkedin-option-time">${escapeHTML(post.time)}</div>
      </div>
    `).join('');

    return `
      <div class="linkedin-listbox-container" role="dialog" aria-label="LinkedIn-julkaisujen luettelo" aria-modal="true">
        <div class="linkedin-listbox-header">
          <h2 id="linkedin-listbox-title">LinkedIn-julkaisut (${posts.length} kpl)</h2>
          <div class="linkedin-listbox-instructions">
            Nuolet: navigoi | Enter: siirry | L: tykkää | R: päivitä | Esc: sulje
          </div>
        </div>
        <div id="linkedin-listbox" 
             role="listbox" 
             tabindex="0" 
             aria-labelledby="linkedin-listbox-title"
             aria-activedescendant="linkedin-post-option-0">
          ${optionsHTML}
        </div>
        <div id="linkedin-listbox-announcements" aria-live="assertive" class="sr-only"></div>
        <div class="linkedin-listbox-preview" id="linkedin-preview-panel">
          <div class="linkedin-preview-header">
            <span class="linkedin-preview-author"></span>
            <span class="linkedin-preview-time"></span>
          </div>
          <div class="linkedin-preview-text"></div>
        </div>
        <button class="linkedin-listbox-close" aria-label="Sulje luettelo">×</button>
      </div>
    `;
  }

  /**
   * Lisää tyylit
   */
  function injectStyles() {
    if (document.getElementById('linkedin-listbox-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'linkedin-listbox-styles';
    styles.textContent = `
      .linkedin-listbox-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 900px;
        height: 80vh;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      }

      .linkedin-listbox-header {
        background: #0a66c2;
        color: white;
        padding: 16px 20px;
        border-radius: 12px 12px 0 0;
      }

      .linkedin-listbox-header h2 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .linkedin-listbox-instructions {
        font-size: 13px;
        opacity: 0.9;
      }

      #linkedin-listbox {
        flex: 1;
        overflow-y: auto;
        outline: none;
        border-bottom: 1px solid #e0e0e0;
      }

      #linkedin-listbox:focus {
        outline: none;
      }

      .linkedin-listbox-option {
        padding: 14px 20px;
        border-bottom: 1px solid #e8e8e8;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      .linkedin-listbox-option:hover {
        background-color: #f3f6f8;
      }

      .linkedin-listbox-option[aria-selected="true"] {
        background-color: #0a66c2;
        color: white;
      }

      .linkedin-listbox-option[aria-selected="true"] .linkedin-option-preview,
      .linkedin-listbox-option[aria-selected="true"] .linkedin-option-time {
        color: rgba(255,255,255,0.9);
      }

      .linkedin-option-author {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .linkedin-option-preview {
        font-size: 13px;
        color: #666;
        margin-bottom: 4px;
        line-height: 1.4;
      }

      .linkedin-option-time {
        font-size: 12px;
        color: #888;
      }

      .linkedin-listbox-preview {
        padding: 16px 20px;
        max-height: 200px;
        overflow-y: auto;
        background: #f8f9fa;
        border-radius: 0 0 12px 12px;
      }

      .linkedin-preview-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }

      .linkedin-preview-author {
        font-weight: 600;
        color: #333;
      }

      .linkedin-preview-time {
        color: #666;
        font-size: 13px;
      }

      .linkedin-preview-text {
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .linkedin-listbox-close {
        position: absolute;
        top: 12px;
        right: 16px;
        background: transparent;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
      }

      .linkedin-listbox-close:hover {
        opacity: 0.8;
      }

      .linkedin-listbox-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        border: 0;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Näyttää esikatselun valitusta julkaisusta
   */
  function showPreview(index) {
    const post = posts[index];
    if (!post) return;

    const previewPanel = document.getElementById('linkedin-preview-panel');
    if (!previewPanel) return;

    previewPanel.querySelector('.linkedin-preview-author').textContent = post.author;
    previewPanel.querySelector('.linkedin-preview-time').textContent = post.time;
    previewPanel.querySelector('.linkedin-preview-text').textContent = post.text;
  }

  /**
   * Ilmoittaa ruudunlukijalle
   */
  function announce(message) {
    const announcer = document.getElementById('linkedin-listbox-announcements');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = message;
      }, 50);
    }
  }

  /**
   * Päivittää valinnan
   */
  function updateSelection(newIndex) {
    const listbox = document.getElementById('linkedin-listbox');
    const options = listbox.querySelectorAll('[role="option"]');

    if (newIndex < 0 || newIndex >= options.length) return;

    // Poista edellinen valinta
    options[currentIndex].setAttribute('aria-selected', 'false');

    // Uusi valinta
    options[newIndex].setAttribute('aria-selected', 'true');
    options[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    listbox.setAttribute('aria-activedescendant', `linkedin-post-option-${newIndex}`);

    currentIndex = newIndex;

    // Näytä esikatselu
    showPreview(currentIndex);

    // Ilmoita ruudunlukijalle
    const post = posts[currentIndex];
    announce(`${post.author}: ${post.preview}. Julkaisu ${currentIndex + 1} / ${posts.length}`);
  }

  /**
   * Siirtyy valittuun julkaisuun sivulla
   */
  function goToPost(index) {
    const post = posts[index];
    if (!post || !post.element) return;

    closeListbox();

    // Scrollaa julkaisuun
    post.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Fokusoi julkaisu
    post.element.setAttribute('tabindex', '-1');
    setTimeout(() => {
      post.element.focus();
    }, 300);
  }

  /**
   * Tykkää valitusta julkaisusta
   */
  function likePost(index) {
    const post = posts[index];
    if (!post || !post.element) return false;

    const likeButton = post.element.querySelector('button.react-button__trigger[aria-label*="tykkäys"], button.react-button__trigger[aria-label*="Reagoi"]');
    
    if (!likeButton) {
      announce('Tykkäysnappia ei löytynyt');
      return false;
    }

    likeButton.click();
    announce(`Tykätty: ${post.author}`);
    return true;
  }

  /**
   * Käsittelee näppäinpainallukset listboxissa
   */
  function handleListboxKeydown(event) {
    const options = document.querySelectorAll('#linkedin-listbox [role="option"]');
    let newIndex = currentIndex;

    switch(event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, options.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = options.length - 1;
        break;
      case 'Enter':
        event.preventDefault();
        goToPost(currentIndex);
        return;
      case 'Escape':
        event.preventDefault();
        closeListbox();
        return;
      case 'l':
      case 'L':
        event.preventDefault();
        likePost(currentIndex);
        return;
      case 'r':
      case 'R':
        event.preventDefault();
        refreshList();
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      updateSelection(newIndex);
    }
  }

  /**
   * Näyttää latausilmoituksen
   */
  function showLoadingOverlay() {
    injectStyles();
    
    const overlay = document.createElement('div');
    overlay.className = 'linkedin-listbox-overlay';
    overlay.id = 'linkedin-listbox-overlay';
    document.body.appendChild(overlay);

    const loading = document.createElement('div');
    loading.id = 'linkedin-loading-panel';
    loading.innerHTML = `
      <div class="linkedin-listbox-container" role="alert" aria-live="polite" style="height: auto; padding: 40px; text-align: center;">
        <h2 id="linkedin-loading-status" aria-atomic="true">0</h2>
      </div>
    `;
    document.body.appendChild(loading);

    // Lisää Esc-kuuntelija peruutukseen
    document.addEventListener('keydown', handleLoadingEscape);
  }

  function handleLoadingEscape(event) {
    if (event.key === 'Escape') {
      loadingCancelled = true;
      stopAndShow = false;
      document.removeEventListener('keydown', handleLoadingEscape);
    }
    // Alt+S: lopeta kerääminen ja näytä kerätyt julkaisut
    if (event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      event.stopPropagation();
      loadingCancelled = true;
      stopAndShow = true;
      document.removeEventListener('keydown', handleLoadingEscape);
    }
  }

  /**
   * Päivittää latausilmoituksen tekstin
   */
  function updateLoadingStatus(text) {
    const status = document.getElementById('linkedin-loading-status');
    if (status) {
      status.textContent = text;
    }
  }

  /**
   * Poistaa latausilmoituksen
   */
  function hideLoadingOverlay() {
    const overlay = document.getElementById('linkedin-listbox-overlay');
    if (overlay) overlay.remove();
    const loading = document.getElementById('linkedin-loading-panel');
    if (loading) loading.remove();
  }

  /**
   * Avaa listbox-näkymän
   */
  async function openListbox() {
    if (isListboxOpen) {
      closeListbox();
      return;
    }

    // Näytä latausilmoitus
    showLoadingOverlay();

    // Kerää julkaisut scrollaamalla
    await collectAllPosts(updateLoadingStatus);

    // Poista latausilmoitus
    hideLoadingOverlay();

    if (loadingCancelled && !stopAndShow) {
      window.scrollTo(0, 0);
      return;
    }

    if (posts.length === 0) {
      alert('Ei julkaisuja löytynyt. Varmista, että olet LinkedIn-syötesivulla.');
      return;
    }

    injectStyles();

    // Luo overlay
    const overlay = document.createElement('div');
    overlay.className = 'linkedin-listbox-overlay';
    overlay.id = 'linkedin-listbox-overlay';
    overlay.addEventListener('click', closeListbox);
    document.body.appendChild(overlay);

    // Luo paneeli
    listboxPanel = document.createElement('div');
    listboxPanel.id = 'linkedin-listbox-panel';
    listboxPanel.innerHTML = createListboxHTML();
    document.body.appendChild(listboxPanel);

    // Lisää tapahtumakuuntelijat
    const listbox = document.getElementById('linkedin-listbox');
    listbox.addEventListener('keydown', handleListboxKeydown);

    const closeBtn = listboxPanel.querySelector('.linkedin-listbox-close');
    closeBtn.addEventListener('click', closeListbox);

    // Klikkaus vaihtoehdolla
    const options = listbox.querySelectorAll('[role="option"]');
    options.forEach((option, index) => {
      option.addEventListener('click', () => {
        updateSelection(index);
      });
      option.addEventListener('dblclick', () => {
        goToPost(index);
      });
    });

    isListboxOpen = true;
    currentIndex = 0;

    // Fokusoi listbox ja näytä ensimmäinen
    setTimeout(() => {
      listbox.focus();
      showPreview(0);
      announce(`${posts.length} julkaisua`);
    }, 100);
  }

  /**
   * Sulkee listbox-näkymän
   */
  function closeListbox() {
    if (!isListboxOpen) return;

    const overlay = document.getElementById('linkedin-listbox-overlay');
    if (overlay) overlay.remove();

    if (listboxPanel) {
      listboxPanel.remove();
      listboxPanel = null;
    }

    isListboxOpen = false;
  }

  /**
   * Päivittää luettelon (kerää julkaisut uudelleen)
   */
  async function refreshList() {
    closeListbox();
    await openListbox();
  }

  /**
   * Rekisteröi pääpikanäppäimet
   */
  function registerGlobalShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Alt+L = avaa/sulje listbox
      if (event.altKey && event.key.toLowerCase() === 'l' && !isListboxOpen) {
        event.preventDefault();
        event.stopPropagation();
        openListbox();
      }
    }, true);

    console.log('LinkedIn Listbox: Paina Alt+L avataksesi julkaisuluettelon. Alt+S pysäyttää keräämisen ja näyttää tulokset.');
  }

  /**
   * Alustus
   */
  function init() {
    console.log('LinkedIn Listbox Navigation v2.0: Käynnistetään...');
    registerGlobalShortcuts();
    console.log('LinkedIn Listbox Navigation: Valmis.');
  }

  // Käynnistä
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
