chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        if (command === "scan_smart") {
            // Alt+S -> Lähetä "smart"-tila
            chrome.tabs.sendMessage(tabs[0].id, { action: "open_menu", mode: "smart" });
        } else if (command === "scan_all") {
            // Alt+A -> Lähetä "all"-tila
            chrome.tabs.sendMessage(tabs[0].id, { action: "open_menu", mode: "all" });
        }
    });
});