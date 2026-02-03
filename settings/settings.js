// Settings Script: Verwaltet Anschreiben-Vorlagen

// Standard-Anschreiben-Vorlagen
const DEFAULT_ANSCHREIBEN_VORLAGEN = [
  {
    id: 'standard',
    label: 'Standardausweis',
    text: 'Moin {{vorname}},\n\nmit diesem Schreiben erhältst du deinen Mitgliedsausweis, welcher nicht übertragbar und bis zum Ende deiner Mitgliedschaft gültig ist. Bitte löse den Ausweis vorsichtig aus der Perforierung und halte ihn beim Betreten des Hallenkomplexes unter den dort angebrachten Scanner.'
  },
  {
    id: 'ersatz',
    label: 'Ersatzausweis',
    text: 'Moin {{vorname}},\n\ndies ist ein Ersatzausweis. Der alte Ausweis verliert hiermit seine Gültigkeit.\n\nMit diesem Schreiben erhältst du deinen Mitgliedsausweis, welcher nicht übertragbar und bis zum Ende deiner Mitgliedschaft gültig ist. Bitte löse den Ausweis vorsichtig aus der Perforierung und halte ihn beim Betreten des Hallenkomplexes unter den dort angebrachten Scanner.'
  },
  {
    id: 'neuanmeldung',
    label: 'Neuanmeldung',
    text: 'Moin {{vorname}},\n\nherzlich willkommen bei Bremen1860! Wir freuen uns, dich als neues Mitglied begrüßen zu dürfen.\n\nMit diesem Schreiben erhältst du deinen Mitgliedsausweis, welcher nicht übertragbar und bis zum Ende deiner Mitgliedschaft gültig ist. Bitte löse den Ausweis vorsichtig aus der Perforierung und halte ihn beim Betreten des Hallenkomplexes unter den dort angebrachten Scanner.'
  }
];

// Verfügbare Variablen für Anschreiben
const AVAILABLE_VARIABLES = [
  { key: '{{vorname}}', description: 'Vorname des Mitglieds' },
  { key: '{{nachname}}', description: 'Nachname des Mitglieds' },
  { key: '{{name}}', description: 'Vollständiger Name' },
  { key: '{{profilId}}', description: 'Profil-ID / Mitgliedsnummer' },
  { key: '{{geburtsdatum}}', description: 'Geburtsdatum' },
  { key: '{{mitgliedSeit}}', description: 'Mitglied seit Datum' },
  { key: '{{strasse}}', description: 'Straße und Hausnummer' },
  { key: '{{plz}}', description: 'Postleitzahl' },
  { key: '{{ort}}', description: 'Stadt/Ort' }
];

// Feste Option (nicht editierbar)
const FIXED_ANSCHREIBEN = [
  { id: 'custom', label: 'Eigener Text...', text: '', fixed: true }
];

let anschreibenVorlagen = [];

// Einstellungen laden
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(['anschreibenVorlagen']);

    // Anschreiben-Vorlagen laden
    anschreibenVorlagen = result.anschreibenVorlagen || [...DEFAULT_ANSCHREIBEN_VORLAGEN];

    renderAnschreiben();
  } catch (e) {
    console.error('Fehler beim Laden:', e);
    anschreibenVorlagen = [...DEFAULT_ANSCHREIBEN_VORLAGEN];
    renderAnschreiben();
  }
}

// Anschreiben rendern
function renderAnschreiben() {
  const container = document.getElementById('anschreiben-list');
  container.innerHTML = '';

  // Feste Optionen (nur anzeigen, nicht editierbar)
  FIXED_ANSCHREIBEN.forEach(item => {
    const div = document.createElement('div');
    div.className = 'anschreiben-item default';
    div.innerHTML = `
      <label>Bezeichnung:</label>
      <input type="text" value="${item.label}" disabled>
      <small style="color: #888; font-size: 11px;">Diese Option erscheint immer als letzte Auswahl und erlaubt freie Texteingabe.</small>
    `;
    container.appendChild(div);
  });

  // Anschreiben-Vorlagen
  anschreibenVorlagen.forEach((vorlage, index) => {
    const div = document.createElement('div');
    div.className = 'anschreiben-item';
    div.innerHTML = `
      <button class="delete-btn" data-index="${index}">Löschen</button>
      <label>Bezeichnung:</label>
      <input type="text" class="anschreiben-label" data-index="${index}" value="${escapeHtml(vorlage.label)}">
      <label>Anschreibentext:</label>
      <textarea class="anschreiben-text" data-index="${index}" rows="4">${escapeHtml(vorlage.text)}</textarea>
    `;
    container.appendChild(div);
  });

  // Event-Handler für Löschen-Buttons
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      anschreibenVorlagen.splice(index, 1);
      renderAnschreiben();
    });
  });

  // Event-Handler für Änderungen
  container.querySelectorAll('.anschreiben-label').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      anschreibenVorlagen[index].label = e.target.value;
    });
  });

  container.querySelectorAll('.anschreiben-text').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      anschreibenVorlagen[index].text = e.target.value;
    });
  });
}

// HTML escapen
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Neues Anschreiben hinzufügen
function addAnschreiben() {
  const newId = 'custom_' + Date.now();
  anschreibenVorlagen.push({
    id: newId,
    label: 'Neues Anschreiben',
    text: ''
  });
  renderAnschreiben();

  // Zum neuen Eintrag scrollen
  const items = document.querySelectorAll('.anschreiben-item:not(.default)');
  if (items.length > 0) {
    items[items.length - 1].scrollIntoView({ behavior: 'smooth' });
    items[items.length - 1].querySelector('.anschreiben-label').focus();
  }
}

// Einstellungen speichern
async function saveSettings() {
  const status = document.getElementById('status');

  try {
    // Anschreiben-Vorlagen mit IDs versehen falls nötig
    const vorlagenToSave = anschreibenVorlagen.map((v, i) => ({
      id: v.id || 'custom_' + i,
      label: v.label.trim(),
      text: v.text.trim()
    })).filter(v => v.label); // Leere Labels filtern

    await browser.storage.local.set({
      anschreibenVorlagen: vorlagenToSave
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
    await browser.storage.local.remove(['anschreibenVorlagen']);

    anschreibenVorlagen = [...DEFAULT_ANSCHREIBEN_VORLAGEN];
    renderAnschreiben();

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

// Einstellungen exportieren
function exportSettings() {
  const status = document.getElementById('status');

  try {
    const exportData = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      anschreibenVorlagen: anschreibenVorlagen.map(v => ({
        id: v.id,
        label: v.label.trim(),
        text: v.text.trim()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'ausweis-einstellungen-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    status.textContent = 'Einstellungen wurden exportiert!';
    status.className = 'status success';

    setTimeout(() => {
      status.className = 'status';
    }, 3000);

  } catch (e) {
    console.error('Fehler beim Exportieren:', e);
    status.textContent = 'Fehler beim Exportieren: ' + e.message;
    status.className = 'status error';
  }
}

// Einstellungen importieren
function importSettings(file) {
  const status = document.getElementById('status');

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importData = JSON.parse(e.target.result);

      // Validierung - unterstützt sowohl neues als auch altes Format
      if (!importData.anschreibenVorlagen && !importData.customHinweise && !importData.anschreibenText) {
        throw new Error('Ungültiges Dateiformat');
      }

      // Neues Format (v2.0.0+)
      if (importData.anschreibenVorlagen && Array.isArray(importData.anschreibenVorlagen)) {
        anschreibenVorlagen = importData.anschreibenVorlagen.map((v, i) => ({
          id: v.id || 'imported_' + i,
          label: v.label || 'Importiert',
          text: v.text || ''
        }));
      }
      // Migration von altem Format (v1.x)
      else if (importData.customHinweise || importData.anschreibenText) {
        anschreibenVorlagen = [];

        // Alten Anschreibentext als erste Vorlage
        if (importData.anschreibenText) {
          anschreibenVorlagen.push({
            id: 'migrated_standard',
            label: 'Standardausweis',
            text: importData.anschreibenText
          });
        }

        // Alte Hinweise als separate Anschreiben mit kombiniertem Text migrieren
        if (importData.customHinweise && Array.isArray(importData.customHinweise)) {
          importData.customHinweise.forEach((h, i) => {
            const baseText = importData.anschreibenText || DEFAULT_ANSCHREIBEN_VORLAGEN[0].text;
            const combinedText = h.position === 'above'
              ? `${h.text}\n\n${baseText}`
              : `${baseText}\n\n${h.text}`;

            anschreibenVorlagen.push({
              id: h.id || 'migrated_' + i,
              label: h.label || 'Importiert',
              text: combinedText
            });
          });
        }
      }

      renderAnschreiben();

      status.textContent = 'Einstellungen wurden importiert! Klicke auf "Speichern" um sie zu übernehmen.';
      status.className = 'status success';

      setTimeout(() => {
        status.className = 'status';
      }, 5000);

    } catch (err) {
      console.error('Fehler beim Importieren:', err);
      status.textContent = 'Fehler beim Importieren: ' + err.message;
      status.className = 'status error';
    }
  };

  reader.onerror = () => {
    status.textContent = 'Fehler beim Lesen der Datei';
    status.className = 'status error';
  };

  reader.readAsText(file);
}

// Event-Handler
document.getElementById('add-anschreiben-btn').addEventListener('click', addAnschreiben);
document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('reset-btn').addEventListener('click', resetSettings);
document.getElementById('export-btn').addEventListener('click', exportSettings);
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    importSettings(e.target.files[0]);
    e.target.value = ''; // Reset für erneuten Import
  }
});

// Variablen-Liste rendern
function renderVariables() {
  const container = document.getElementById('variables-list');
  if (container) {
    container.innerHTML = AVAILABLE_VARIABLES.map(v =>
      `<div style="margin-bottom: 4px;"><code style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${v.key}</code> &ndash; ${v.description}</div>`
    ).join('');
  }
}

// Initialisieren
renderVariables();
loadSettings();
