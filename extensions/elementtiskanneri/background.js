// background.js
chrome.commands.onCommand.addListener((command) => {
  if (command === "fix-accessibility") { // Tämä "fix-accessibility" tulee manifestista
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // TÄRKEÄ MUUTOS: Action on nyt "toggle_menu", ei "run_fix"
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_menu" }); 
      }
    });
  }
});