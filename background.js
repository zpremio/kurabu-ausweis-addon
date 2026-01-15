// Background Script: Verarbeitet Nachrichten vom Content Script

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSettings') {
    browser.runtime.openOptionsPage();
    return Promise.resolve({ success: true });
  }
});
