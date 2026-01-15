// Popup Script: Zeigt Info und öffnet Einstellungen

document.getElementById('open-settings').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});
