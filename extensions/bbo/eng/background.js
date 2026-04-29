// BBO Screen Reader Support – background service worker
chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === 'openHelp') {
        chrome.tabs.create({ url: chrome.runtime.getURL('userguide.html') });
    }
});
