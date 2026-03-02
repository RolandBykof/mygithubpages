/**
 * LinkedIn Tree Navigation v3.0
 * Puunäkymä: julkaisut päätasolla, kommentit alatasolla
 * Ylä/alas: sisaruksien välillä, oikea: avaa kommentit, vasen: takaisin julkaisuun
 */

(function() {
  'use strict';

  // Globaalit muuttujat
  let treePanel = null;
  let isTreeOpen = false;
  let posts = [];
  let currentPostIndex = 0;
  let currentCommentIndex = -1; // -1 = ollaan julkaisutasolla
  let loadingCancelled = false;
  let stopAndShow = false;
  let isHelpOpen = false;

  // ===================== TIEDON KERUU =====================

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

  function getPostTime(postElement) {
    const timeSpan = postElement.querySelector('.update-components-actor__sub-description span[aria-hidden="true"]');
    if (timeSpan) {
      const text = timeSpan.textContent.trim();
      const match = text.match(/^[\d\w\s]+/);
      return match ? match[0].trim() : text;
    }
    return '';
  }

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
   * Kerää kommentit julkaisun DOM-elementistä
   */
  function getComments(postElement) {
    const comments = [];
    const commentElements = postElement.querySelectorAll('.comments-comment-item, .comments-comment-entity, article.comments-comment-item');
    
    commentElements.forEach((commentEl) => {
      let author = 'Tuntematon';
      
      // LinkedIn: kirjoittajan nimi on linkissä, jonka luokka sisältää
      // 'comments-comment-meta__description-container', aria-label muodossa
      // "Näkymä: Nimi Title, kuvaus" tai "View: Name Title, description"
      const metaLink = commentEl.querySelector('a[class*="comments-comment-meta__description-container"]');
      if (metaLink) {
        const ariaLabel = metaLink.getAttribute('aria-label') || '';
        if (ariaLabel) {
          // Poista "Näkymä: " tai "View: " alusta
          let name = ariaLabel.replace(/^(Näkymä|View)\s*:\s*/i, '');
          // Ota osa ennen ensimmäistä pilkkua
          const commaIndex = name.indexOf(',');
          if (commaIndex > 0) {
            name = name.substring(0, commaIndex);
          }
          // Poista tunnetut LinkedIn-tagit lopusta
          name = name.replace(/\s+(Author|Creator|Influencer|3rd\+?|2nd|1st)$/gi, '').trim();
          if (name) {
            author = name;
          }
        }
      }
      
      // Fallback: vanha selektori
      if (author === 'Tuntematon') {
        const commentAuthor = commentEl.querySelector(
          '.comments-post-meta__name-text span[aria-hidden="true"], ' +
          '.comments-comment-item__post-meta span[aria-hidden="true"], ' +
          '.comments-post-meta__name-text .visually-hidden'
        );
        if (commentAuthor && commentAuthor.textContent.trim()) {
          author = commentAuthor.textContent.trim();
        }
      }

      let text = '';
      const commentText = commentEl.querySelector(
        '.update-components-text, ' +
        '.comments-comment-item__main-content, ' +
        '.comments-comment-item-content-body .update-components-text, ' +
        '.comments-comment-item__inline-show-more-text'
      );
      if (commentText) {
        text = commentText.textContent.replace(/\s+/g, ' ').trim();
      }

      let time = '';
      const commentTime = commentEl.querySelector('.comments-comment-item__timestamp, time');
      if (commentTime) {
        time = commentTime.textContent.replace(/\s+/g, ' ').trim();
      }

      if (text) {
        comments.push({
          author: author,
          text: text,
          time: time,
          element: commentEl
        });
      }
    });

    return comments;
  }

  function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '…';
  }

  // ===================== JULKAISUJEN KERÄÄMINEN =====================

  async function collectAllPosts(statusCallback) {
    posts = [];
    const seenTexts = new Set();
    let lastCount = 0;
    let noNewPostsCount = 0;
    const maxScrolls = 100;
    const maxNoNewPosts = 6;
    let scrollCount = 0;
    loadingCancelled = false;
    stopAndShow = false;

    window.scrollTo(0, 0);
    await sleep(500);

    while (scrollCount < maxScrolls && noNewPostsCount < maxNoNewPosts && !loadingCancelled) {
      const postElements = document.querySelectorAll('.feed-shared-update-v2[role="article"]');
      
      postElements.forEach((element) => {
        // Ohita mainostetut julkaisut
        const metaDiv = element.querySelector('.update-components-actor__meta');
        if (metaDiv) {
          const metaText = (metaDiv.textContent || '').toLowerCase();
          if (metaText.includes('mainostettu') || metaText.includes('promoted')) {
            return;
          }
        }

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
            preview: truncateText(text, 100),
            comments: getComments(element),
            expanded: false
          });
        }
      });

      if (statusCallback) {
        statusCallback(`${posts.length}`);
      }

      if (posts.length === lastCount) {
        noNewPostsCount++;
      } else {
        noNewPostsCount = 0;
      }
      lastCount = posts.length;

      window.scrollBy(0, 600);
      scrollCount++;
      await sleep(1000);
    }

    window.scrollTo(0, 0);
    document.removeEventListener('keydown', handleLoadingEscape);
    
    return posts;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===================== PUUNÄKYMÄN HTML =====================

  function createTreeHTML() {
    const itemsHTML = posts.map((post, index) => {
      const hasComments = post.comments.length > 0;
      return `
        <div role="treeitem"
             id="linkedin-post-${index}"
             data-post-index="${index}"
             ${hasComments ? 'aria-expanded="false"' : ''}
             tabindex="${index === 0 ? '0' : '-1'}"
             class="linkedin-tree-post">
          <div class="linkedin-tree-post-content">
            <span class="linkedin-tree-author">${escapeHTML(post.author)}</span>
            ${hasComments ? `<span class="linkedin-tree-comment-count">(${post.comments.length} kommenttia)</span>` : ''}
            <span class="linkedin-tree-time">${escapeHTML(post.time)}</span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="linkedin-listbox-container" role="dialog" aria-label="LinkedIn-julkaisut" aria-modal="true">
        <div class="linkedin-listbox-header">
          <h2 id="linkedin-tree-title">LinkedIn-julkaisut (${posts.length} kpl)</h2>
        </div>
        <div id="linkedin-tree"
             role="tree"
             aria-labelledby="linkedin-tree-title">
          ${itemsHTML}
        </div>
        <div id="linkedin-tree-announcements" aria-live="assertive" class="sr-only"></div>
        <button class="linkedin-listbox-close" aria-label="Sulje luettelo">×</button>
      </div>
    `;
  }

  /**
   * Luo kommenttien HTML ja lisää ne julkaisun alle
   */
  function renderComments(postIndex) {
    const post = posts[postIndex];
    const postEl = document.getElementById(`linkedin-post-${postIndex}`);
    if (!postEl || !post.comments.length) return;

    // Poista vanhat kommentit jos on
    const existingGroup = postEl.querySelector('[role="group"]');
    if (existingGroup) existingGroup.remove();

    const groupEl = document.createElement('div');
    groupEl.setAttribute('role', 'group');
    groupEl.className = 'linkedin-tree-comment-group';

    post.comments.forEach((comment, cIndex) => {
      const commentEl = document.createElement('div');
      commentEl.setAttribute('role', 'treeitem');
      commentEl.id = `linkedin-comment-${postIndex}-${cIndex}`;
      commentEl.dataset.postIndex = postIndex;
      commentEl.dataset.commentIndex = cIndex;
      commentEl.tabIndex = -1;
      commentEl.className = 'linkedin-tree-comment';
      commentEl.innerHTML = `
        <div class="linkedin-tree-comment-content">
          <span class="linkedin-tree-comment-author">${escapeHTML(comment.author)}</span>
          <span class="linkedin-tree-comment-time">${escapeHTML(comment.time)}</span>
        </div>
      `;
      groupEl.appendChild(commentEl);
    });

    postEl.appendChild(groupEl);
    postEl.setAttribute('aria-expanded', 'true');
    post.expanded = true;
  }

  /**
   * Piilottaa kommentit
   */
  function hideComments(postIndex) {
    const post = posts[postIndex];
    const postEl = document.getElementById(`linkedin-post-${postIndex}`);
    if (!postEl) return;

    const group = postEl.querySelector('[role="group"]');
    if (group) group.remove();

    if (post.comments.length > 0) {
      postEl.setAttribute('aria-expanded', 'false');
    }
    post.expanded = false;
  }

  // ===================== TYYLIT =====================

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
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      #linkedin-tree {
        flex: 1;
        overflow-y: auto;
        outline: none;
      }

      .linkedin-tree-post {
        border-bottom: 1px solid #e8e8e8;
        outline: none;
      }

      .linkedin-tree-post-content {
        padding: 14px 20px;
        cursor: pointer;
      }

      .linkedin-tree-post:focus > .linkedin-tree-post-content {
        background-color: #0a66c2;
        color: white;
      }

      .linkedin-tree-post:focus > .linkedin-tree-post-content .linkedin-tree-time,
      .linkedin-tree-post:focus > .linkedin-tree-post-content .linkedin-tree-comment-count {
        color: rgba(255,255,255,0.9);
      }

      .linkedin-tree-comment:focus {
        background-color: #0a66c2;
        color: white;
      }

      .linkedin-tree-comment:focus .linkedin-tree-comment-time {
        color: rgba(255,255,255,0.9);
      }

      .linkedin-tree-author {
        font-weight: 600;
        font-size: 14px;
        margin-right: 8px;
      }

      .linkedin-tree-comment-count {
        font-size: 13px;
        color: #666;
        margin-right: 8px;
      }

      .linkedin-tree-time {
        font-size: 12px;
        color: #888;
      }

      .linkedin-tree-comment-group {
        border-top: 1px solid #e8e8e8;
      }

      .linkedin-tree-comment {
        padding: 10px 20px 10px 44px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        outline: none;
      }

      .linkedin-tree-comment-author {
        font-weight: 600;
        font-size: 13px;
        margin-right: 8px;
      }

      .linkedin-tree-comment-time {
        font-size: 12px;
        color: #888;
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

      .linkedin-help-dialog {
        overflow: hidden;
      }

      .linkedin-help-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
        line-height: 1.6;
        font-size: 14px;
        color: #333;
      }

      .linkedin-help-content h3 {
        font-size: 16px;
        font-weight: 600;
        margin: 20px 0 8px 0;
        color: #0a66c2;
      }

      .linkedin-help-content h3:first-child {
        margin-top: 0;
      }

      .linkedin-help-content p {
        margin: 0 0 12px 0;
      }

      .linkedin-help-content ol {
        margin: 0 0 12px 0;
        padding-left: 24px;
      }

      .linkedin-help-content li {
        margin-bottom: 6px;
      }

      .linkedin-help-content table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }

      .linkedin-help-content th,
      .linkedin-help-content td {
        text-align: left;
        padding: 6px 12px;
        border-bottom: 1px solid #e8e8e8;
      }

      .linkedin-help-content th {
        font-weight: 600;
        background: #f5f5f5;
      }

      .linkedin-help-content td:first-child {
        white-space: nowrap;
        font-family: monospace;
        font-weight: 600;
        width: 140px;
      }
    `;
    document.head.appendChild(styles);
  }

  // ===================== ILMOITUKSET =====================

  function announce(message) {
    const announcer = document.getElementById('linkedin-tree-announcements');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = message;
      }, 50);
    }
  }

  // ===================== NAVIGOINTI =====================

  function focusPost(index) {
    if (index < 0 || index >= posts.length) return;

    const prev = document.activeElement;
    if (prev) prev.tabIndex = -1;

    const postEl = document.getElementById(`linkedin-post-${index}`);
    if (!postEl) return;

    postEl.tabIndex = 0;
    postEl.focus();
    postEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    currentPostIndex = index;
    currentCommentIndex = -1;

    const post = posts[index];
    const commentInfo = post.comments.length > 0 ? `, ${post.comments.length} kommenttia` : '';
    announce(`${post.author}: ${post.text}${commentInfo}. Julkaisu ${index + 1} / ${posts.length}`);
  }

  function focusComment(postIndex, commentIndex) {
    const post = posts[postIndex];
    if (!post || commentIndex < 0 || commentIndex >= post.comments.length) return;

    const prev = document.activeElement;
    if (prev) prev.tabIndex = -1;

    const commentEl = document.getElementById(`linkedin-comment-${postIndex}-${commentIndex}`);
    if (!commentEl) return;

    commentEl.tabIndex = 0;
    commentEl.focus();
    commentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    currentPostIndex = postIndex;
    currentCommentIndex = commentIndex;

    const comment = post.comments[commentIndex];
    announce(`${comment.author}: ${comment.text}. Kommentti ${commentIndex + 1} / ${post.comments.length}`);
  }

  async function expandPost(postIndex) {
    const post = posts[postIndex];
    if (!post || !post.element) return;

    // Jos kommentit on jo ladattu, näytä ne suoraan
    if (post.comments.length > 0) {
      if (!post.expanded) {
        renderComments(postIndex);
      }
      focusComment(postIndex, 0);
      return;
    }

    // Tarkista ensin, näkyykö julkaisussa kommenttimäärää
    const socialCounts = post.element.querySelector('.social-details-social-counts, .feed-shared-social-counts');
    const countText = socialCounts ? socialCounts.textContent.toLowerCase() : '';
    const hasCommentCount = countText.includes('comment') || countText.includes('komment');
    
    if (!hasCommentCount) {
      // Julkaisussa ei näy kommenttimäärää — ei kommentteja
      announce('Ei kommentteja');
      return;
    }

    // Kommentteja ei ole ladattu — käydään avaamassa ne LinkedIn-sivulta
    announce('Ladataan kommentteja...');

    // Scrollaa julkaisuun ja klikkaa kommenttipainiketta taustalla
    post.element.scrollIntoView({ behavior: 'instant', block: 'center' });
    await sleep(300);

    // Etsi kommenttipainike ja klikkaa sitä
    const commentButton = post.element.querySelector(
      'button.comment-button, ' +
      'button[aria-label*="komment"], ' +
      'button[aria-label*="Comment"], ' +
      'button[aria-label*="comment"], ' +
      'button.artdeco-button--muted[aria-label*="omment"]'
    );

    if (!commentButton) {
      const socialActions = post.element.querySelector('.feed-shared-social-actions, .social-details-social-counts');
      if (socialActions) {
        const buttons = socialActions.querySelectorAll('button');
        for (const btn of buttons) {
          const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
          if (label.includes('omment') || label.includes('komment')) {
            btn.click();
            break;
          }
        }
      }
    } else {
      commentButton.click();
    }

    // Odota kommenttien latautumista
    await sleep(2000);

    // Kerää kommentit uudelleen
    const newComments = getComments(post.element);
    post.comments = newComments;

    if (post.comments.length === 0) {
      announce('Ei kommentteja');
      // Päivitä fokus takaisin
      focusPost(postIndex);
      return;
    }

    // Päivitä kommenttimäärä puun näkymässä
    const postTreeEl = document.getElementById(`linkedin-post-${postIndex}`);
    if (postTreeEl) {
      let countSpan = postTreeEl.querySelector('.linkedin-tree-comment-count');
      if (!countSpan) {
        countSpan = document.createElement('span');
        countSpan.className = 'linkedin-tree-comment-count';
        const authorSpan = postTreeEl.querySelector('.linkedin-tree-author');
        if (authorSpan) {
          authorSpan.after(countSpan);
        }
      }
      countSpan.textContent = `(${post.comments.length} kommenttia)`;
      postTreeEl.setAttribute('aria-expanded', 'false');
    }

    renderComments(postIndex);
    focusComment(postIndex, 0);
  }

  function collapseToPost(postIndex) {
    hideComments(postIndex);
    focusPost(postIndex);
  }

  // ===================== NÄPPÄIMISTÖ =====================

  function handleTreeKeydown(event) {
    const onCommentLevel = currentCommentIndex >= 0;

    switch(event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (onCommentLevel) {
          const post = posts[currentPostIndex];
          if (currentCommentIndex < post.comments.length - 1) {
            focusComment(currentPostIndex, currentCommentIndex + 1);
          }
        } else {
          if (currentPostIndex < posts.length - 1) {
            focusPost(currentPostIndex + 1);
          }
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (onCommentLevel) {
          if (currentCommentIndex > 0) {
            focusComment(currentPostIndex, currentCommentIndex - 1);
          } else {
            focusPost(currentPostIndex);
          }
        } else {
          if (currentPostIndex > 0) {
            focusPost(currentPostIndex - 1);
          }
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (!onCommentLevel) {
          expandPost(currentPostIndex);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (onCommentLevel) {
          collapseToPost(currentPostIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        focusPost(0);
        break;

      case 'End':
        event.preventDefault();
        focusPost(posts.length - 1);
        break;

      case 'Enter':
        event.preventDefault();
        goToPost(currentPostIndex);
        break;

      case 'Escape':
        event.preventDefault();
        closeTree();
        break;

      case 'l':
      case 'L':
        event.preventDefault();
        if (onCommentLevel) {
          likeComment(currentPostIndex, currentCommentIndex);
        } else {
          likePost(currentPostIndex);
        }
        break;

      case 'r':
      case 'R':
        event.preventDefault();
        refreshList();
        break;

      case 'f':
      case 'F':
        event.preventDefault();
        forwardPost(currentPostIndex);
        break;

      case 'c':
      case 'C':
        event.preventDefault();
        commentOnPost(currentPostIndex);
        break;

      default:
        return;
    }
  }

  // ===================== TOIMINNOT =====================

  function goToPost(index) {
    const post = posts[index];
    if (!post || !post.element) return;

    closeTree();

    post.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    post.element.setAttribute('tabindex', '-1');
    setTimeout(() => {
      post.element.focus();
    }, 300);
  }

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

  function likeComment(postIndex, commentIndex) {
    const post = posts[postIndex];
    if (!post || !post.comments[commentIndex]) return false;

    const comment = post.comments[commentIndex];
    if (!comment.element) {
      announce('Kommentin elementtiä ei löytynyt');
      return false;
    }

    const likeButton = comment.element.querySelector('button.react-button__trigger');
    if (!likeButton) {
      announce('Kommentin tykkäyspainiketta ei löytynyt');
      return false;
    }

    likeButton.click();
    announce(`Tykätty kommentista: ${comment.author}`);
    return true;
  }

  function forwardPost(index) {
    const post = posts[index];
    if (!post || !post.element) return;

    closeTree();

    post.element.scrollIntoView({ behavior: 'instant', block: 'center' });

    const reshareButton = post.element.querySelector('button.social-reshare-button');
    if (!reshareButton) {
      announce('Jatkojulkaise-painiketta ei löytynyt');
      return;
    }

    setTimeout(() => {
      reshareButton.focus();
      reshareButton.click();
    }, 300);
  }

  function commentOnPost(index) {
    const post = posts[index];
    if (!post || !post.element) return;

    closeTree();

    post.element.scrollIntoView({ behavior: 'instant', block: 'center' });

    const commentButton = post.element.querySelector('button.comment-button');
    if (!commentButton) {
      announce('Kommentoi-painiketta ei löytynyt');
      return;
    }

    setTimeout(() => {
      commentButton.focus();
      commentButton.click();
    }, 300);
  }

  // ===================== LATAUSNÄKYMÄ =====================

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

    document.addEventListener('keydown', handleLoadingEscape);
  }

  function handleLoadingEscape(event) {
    if (event.key === 'Escape') {
      loadingCancelled = true;
      stopAndShow = false;
      document.removeEventListener('keydown', handleLoadingEscape);
    }
    if (event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopPropagation();
      loadingCancelled = true;
      stopAndShow = true;
      document.removeEventListener('keydown', handleLoadingEscape);
    }
  }

  function updateLoadingStatus(text) {
    const status = document.getElementById('linkedin-loading-status');
    if (status) {
      status.textContent = text;
    }
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('linkedin-listbox-overlay');
    if (overlay) overlay.remove();
    const loading = document.getElementById('linkedin-loading-panel');
    if (loading) loading.remove();
  }

  // ===================== AVAA / SULJE =====================

  async function openTree() {
    if (isTreeOpen) {
      // Luettelo on jo auki — vie fokus sinne
      focusPost(currentPostIndex);
      return;
    }

    // Jos julkaisuja on jo kerätty, näytä luettelo suoraan
    if (posts.length === 0) {
      showLoadingOverlay();
      await collectAllPosts(updateLoadingStatus);
      hideLoadingOverlay();

      if (loadingCancelled && !stopAndShow) {
        window.scrollTo(0, 0);
        return;
      }

      if (posts.length === 0) {
        announce('Ei julkaisuja');
        return;
      }
    }

    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'linkedin-listbox-overlay';
    overlay.id = 'linkedin-listbox-overlay';
    overlay.addEventListener('click', closeTree);
    document.body.appendChild(overlay);

    treePanel = document.createElement('div');
    treePanel.id = 'linkedin-tree-panel';
    treePanel.innerHTML = createTreeHTML();
    document.body.appendChild(treePanel);

    const tree = document.getElementById('linkedin-tree');
    tree.addEventListener('keydown', handleTreeKeydown);

    const closeBtn = treePanel.querySelector('.linkedin-listbox-close');
    closeBtn.addEventListener('click', closeTree);

    posts.forEach((post, index) => {
      const postEl = document.getElementById(`linkedin-post-${index}`);
      if (postEl) {
        postEl.querySelector('.linkedin-tree-post-content').addEventListener('click', () => {
          focusPost(index);
        });
        postEl.querySelector('.linkedin-tree-post-content').addEventListener('dblclick', () => {
          goToPost(index);
        });
      }
    });

    isTreeOpen = true;
    currentPostIndex = 0;
    currentCommentIndex = -1;

    setTimeout(() => {
      focusPost(0);
      announce(`${posts.length} julkaisua`);
    }, 100);
  }

  function closeTree() {
    if (!isTreeOpen) return;

    const overlay = document.getElementById('linkedin-listbox-overlay');
    if (overlay) overlay.remove();

    if (treePanel) {
      treePanel.remove();
      treePanel = null;
    }

    isTreeOpen = false;
  }

  async function refreshList() {
    closeTree();
    posts = [];
    await openTree();
  }

  // ===================== PIKANÄPPÄIMET =====================

  function registerGlobalShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        event.stopPropagation();
        openTree();
      }
      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        event.stopPropagation();
        toggleHelp();
      }
    }, true);
  }

  // ===================== OHJE-IKKUNA =====================

  function toggleHelp() {
    if (isHelpOpen) {
      closeHelp();
    } else {
      openHelp();
    }
  }

  function openHelp() {
    if (isHelpOpen) return;
    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'linkedin-listbox-overlay';
    overlay.id = 'linkedin-help-overlay';
    overlay.addEventListener('click', closeHelp);
    document.body.appendChild(overlay);

    const helpPanel = document.createElement('div');
    helpPanel.id = 'linkedin-help-panel';
    helpPanel.innerHTML = createHelpHTML();
    document.body.appendChild(helpPanel);

    const dialog = helpPanel.querySelector('[role="dialog"]');
    dialog.addEventListener('keydown', handleHelpKeydown);

    const closeBtn = helpPanel.querySelector('.linkedin-listbox-close');
    closeBtn.addEventListener('click', closeHelp);

    isHelpOpen = true;

    setTimeout(() => {
      dialog.focus();
    }, 100);
  }

  function closeHelp() {
    if (!isHelpOpen) return;
    const overlay = document.getElementById('linkedin-help-overlay');
    if (overlay) overlay.remove();
    const panel = document.getElementById('linkedin-help-panel');
    if (panel) panel.remove();
    isHelpOpen = false;
  }

  function handleHelpKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHelp();
    }
  }

  function createHelpHTML() {
    return `
      <div class="linkedin-listbox-container linkedin-help-dialog"
           role="dialog"
           aria-labelledby="linkedin-help-title"
           aria-modal="true"
           tabindex="-1">
        <div class="linkedin-listbox-header">
          <h2 id="linkedin-help-title">LinkedIn-julkaisuluettelo — Ohje</h2>
        </div>
        <div class="linkedin-help-content">

          <h3>Yleistä</h3>
          <p>
            Tämä laajennus kerää LinkedIn-syötteen julkaisut selattavaan luetteloon.
            Mainostetut julkaisut suodatetaan automaattisesti pois.
            Julkaisut esitetään puunäkymänä, jossa ylätasolla ovat julkaisut
            ja alatasolla julkaisujen kommentit.
          </p>

          <h3>Yleiset pikanäppäimet</h3>
          <table role="table" aria-label="Yleiset pikanäppäimet">
            <thead>
              <tr><th scope="col">Näppäin</th><th scope="col">Toiminto</th></tr>
            </thead>
            <tbody>
              <tr><td>Alt + L</td><td>Avaa julkaisuluettelo tai palaa siihen</td></tr>
              <tr><td>Alt + H</td><td>Avaa tai sulje tämä ohje</td></tr>
              <tr><td>Alt + K</td><td>Pysäytä kerääminen ja näytä kerätyt julkaisut</td></tr>
              <tr><td>Esc</td><td>Sulje luettelo, ohje tai peruuta keräys</td></tr>
            </tbody>
          </table>

          <h3>Navigointi julkaisuluettelossa</h3>
          <table role="table" aria-label="Navigointinäppäimet">
            <thead>
              <tr><th scope="col">Näppäin</th><th scope="col">Toiminto</th></tr>
            </thead>
            <tbody>
              <tr><td>Nuoli alas</td><td>Seuraava julkaisu tai kommentti</td></tr>
              <tr><td>Nuoli ylös</td><td>Edellinen julkaisu tai kommentti</td></tr>
              <tr><td>Nuoli oikealle</td><td>Avaa julkaisun kommentit</td></tr>
              <tr><td>Nuoli vasemmalle</td><td>Palaa kommenteista julkaisuun</td></tr>
              <tr><td>Home</td><td>Ensimmäinen julkaisu</td></tr>
              <tr><td>End</td><td>Viimeinen julkaisu</td></tr>
              <tr><td>Enter</td><td>Siirry julkaisuun LinkedIn-sivulla</td></tr>
            </tbody>
          </table>

          <h3>Toiminnot julkaisuluettelossa</h3>
          <table role="table" aria-label="Toimintonäppäimet">
            <thead>
              <tr><th scope="col">Näppäin</th><th scope="col">Toiminto</th></tr>
            </thead>
            <tbody>
              <tr><td>L</td><td>Tykkää julkaisusta</td></tr>
              <tr><td>C</td><td>Kommentoi julkaisua</td></tr>
              <tr><td>F</td><td>Jatkojulkaise</td></tr>
              <tr><td>R</td><td>Päivitä luettelo (kerää julkaisut uudelleen)</td></tr>
            </tbody>
          </table>

          <h3>Käyttöohje</h3>
          <ol>
            <li>Paina <strong>Alt + L</strong> LinkedIn-syötesivulla. Laajennus alkaa kerätä julkaisuja scrollaamalla sivua alaspäin.</li>
            <li>Keräyksen aikana näet julkaisujen lukumäärän. Voit odottaa keräyksen loppuun tai painaa <strong>Alt + K</strong> pysäyttääksesi keräyksen ja nähdäksesi jo kerätyt julkaisut. <strong>Esc</strong> peruuttaa keräyksen kokonaan.</li>
            <li>Julkaisuluettelo avautuu ja ruudunlukija lukee ensimmäisen julkaisun. Selaa julkaisuja <strong>nuoli ylös/alas</strong> -näppäimillä.</li>
            <li>Jos julkaisulla on kommentteja, paina <strong>nuoli oikealle</strong> nähdäksesi ne. Selaa kommentteja <strong>nuoli ylös/alas</strong>. Paina <strong>nuoli vasemmalle</strong> palataksesi julkaisutasolle.</li>
            <li>Jos julkaisulla ei ole kommentteja, <strong>nuoli oikealle</strong> ilmoittaa "Ei kommentteja".</li>
            <li>Paina <strong>Enter</strong> siirtyäksesi julkaisun kohdalle LinkedIn-sivulla.</li>
            <li>Palataksesi luetteloon paina <strong>Alt + L</strong> uudelleen.</li>
            <li>Paina <strong>C</strong> kommentoidaksesi, <strong>F</strong> jatkojulkaistaksesi tai <strong>L</strong> tykätäksesi. Palataksesi luetteloon paina taas <strong>Alt + L</strong>.</li>
          </ol>

        </div>
        <button class="linkedin-listbox-close" aria-label="Sulje ohje">×</button>
      </div>
    `;
  }

  function init() {
    console.log('LinkedIn Tree Navigation v3.0');
    registerGlobalShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
