// Popup Script: Steuert die UI und delegiert PDF-Generierung an Content Script

let memberData = null;

async function init() {
  const contentDiv = document.getElementById('content');

  try {
    // Aktiven Tab abfragen
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // Prüfen ob wir auf einer Kurabu-Mitgliederseite sind
    if (!tab.url || !tab.url.includes('kurabu.com') || !tab.url.includes('/members/')) {
      contentDiv.innerHTML = `
        <div class="error">
          Bitte öffne eine Kurabu-Mitgliederseite.<br><br>
          <small>URL muss enthalten: kurabu.com/.../members/...</small>
        </div>
      `;
      return;
    }

    // Daten vom Content Script abrufen
    memberData = await browser.tabs.sendMessage(tab.id, { action: 'getMemberData' });

    if (!memberData || !memberData.profilId) {
      contentDiv.innerHTML = `
        <div class="error">
          Konnte Profil-ID nicht finden.<br><br>
          <small>Stelle sicher, dass du auf der Detail-Seite eines Mitglieds bist.</small>
        </div>
      `;
      return;
    }

    // UI mit Daten anzeigen
    renderMemberUI(memberData);

  } catch (error) {
    console.error('Fehler:', error);
    contentDiv.innerHTML = `
      <div class="error">
        Fehler beim Laden der Daten.<br><br>
        <small>${error.message}</small>
      </div>
    `;
  }
}

function renderMemberUI(data) {
  const contentDiv = document.getElementById('content');

  contentDiv.innerHTML = `
    <div class="member-info">
      <p><strong>Name:</strong> ${data.name || 'Unbekannt'}</p>
      <p><strong>Profil-ID:</strong> ${data.profilId}</p>
      <p><strong>Mitglied seit:</strong> ${data.memberSince || '-'}</p>
    </div>

    <div class="preview-card">
      <h3>QR-Code Vorschau</h3>
      <div id="qr-preview"></div>
    </div>

    <button id="generate-btn" class="btn btn-primary">
      PDF Ausweis erstellen
    </button>
    <div class="status" id="status"></div>
  `;

  // QR-Code Vorschau generieren (qrcodejs API)
  generateQRPreview(data.profilId);

  // Button-Handler - delegiert an Content Script
  document.getElementById('generate-btn').addEventListener('click', () => generatePDF());
}

function generateQRPreview(profilId) {
  const container = document.getElementById('qr-preview');
  container.innerHTML = ''; // Container leeren

  // qrcodejs Bibliothek verwendet diese API
  new QRCode(container, {
    text: profilId,
    width: 120,
    height: 120,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

async function generatePDF() {
  const btn = document.getElementById('generate-btn');
  const status = document.getElementById('status');

  btn.disabled = true;
  status.textContent = 'Generiere PDF...';

  try {
    // Aktiven Tab abfragen
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // PDF-Generierung an Content Script delegieren
    const result = await browser.tabs.sendMessage(tab.id, { action: 'generatePDF' });

    if (result && result.success) {
      status.textContent = 'PDF wurde erstellt!';
    } else {
      status.textContent = 'Fehler: ' + (result?.error || 'Unbekannter Fehler');
    }

    btn.disabled = false;

  } catch (error) {
    console.error('PDF-Fehler:', error);
    status.textContent = 'Fehler: ' + error.message;
    btn.disabled = false;
  }
}

// Initialisieren wenn DOM geladen
document.addEventListener('DOMContentLoaded', init);
