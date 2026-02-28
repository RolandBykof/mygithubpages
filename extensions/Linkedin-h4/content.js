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
      const commentAuthor = commentEl.querySelector(
        '.comments-post-meta__name-text span[aria-hidden="true"], ' +
        '.comments-comment-item__post-meta span[aria-hidden="true"], ' +
        '.comments-post-meta__name-text .visually-hidden'
      );
      if (commentAuthor && commentAuthor.textContent.trim()) {
        author = commentAuthor.textContent.trim();
      }

      let text = '';
      const commentText = commentEl.querySelector(
        '.comments-comment-item__main-content, ' +
        '.comments-comment-item-content-body .update-components-text, ' +
        '.comments-comment-item__inline-show-more-text span[aria-hidden="true"], ' +
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

  function expandPost(postIndex) {
    const post = posts[postIndex];
    if (!post || post.comments.length === 0) {
      announce('Ei kommentteja');
      return;
    }

    if (!post.expanded) {
      renderComments(postIndex);
    }
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
        likePost(currentPostIndex);
        break;

      case 'r':
      case 'R':
        event.preventDefault();
        refreshList();
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
    if (event.altKey && event.key.toLowerCase() === 's') {
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
      closeTree();
      return;
    }

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
    await openTree();
  }

  // ===================== PIKANÄPPÄIMET =====================

  function registerGlobalShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'l' && !isTreeOpen) {
        event.preventDefault();
        event.stopPropagation();
        openTree();
      }
    }, true);
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
