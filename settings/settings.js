// Settings Script: Verwaltet Textbausteine

// Standard-Anschreibentext
const DEFAULT_ANSCHREIBEN = 'Mit diesem Schreiben erhältst du deinen Mitgliedsausweis, welcher nicht übertragbar und bis zum Ende deiner Mitgliedschaft gültig ist. Bitte löse den Ausweis vorsichtig aus der Perforierung und halte ihn beim Betreten des Hallenkomplexes unter den dort angebrachten Scanner.';

// Standard-Textbausteine (nicht löschbar)
const FIXED_HINWEISE = [
  { id: 'none', label: 'Kein zusätzlicher Hinweis', text: '', fixed: true },
  { id: 'custom', label: 'Eigener Text...', text: '', fixed: true }
];

// Standard-Hinweise die bearbeitet/gelöscht werden können (jetzt mit Position)
const DEFAULT_CUSTOM_HINWEISE = [
  { id: 'ersatz', label: 'Ersatzausweis', text: 'Dies ist ein Ersatzausweis. Der alte Ausweis verliert hiermit seine Gültigkeit.', position: 'above' },
  { id: 'neuanmeldung', label: 'Neuanmeldung', text: 'Herzlich willkommen bei bremen 1860! Wir freuen uns, dich als neues Mitglied begrüßen zu dürfen.', position: 'above' }
];

let customHinweise = [];

// Einstellungen laden
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(['anschreibenText', 'customHinweise']);

    // Anschreibentext
    const anschreibenTextarea = document.getElementById('default-anschreiben');
    anschreibenTextarea.value = result.anschreibenText || DEFAULT_ANSCHREIBEN;

    // Custom Hinweise (mit Migration für alte Daten ohne Position)
    const savedHinweise = result.customHinweise || [...DEFAULT_CUSTOM_HINWEISE];
    customHinweise = savedHinweise.map(h => ({
      ...h,
      position: h.position || 'below' // Default für alte Einträge ohne Position
    }));

    renderHinweise();
  } catch (e) {
    console.error('Fehler beim Laden:', e);
    document.getElementById('default-anschreiben').value = DEFAULT_ANSCHREIBEN;
    customHinweise = [...DEFAULT_CUSTOM_HINWEISE];
    renderHinweise();
  }
}

// Hinweise rendern
function renderHinweise() {
  const container = document.getElementById('hinweise-list');
  container.innerHTML = '';

  // Feste Hinweise (nur anzeigen, nicht editierbar)
  FIXED_HINWEISE.forEach(hinweis => {
    if (hinweis.id === 'none' || hinweis.id === 'custom') {
      const div = document.createElement('div');
      div.className = 'hinweis-item default';
      div.innerHTML = `
        <label>Bezeichnung:</label>
        <input type="text" value="${hinweis.label}" disabled>
        <small style="color: #888; font-size: 11px;">Dieser Eintrag ist fest und kann nicht bearbeitet werden.</small>
      `;
      container.appendChild(div);
    }
  });

  // Custom Hinweise
  customHinweise.forEach((hinweis, index) => {
    const div = document.createElement('div');
    div.className = 'hinweis-item';
    div.innerHTML = `
      <button class="delete-btn" data-index="${index}">Löschen</button>
      <label>Bezeichnung:</label>
      <input type="text" class="hinweis-label" data-index="${index}" value="${escapeHtml(hinweis.label)}">
      <div class="hinweis-row">
        <label>Position:</label>
        <select class="hinweis-position" data-index="${index}">
          <option value="above" ${hinweis.position === 'above' ? 'selected' : ''}>Über dem Anschreibentext</option>
          <option value="below" ${hinweis.position === 'below' ? 'selected' : ''}>Unter dem Anschreibentext</option>
        </select>
      </div>
      <label>Text:</label>
      <textarea class="hinweis-text" data-index="${index}" rows="2">${escapeHtml(hinweis.text)}</textarea>
    `;
    container.appendChild(div);
  });

  // Event-Handler für Löschen-Buttons
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      customHinweise.splice(index, 1);
      renderHinweise();
    });
  });

  // Event-Handler für Änderungen
  container.querySelectorAll('.hinweis-label').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      customHinweise[index].label = e.target.value;
    });
  });

  container.querySelectorAll('.hinweis-position').forEach(select => {
    select.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      customHinweise[index].position = e.target.value;
    });
  });

  container.querySelectorAll('.hinweis-text').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      customHinweise[index].text = e.target.value;
    });
  });
}

// HTML escapen
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Neuen Hinweis hinzufügen
function addHinweis() {
  const newId = 'custom_' + Date.now();
  customHinweise.push({
    id: newId,
    label: 'Neuer Hinweis',
    text: '',
    position: 'below'
  });
  renderHinweise();

  // Zum neuen Eintrag scrollen
  const items = document.querySelectorAll('.hinweis-item:not(.default)');
  if (items.length > 0) {
    items[items.length - 1].scrollIntoView({ behavior: 'smooth' });
    items[items.length - 1].querySelector('.hinweis-label').focus();
  }
}

// Einstellungen speichern
async function saveSettings() {
  const status = document.getElementById('status');

  try {
    const anschreibenText = document.getElementById('default-anschreiben').value.trim();

    // Hinweise mit IDs und Position versehen falls nötig
    const hinweiseToSave = customHinweise.map((h, i) => ({
      id: h.id || 'custom_' + i,
      label: h.label.trim(),
      text: h.text.trim(),
      position: h.position || 'below'
    })).filter(h => h.label); // Leere Labels filtern

    await browser.storage.local.set({
      anschreibenText: anschreibenText,
      customHinweise: hinweiseToSave
    });

    status.textContent = 'Einstellungen wurden gespeichert!';
    status.className = 'status success';

    setTimeout(() => {
      status.className = 'status';
    }, 3000);

  } catch (e) {
    console.error('Fehler beim Speichern:', e);
    status.textContent = 'Fehler beim Speichern: ' + e.message;
    status.className = 'status error';
  }
}

// Auf Standard zurücksetzen
async function resetSettings() {
  if (!confirm('Möchtest du wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
    return;
  }

  const status = document.getElementById('status');

  try {
    await browser.storage.local.remove(['anschreibenText', 'customHinweise']);

    document.getElementById('default-anschreiben').value = DEFAULT_ANSCHREIBEN;
    customHinweise = [...DEFAULT_CUSTOM_HINWEISE];
    renderHinweise();

    status.textContent = 'Einstellungen wurden zurückgesetzt!';
    status.className = 'status success';

    setTimeout(() => {
      status.className = 'status';
    }, 3000);

  } catch (e) {
    console.error('Fehler beim Zurücksetzen:', e);
    status.textContent = 'Fehler beim Zurücksetzen: ' + e.message;
    status.className = 'status error';
  }
}

// Event-Handler
document.getElementById('add-hinweis-btn').addEventListener('click', addHinweis);
document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('reset-btn').addEventListener('click', resetSettings);

// Initialisieren
loadSettings();
