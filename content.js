// Content Script: Ausweis-Generator für Kurabu
// Bibliotheken (jspdf, qrcode) werden vom Manifest geladen

(function() {
  // Prüfen ob wir auf einer Mitgliederseite sind
  if (!window.location.pathname.includes('/admin/members/')) return;

  // Konstanten für PDF
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const CARD_WIDTH = 85;
  const CARD_HEIGHT = 54;
  const CARD_MARGIN_RIGHT = 15;
  const CARD_MARGIN_BOTTOM = 15;

  // Button-Styles (bremen 1860 Dunkelrot)
  const buttonStyles = `
    .kurabu-ausweis-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #8B1A1A;
      color: white !important;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      margin-left: 8px;
    }
    .kurabu-ausweis-btn:hover {
      background: #6B1515;
    }
    .kurabu-ausweis-btn:disabled {
      background: #ccc;
      cursor: wait;
    }
    .kurabu-ausweis-btn svg {
      width: 16px;
      height: 16px;
    }
  `;

  // Hilfsfunktion zum Extrahieren der Mitgliederdaten
  function extractMemberData() {
    const data = {
      profilId: null,
      name: null,
      birthDate: null,
      street: null,
      addressLine2: null,
      zip: null,
      city: null,
      country: null
    };

    const profilIdElement = document.querySelector('[data-testid="label-value-pair-profil-id"] span');
    if (profilIdElement) {
      data.profilId = profilIdElement.textContent.trim();
    }

    const nameElement = document.querySelector('#member-name') ||
                        document.querySelector('[data-testid="label-value-pair-name"] span');
    if (nameElement) {
      data.name = nameElement.textContent.trim();
    }

    const birthDateElement = document.querySelector('[data-testid="label-value-pair-geburtsdatum"] span');
    if (birthDateElement) {
      // Entferne das Alter in Klammern, z.B. "01.01.1990 (35)" -> "01.01.1990"
      data.birthDate = birthDateElement.textContent.trim().replace(/\s*\(\d+\)\s*$/, '');
    }

    // Postadresse extrahieren
    const addressElement = document.querySelector('[data-testid="label-value-pair-postadresse"]');
    if (addressElement) {
      const addressLines = addressElement.querySelectorAll('p');
      const lineCount = addressLines.length;

      if (lineCount === 4) {
        data.street = addressLines[0]?.textContent.trim() || null;
        data.addressLine2 = null;
        data.zip = addressLines[1]?.textContent.trim() || null;
        data.city = addressLines[2]?.textContent.trim() || null;
        const land = addressLines[3]?.textContent.trim() || '';
        data.country = (land && land !== 'Deutschland') ? land : null;
      } else if (lineCount >= 5) {
        data.street = addressLines[0]?.textContent.trim() || null;
        data.addressLine2 = addressLines[1]?.textContent.trim() || null;
        data.zip = addressLines[2]?.textContent.trim() || null;
        data.city = addressLines[3]?.textContent.trim() || null;
        const land = addressLines[4]?.textContent.trim() || '';
        data.country = (land && land !== 'Deutschland') ? land : null;
      }
    }

    return data;
  }

  // QR-Code generieren
  function generateQRCodeDataUrl(text) {
    return new Promise((resolve, reject) => {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      try {
        new QRCode(tempContainer, {
          text: text,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });

        setTimeout(() => {
          const canvas = tempContainer.querySelector('canvas');
          const img = tempContainer.querySelector('img');

          if (canvas) {
            resolve(canvas.toDataURL('image/png'));
          } else if (img && img.src) {
            resolve(img.src);
          } else {
            reject(new Error('QR-Code konnte nicht generiert werden'));
          }

          document.body.removeChild(tempContainer);
        }, 150);

      } catch (error) {
        document.body.removeChild(tempContainer);
        reject(error);
      }
    });
  }

  // PDF generieren - EINZIGE FUNKTION für beide Wege (Button und Popup)
  async function generatePDF(data) {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF nicht geladen');
    }
    if (typeof QRCode === 'undefined') {
      throw new Error('QRCode nicht geladen');
    }

    const { jsPDF } = window.jspdf || jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // ============================================================
    // NUR VARIABLE DATEN - für vorgedrucktes Briefpapier
    // ============================================================

    // === ANSCHREIBEN-BEREICH (oberer Teil) ===

    // Empfänger-Adresse (+0,1cm nach unten: 42 -> 43)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let addressY = 43;
    const addressX = 28;
    doc.text('Herrn', addressX, addressY);
    addressY += 6;
    doc.text(data.name || 'Mitglied', addressX, addressY);
    addressY += 6;
    if (data.street) {
      doc.text(data.street, addressX, addressY);
      addressY += 6;
    }
    if (data.addressLine2) {
      doc.text(data.addressLine2, addressX, addressY);
      addressY += 6;
    }
    if (data.zip && data.city) {
      doc.text(data.zip + ' ' + data.city, addressX, addressY);
      addressY += 6;
    }
    if (data.country) {
      doc.text(data.country, addressX, addressY);
    }

    // Datum (bleibt gleich)
    const heute = new Date();
    const datumStr = 'Bremen, ' + heute.getDate().toString().padStart(2, '0') + '.' + (heute.getMonth() + 1).toString().padStart(2, '0') + '.' + heute.getFullYear();
    doc.text(datumStr, PAGE_WIDTH - 38, 92, { align: 'right' });

    // Betreff (+0,7cm nach rechts: 21 -> 28)
    doc.setFont('helvetica', 'bold');
    doc.text('Neuer Ausweis', 28, 118);

    // Anschreiben-Text (+0,7cm nach rechts: 21 -> 28)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Mit diesem Schreiben erhältst du deinen Mitgliedsausweis, welcher nicht übertragbar und', 28, 130);
    doc.text('bis zum Ende deiner Mitgliedschaft gültig ist. Bitte löse den Ausweis vorsichtig aus der', 28, 136);
    doc.text('Perforierung und halte ihn beim Betreten des Hallenkomplexes unter den dort', 28, 142);
    doc.text('angebrachten Scanner.', 28, 148);

    // Grußformel (+0,7cm nach rechts: 21 -> 28)
    doc.text('Mit freundlichen Grüßen', 28, 166);
    doc.text('dein Team von bremen ', 28, 174);
    doc.setFont('helvetica', 'bold');
    const teamTextWidth = doc.getTextWidth('dein Team von bremen ');
    doc.text('1860', 28 + teamTextWidth, 174);

    // === AUSWEISKARTE (unten rechts) ===
    // Karte: 1,5cm nach oben (+ 15 -> 0)
    const cardX = PAGE_WIDTH - CARD_WIDTH - CARD_MARGIN_RIGHT;
    const cardY = PAGE_HEIGHT - CARD_HEIGHT - CARD_MARGIN_BOTTOM;

    // Name auf Karte (fett/bold)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(data.name || 'Name', cardX + 5, cardY + 13);

    // Geburtsdatum (fett/bold)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (data.birthDate) {
      doc.text(data.birthDate, cardX + 5, cardY + 19);
    }

    // Profil-ID (fett/bold)
    doc.text(data.profilId, cardX + 5, cardY + 25);

    // QR-Code (bleibt gleich)
    const qrDataUrl = await generateQRCodeDataUrl(data.profilId);
    const qrSize = 28;
    const qrX = cardX + CARD_WIDTH - qrSize - 3;
    const qrY = cardY + 8;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // PDF speichern
    const filename = 'Ausweis_' + data.profilId + '_' + (data.name || 'Mitglied').replace(/\s+/g, '_') + '.pdf';
    doc.save(filename);
  }

  // Download-Button in die Seite einfügen
  function injectDownloadButton() {
    if (!window.location.pathname.includes('/members/')) return;
    if (document.getElementById('kurabu-ausweis-download-btn')) return;

    // Styles nur einmal einfügen
    if (!document.getElementById('kurabu-ausweis-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'kurabu-ausweis-styles';
      styleEl.textContent = buttonStyles;
      document.head.appendChild(styleEl);
    }

    // Button neben den Tags (Aktiv, Leitung, Mitglied) einfügen
    const targetContainer = document.querySelector('#member-name')?.parentElement;

    if (!targetContainer) {
      setTimeout(injectDownloadButton, 1000);
      return;
    }

    const button = document.createElement('button');
    button.id = 'kurabu-ausweis-download-btn';
    button.className = 'kurabu-ausweis-btn';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Mitgliedsausweis';

    button.addEventListener('click', async () => {
      const originalText = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Generiere PDF...';

      try {
        const memberData = extractMemberData();

        if (!memberData.profilId) {
          alert('Fehler: Profil-ID konnte nicht gefunden werden.');
          button.innerHTML = originalText;
          button.disabled = false;
          return;
        }

        await generatePDF(memberData);

        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> PDF erstellt!';

        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 2000);

      } catch (error) {
        console.error('Fehler beim Generieren:', error);
        alert('Fehler beim Erstellen des Ausweises: ' + error.message);
        button.innerHTML = originalText;
        button.disabled = false;
      }
    });

    targetContainer.appendChild(button);
    console.log('Kurabu Ausweis: Download-Button eingefügt');
  }

  // Message Listener für das Popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getMemberData') {
      const data = extractMemberData();
      return Promise.resolve(data);
    }

    if (message.action === 'generatePDF') {
      const memberData = extractMemberData();

      if (!memberData.profilId) {
        return Promise.resolve({ success: false, error: 'Profil-ID nicht gefunden' });
      }

      generatePDF(memberData)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true; // Asynchrone Antwort
    }
  });

  // Initialisierung
  function init() {
    injectDownloadButton();

    const observer = new MutationObserver(() => {
      if (window.location.pathname.includes('/members/')) {
        injectDownloadButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start - Bibliotheken sind bereits vom Manifest geladen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
