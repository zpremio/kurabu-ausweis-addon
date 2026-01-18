// Content Script: Ausweis-Generator für Kurabu
// Bibliotheken (jspdf, qrcode) werden vom Manifest geladen

(function() {
  // Prüfen ob wir auf einer Mitgliederseite sind
  if (!window.location.pathname.includes('/admin/members/')) return;

  // Gecachte API-Daten (werden vom Interceptor befüllt)
  let cachedMemberData = null;

  // Fetch-Interceptor SOFORT installieren um Kurabu's API-Antworten abzufangen
  (function installFetchInterceptor() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        if (window.__kurabuInterceptorInstalled) return;
        window.__kurabuInterceptorInstalled = true;

        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await originalFetch.apply(this, args);

          // Prüfen ob es ein GetMembership API-Aufruf ist
          const url = args[0]?.url || args[0];
          if (url && url.includes('/api/admin/graphql') && url.includes('GetMembership')) {
            try {
              const clonedResponse = response.clone();
              const data = await clonedResponse.json();
              if (data?.data?.getMembership) {
                console.log('Kurabu Ausweis: API Response abgefangen');
                window.dispatchEvent(new CustomEvent('kurabu-member-data', {
                  detail: data.data.getMembership
                }));
              }
            } catch (e) {
              console.error('Kurabu Ausweis: Fehler beim Abfangen', e);
            }
          }

          return response;
        };
        console.log('Kurabu Ausweis: Fetch-Interceptor installiert');
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
  })();

  // Event-Listener für abgefangene Daten
  window.addEventListener('kurabu-member-data', (event) => {
    cachedMemberData = event.detail;
    console.log('Kurabu Ausweis: Daten gecacht', cachedMemberData?.fixedFieldValues?.firstName, cachedMemberData?.fixedFieldValues?.lastName);
  });

  // Konstanten für PDF
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const CARD_WIDTH = 85;
  const CARD_HEIGHT = 54;
  const CARD_MARGIN_RIGHT = 15;
  const CARD_MARGIN_BOTTOM = 15;

  // Standard-Anschreibentext
  const DEFAULT_ANSCHREIBEN = 'Mit diesem Schreiben erhältst du deinen Mitgliedsausweis, welcher nicht übertragbar und bis zum Ende deiner Mitgliedschaft gültig ist. Bitte löse den Ausweis vorsichtig aus der Perforierung und halte ihn beim Betreten des Hallenkomplexes unter den dort angebrachten Scanner.';

  // Feste Hinweise (nicht editierbar)
  const FIXED_HINWEISE = [
    { id: 'none', label: 'Kein zusätzlicher Hinweis', text: '' },
    { id: 'custom', label: 'Eigener Text...', text: '' }
  ];

  // Standard-Hinweise (können in Settings bearbeitet werden)
  const DEFAULT_CUSTOM_HINWEISE = [
    { id: 'ersatz', label: 'Ersatzausweis', text: 'Dies ist ein Ersatzausweis. Der alte Ausweis verliert hiermit seine Gültigkeit.' },
    { id: 'neuanmeldung', label: 'Neuanmeldung', text: 'Herzlich willkommen bei bremen 1860! Wir freuen uns, dich als neues Mitglied begrüßen zu dürfen.' }
  ];

  // Button-Styles (wie Kurabu "Bearbeiten" Button)
  const buttonStyles = `
    .kurabu-ausweis-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 8px;
      background: transparent;
      color: black !important;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 400;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      height: fit-content;
    }
    .kurabu-ausweis-btn:hover {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .kurabu-ausweis-btn:disabled {
      opacity: 0.5;
      cursor: wait;
    }
    .kurabu-ausweis-btn svg {
      width: 16px;
      height: 16px;
    }
    .kurabu-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    }
    .kurabu-modal {
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 400px;
      max-width: 90vw;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .kurabu-modal h2 {
      margin: 0 0 16px 0;
      color: #8B1A1A;
      font-size: 18px;
      border-bottom: 2px solid #8B1A1A;
      padding-bottom: 8px;
    }
    .kurabu-modal label {
      display: block;
      font-size: 13px;
      color: #555;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .kurabu-modal select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .kurabu-modal select:focus {
      outline: none;
      border-color: #8B1A1A;
    }
    .kurabu-modal textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      min-height: 80px;
      margin-bottom: 12px;
      box-sizing: border-box;
    }
    .kurabu-modal textarea:focus {
      outline: none;
      border-color: #8B1A1A;
    }
    .kurabu-modal-preview {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #333;
      max-height: 100px;
      overflow-y: auto;
      line-height: 1.4;
    }
    .kurabu-modal-preview-label {
      font-size: 11px;
      color: #888;
      margin-bottom: 4px;
    }
    .kurabu-modal-buttons {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }
    .kurabu-modal-btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .kurabu-modal-btn-primary {
      background: #8B1A1A;
      color: white;
    }
    .kurabu-modal-btn-primary:hover {
      background: #6B1515;
    }
    .kurabu-modal-btn-secondary {
      background: #e0e0e0;
      color: #333;
    }
    .kurabu-modal-btn-secondary:hover {
      background: #ccc;
    }
    .kurabu-modal-settings-link {
      display: block;
      text-align: right;
      font-size: 12px;
      color: #8B1A1A;
      text-decoration: none;
      margin-top: 8px;
      cursor: pointer;
    }
    .kurabu-modal-settings-link:hover {
      text-decoration: underline;
    }
  `;

  // Einstellungen aus Storage laden
  async function loadSettings() {
    try {
      const result = await browser.storage.local.get(['anschreibenText', 'customHinweise']);
      return {
        anschreibenText: result.anschreibenText || DEFAULT_ANSCHREIBEN,
        customHinweise: result.customHinweise || DEFAULT_CUSTOM_HINWEISE
      };
    } catch (e) {
      console.error('Fehler beim Laden der Einstellungen:', e);
      return {
        anschreibenText: DEFAULT_ANSCHREIBEN,
        customHinweise: DEFAULT_CUSTOM_HINWEISE
      };
    }
  }

  // Alle Hinweise zusammenbauen (fest + custom)
  function buildHinweiseList(customHinweise) {
    // "Kein Hinweis" zuerst, dann custom Hinweise, dann "Eigener Text" am Ende
    return [
      FIXED_HINWEISE[0], // none
      ...customHinweise,
      FIXED_HINWEISE[1]  // custom
    ];
  }

  // Membership-ID aus URL extrahieren
  function getMembershipIdFromUrl() {
    const match = window.location.pathname.match(/\/admin\/members\/([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  // API-Daten abrufen (aus Cache oder warten)
  async function fetchMemberDataFromAPI() {
    // Falls bereits gecacht, direkt zurückgeben
    if (cachedMemberData) {
      console.log('Kurabu Ausweis: Nutze gecachte Daten');
      return cachedMemberData;
    }

    // Kurz warten falls Daten noch geladen werden
    return new Promise((resolve) => {
      let attempts = 0;
      const checkCache = setInterval(() => {
        attempts++;
        if (cachedMemberData) {
          clearInterval(checkCache);
          resolve(cachedMemberData);
        } else if (attempts > 20) { // 2 Sekunden max
          clearInterval(checkCache);
          console.log('Kurabu Ausweis: Keine gecachten Daten gefunden');
          resolve(null);
        }
      }, 100);
    });
  }

  // Datum formatieren (YYYY-MM-DD -> DD.MM.YYYY)
  function formatDate(dateStr) {
    if (!dateStr) return null;
    // Falls bereits im deutschen Format
    if (dateStr.includes('.')) return dateStr;
    // ISO Format (YYYY-MM-DD) umwandeln
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  }

  // Geschlecht übersetzen (API -> Deutsch)
  function translateGender(gender) {
    const translations = {
      'male': 'Männlich',
      'female': 'Weiblich',
      'diverse': 'Divers',
      'MALE': 'Männlich',
      'FEMALE': 'Weiblich',
      'DIVERSE': 'Divers'
    };
    return translations[gender] || gender;
  }

  // Hilfsfunktion zum Extrahieren der Mitgliederdaten (Fallback: DOM)
  function extractMemberDataFromDOM() {
    const data = {
      profilId: null,
      firstName: null,
      lastName: null,
      name: null,
      gender: null,
      birthDate: null,
      memberSince: null,
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
      // Versuche Name zu splitten (Fallback)
      const parts = data.name.trim().split(/\s+/);
      if (parts.length > 1) {
        data.lastName = parts.pop();
        data.firstName = parts.join(' ');
      } else {
        data.firstName = data.name;
        data.lastName = '';
      }
    }

    const birthDateElement = document.querySelector('[data-testid="label-value-pair-geburtsdatum"] span');
    if (birthDateElement) {
      data.birthDate = birthDateElement.textContent.trim().replace(/\s*\(\d+\)\s*$/, '');
    }

    const genderElement = document.querySelector('[data-testid="label-value-pair-geschlecht"] span');
    if (genderElement) {
      data.gender = genderElement.textContent.trim();
    }

    const memberSinceElement = document.querySelector('[data-testid="label-value-pair-mitglied-seit"] span');
    if (memberSinceElement) {
      data.memberSince = memberSinceElement.textContent.trim();
    }

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

  // Hauptfunktion: Mitgliederdaten laden (API zuerst, dann DOM als Fallback)
  async function extractMemberData() {
    const membershipId = getMembershipIdFromUrl();

    // Profil-ID immer zuerst aus DOM versuchen (wird auch bei API-Erfolg gebraucht)
    const profilIdElement = document.querySelector('[data-testid="label-value-pair-profil-id"] span');
    const domProfilId = profilIdElement ? profilIdElement.textContent.trim() : null;

    if (membershipId) {
      const apiData = await fetchMemberDataFromAPI(membershipId);

      if (apiData && apiData.fixedFieldValues) {
        const fv = apiData.fixedFieldValues;
        const addr = fv.postalAddress || {};

        console.log('Kurabu Ausweis: fixedFieldValues', JSON.stringify(fv, null, 2));
        console.log('Kurabu Ausweis: firstName =', fv.firstName, '| lastName =', fv.lastName);

        // Profil-ID: DOM > API membershipNumber > API fixedFieldValues.membershipNumber
        const profilId = domProfilId || fv.membershipNumber || apiData.membershipNumber;

        if (!profilId) {
          console.warn('Kurabu Ausweis: Profil-ID nicht gefunden, nutze DOM-Fallback');
          return extractMemberDataFromDOM();
        }

        return {
          profilId: profilId,
          firstName: fv.firstName || '',
          lastName: fv.lastName || '',
          name: `${fv.firstName || ''} ${fv.lastName || ''}`.trim(),
          gender: translateGender(fv.gender),
          birthDate: formatDate(fv.dob),
          memberSince: formatDate(fv.startDate),
          street: addr.street || null,
          addressLine2: addr.addressOption || null,
          zip: addr.zip || null,
          city: addr.city || null,
          country: (addr.country && addr.country !== 'Deutschland' && addr.country !== 'DE') ? addr.country : null
        };
      }
    }

    // Fallback: DOM-Extraktion
    console.log('Kurabu Ausweis: API nicht verfügbar, nutze DOM-Extraktion');
    return extractMemberDataFromDOM();
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

  // PDF generieren
  async function generatePDF(data, anschreibenText = DEFAULT_ANSCHREIBEN, hinweisText = '', hinweisPosition = 'below') {
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
    doc.setFont('UniformPro', 'normal');
    doc.setTextColor(0, 0, 0);
    let addressY = 43;
    const addressX = 28;

    // Anrede basierend auf Geschlecht
    let anrede = '';
    if (data.gender === 'Männlich') {
      anrede = 'Herrn';
    } else if (data.gender === 'Weiblich') {
      anrede = 'Frau';
    }
    // Bei "Divers" oder unbekannt: keine Anrede

    if (anrede) {
      doc.text(anrede, addressX, addressY);
      addressY += 6;
    }
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
    doc.setFont('UniformPro', 'bold');
    doc.text('Dein Mitgliedsausweis', 28, 118);

    // Text-Position
    doc.setFont('UniformPro', 'normal');
    doc.setFontSize(10);
    const maxWidth = 160; // mm
    let currentY = 130;

    // Hinweis ÜBER dem Anschreibentext
    if (hinweisText && hinweisPosition === 'above') {
      const hinweisLines = doc.splitTextToSize(hinweisText, maxWidth);
      doc.text(hinweisLines, 28, currentY);
      currentY += (hinweisLines.length * 5) + 4;
    }

    // Anschreiben-Text
    const anschreibenLines = doc.splitTextToSize(anschreibenText, maxWidth);
    doc.text(anschreibenLines, 28, currentY);
    currentY += (anschreibenLines.length * 5);

    // Hinweis UNTER dem Anschreibentext
    if (hinweisText && hinweisPosition === 'below') {
      currentY += 4; // Abstand
      const hinweisLines = doc.splitTextToSize(hinweisText, maxWidth);
      doc.text(hinweisLines, 28, currentY);
      currentY += (hinweisLines.length * 5);
    }

    // Grußformel
    let grussY = currentY + 10;

    // Grußformel (+0,7cm nach rechts: 21 -> 28)
    doc.text('Sportliche Grüßen', 28, grussY);
    doc.text('dein Team von bremen ', 28, grussY + 8);
    doc.setFont('UniformPro', 'bold');
    const teamTextWidth = doc.getTextWidth('dein Team von bremen ');
    doc.text('1860', 28 + teamTextWidth, grussY + 8);

    // === AUSWEISKARTE (unten rechts) ===
    const cardX = PAGE_WIDTH - CARD_WIDTH - CARD_MARGIN_RIGHT;
    const cardY = PAGE_HEIGHT - CARD_HEIGHT - CARD_MARGIN_BOTTOM;

    // Vorname und Nachname direkt aus API-Daten (oder Fallback)
    const firstName = data.firstName || 'Vorname';
    const lastName = data.lastName || '';

    // Maximale Breite für Namen (damit es nicht unter QR-Code läuft)
    const maxNameWidth = 45; // mm

    // Hilfsfunktion: Text mit automatischer Schriftgrößenanpassung
    function drawTextWithAutoSize(text, x, y, maxWidth, startSize, minSize) {
      let fontSize = startSize;
      doc.setFontSize(fontSize);
      let textWidth = doc.getTextWidth(text);

      // Schriftgröße reduzieren bis Text passt oder Minimum erreicht
      while (textWidth > maxWidth && fontSize > minSize) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
        textWidth = doc.getTextWidth(text);
      }

      doc.text(text, x, y);
      return fontSize; // Zurückgeben für evtl. Nachname gleiche Größe
    }

    // Vorname (erste Zeile)
    doc.setFont('UniformPro', 'bold');
    doc.setTextColor(0, 0, 0);
    const usedFontSize = drawTextWithAutoSize(firstName, cardX + 5, cardY + 11, maxNameWidth, 13, 8);

    // Nachname (zweite Zeile) - gleiche Schriftgröße wie Vorname verwenden
    if (lastName) {
      doc.setFontSize(usedFontSize);
      const lastNameWidth = doc.getTextWidth(lastName);
      // Falls Nachname nicht passt, nochmal verkleinern
      if (lastNameWidth > maxNameWidth) {
        drawTextWithAutoSize(lastName, cardX + 5, cardY + 17, maxNameWidth, usedFontSize, 8);
      } else {
        doc.text(lastName, cardX + 5, cardY + 17);
      }
    }

    // Geburtsdatum mit "Geb." Prefix (fett/bold)
    doc.setFontSize(9);
    doc.setFont('UniformPro', 'bold');
    if (data.birthDate) {
      doc.text('Geb. ' + data.birthDate, cardX + 5, cardY + 23);
    }

    // Mitglied seit (fett/bold)
    if (data.memberSince) {
      doc.text('Seit ' + data.memberSince, cardX + 5, cardY + 29);
    }

    // QR-Code
    const qrSize = 28;
    const qrX = cardX + CARD_WIDTH - qrSize - 3;
    const qrY = cardY + 9;
    const qrDataUrl = await generateQRCodeDataUrl(data.profilId);
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Profil-ID unter QR-Code (zentriert)
    doc.setFontSize(7);
    doc.setFont('UniformPro', 'bold');
    const idText = data.profilId;
    const idWidth = doc.getTextWidth(idText);
    doc.text(idText, qrX + (qrSize / 2) - (idWidth / 2), qrY + qrSize + 4);

    // PDF speichern
    const filename = 'Ausweis_' + data.profilId + '_' + (data.name || 'Mitglied').replace(/\s+/g, '_') + '.pdf';
    doc.save(filename);
  }

  // Modal für Hinweis-Auswahl anzeigen
  async function showHinweisModal() {
    // Falls Modal schon existiert, entfernen
    const existingModal = document.getElementById('kurabu-modal-overlay');
    if (existingModal) existingModal.remove();

    // Einstellungen laden
    const settings = await loadSettings();
    const hinweise = buildHinweiseList(settings.customHinweise);

    // Dropdown-Optionen erstellen
    const optionsHtml = hinweise.map(h =>
      `<option value="${h.id}">${h.label}</option>`
    ).join('');

    // Vorschau-Text kürzen wenn nötig
    const previewText = settings.anschreibenText.length > 200
      ? settings.anschreibenText.substring(0, 200) + '...'
      : settings.anschreibenText;

    // Modal erstellen
    const overlay = document.createElement('div');
    overlay.id = 'kurabu-modal-overlay';
    overlay.className = 'kurabu-modal-overlay';
    overlay.innerHTML = `
      <div class="kurabu-modal">
        <h2>Mitgliedsausweis erstellen</h2>

        <label>Anschreibentext:</label>
        <div class="kurabu-modal-preview-label">Vorschau (bearbeiten in Einstellungen)</div>
        <div class="kurabu-modal-preview">${previewText}</div>

        <label>Zusätzlicher Hinweis:</label>
        <select id="kurabu-hinweis-select">
          ${optionsHtml}
        </select>
        <div id="kurabu-custom-container" style="display: none;">
          <label>Eigener Hinweistext:</label>
          <textarea id="kurabu-custom-text" placeholder="Eigenen Hinweistext eingeben..."></textarea>
        </div>
        <a class="kurabu-modal-settings-link" id="kurabu-settings-link">Einstellungen...</a>
        <div class="kurabu-modal-buttons">
          <button class="kurabu-modal-btn kurabu-modal-btn-secondary" id="kurabu-cancel-btn">Abbrechen</button>
          <button class="kurabu-modal-btn kurabu-modal-btn-primary" id="kurabu-generate-btn">PDF erstellen</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event-Handler
    const select = document.getElementById('kurabu-hinweis-select');
    const customContainer = document.getElementById('kurabu-custom-container');
    const customText = document.getElementById('kurabu-custom-text');
    const settingsLink = document.getElementById('kurabu-settings-link');
    const cancelBtn = document.getElementById('kurabu-cancel-btn');
    const generateBtn = document.getElementById('kurabu-generate-btn');

    select.addEventListener('change', () => {
      customContainer.style.display = select.value === 'custom' ? 'block' : 'none';
    });

    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Settings-Seite über Background Script öffnen
      browser.runtime.sendMessage({ action: 'openSettings' });
      overlay.remove();
    });

    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    generateBtn.addEventListener('click', async () => {
      // Hinweistext und Position ermitteln
      let hinweisText = '';
      let hinweisPosition = 'below'; // Default

      if (select.value === 'custom') {
        hinweisText = customText.value.trim();
        // Für eigenen Text: Default Position "below"
      } else {
        const selectedHinweis = hinweise.find(h => h.id === select.value);
        hinweisText = selectedHinweis ? selectedHinweis.text : '';
        hinweisPosition = selectedHinweis?.position || 'below';
      }

      generateBtn.disabled = true;
      generateBtn.textContent = 'Generiere...';

      try {
        const memberData = await extractMemberData();

        if (!memberData.profilId) {
          alert('Fehler: Profil-ID konnte nicht gefunden werden.');
          overlay.remove();
          return;
        }

        await generatePDF(memberData, settings.anschreibenText, hinweisText, hinweisPosition);
        overlay.remove();

      } catch (error) {
        console.error('Fehler beim Generieren:', error);
        alert('Fehler beim Erstellen des Ausweises: ' + error.message);
        generateBtn.disabled = false;
        generateBtn.textContent = 'PDF erstellen';
      }
    });
  }

  // Prüfen ob wir auf der Detail-Seite sind (nicht /team, /payment, etc.)
  function isDetailPage() {
    const path = window.location.pathname;
    // Pfad muss /admin/members/UUID sein, ohne weitere Segmente
    // z.B. /de/admin/members/bd6f464a-87bc-4ddd-8b19-871d97150555
    const memberPattern = /\/admin\/members\/[a-f0-9-]+\/?$/i;
    return memberPattern.test(path);
  }

  // Download-Button in die Seite einfügen
  function injectDownloadButton() {
    if (!window.location.pathname.includes('/members/')) return;

    // Button entfernen wenn nicht auf Detail-Seite
    if (!isDetailPage()) {
      const existingBtn = document.getElementById('kurabu-ausweis-download-btn');
      if (existingBtn) existingBtn.remove();
      return;
    }

    if (document.getElementById('kurabu-ausweis-download-btn')) return;

    // Styles nur einmal einfügen
    if (!document.getElementById('kurabu-ausweis-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'kurabu-ausweis-styles';
      styleEl.textContent = buttonStyles;
      document.head.appendChild(styleEl);
    }

    // Button oben im Header neben dem Mitgliedsnamen einfügen
    const memberName = document.getElementById('member-name');
    let targetContainer = null;

    if (memberName) {
      // Der Container mit den Tags ist das Sibling-div neben dem h1
      // Struktur: div.tw-flex > h1#member-name + div (mit tags)
      const parent = memberName.parentElement;
      if (parent) {
        // Suche nach dem div mit den span.tag Elementen
        const tagDiv = parent.querySelector('div');
        if (tagDiv) {
          targetContainer = tagDiv;
        } else {
          targetContainer = parent;
        }
      }
    }

    if (!targetContainer) {
      setTimeout(injectDownloadButton, 1000);
      return;
    }

    const button = document.createElement('button');
    button.id = 'kurabu-ausweis-download-btn';
    button.className = 'kurabu-ausweis-btn';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Mitgliedsausweis';

    button.addEventListener('click', () => {
      showHinweisModal();
    });

    // Button am Ende des Containers anhängen (nach den Tags)
    targetContainer.appendChild(button);
    console.log('Kurabu Ausweis: Download-Button eingefügt');
  }

  // Message Listener für das Popup (falls noch benötigt)
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getMemberData') {
      extractMemberData().then(data => {
        sendResponse(data);
      });
      return true; // Asynchrone Antwort
    }

    if (message.action === 'generatePDF') {
      (async () => {
        try {
          const memberData = await extractMemberData();
          const anschreibenText = message.anschreibenText || DEFAULT_ANSCHREIBEN;
          const hinweisText = message.hinweisText || '';
          const hinweisPosition = message.hinweisPosition || 'below';

          if (!memberData.profilId) {
            sendResponse({ success: false, error: 'Profil-ID nicht gefunden' });
            return;
          }

          await generatePDF(memberData, anschreibenText, hinweisText, hinweisPosition);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();

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
