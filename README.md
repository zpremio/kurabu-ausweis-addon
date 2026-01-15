# Kurabu Mitgliedsausweis Generator

Firefox-Addon für **bremen 1860** zum Generieren von druckbaren Mitgliedsausweisen aus Kurabu-Profilen.

## Features

- Automatische Erkennung von Mitgliederdaten auf Kurabu-Seiten
- PDF-Generierung für **vorgedrucktes Briefpapier** (nur variable Daten werden gedruckt)
- QR-Code mit Profil-ID für Scanner am Halleneingang
- Download-Button direkt auf der Mitgliederseite
- Popup mit QR-Code-Vorschau

## Installation

### Temporär (Entwicklung)
1. Öffne Firefox und gehe zu `about:debugging`
2. Klicke auf "Dieser Firefox" (links)
3. Klicke auf "Temporäres Add-on laden..."
4. Wähle die `manifest.json` aus diesem Ordner

### Permanent (signiert)
1. Erstelle einen Account auf https://addons.mozilla.org/developers/
2. Erstelle eine ZIP-Datei des Addon-Ordners
3. Lade die ZIP unter "Eigene Add-ons verwalten" hoch (Selbstverteilung)
4. Installiere die signierte `.xpi`-Datei in Firefox

## Verwendung

### Option 1: Button auf der Seite
1. Öffne eine Kurabu-Mitgliederseite (`https://*.kurabu.com/*/admin/members/*`)
2. Der Button "Mitgliedsausweis" erscheint oben neben dem Mitgliedsnamen
3. Klicke auf den Button - das PDF wird automatisch heruntergeladen

### Option 2: Popup
1. Klicke auf das Addon-Icon in der Firefox-Toolbar
2. Die Mitgliederdaten und QR-Code-Vorschau werden angezeigt
3. Klicke auf "PDF Ausweis erstellen"

## PDF-Layout

Das PDF ist für **vorgedrucktes Briefpapier** konzipiert. Es werden nur die variablen Daten gedruckt:

### Anschreiben (oben)
- Empfängeradresse (Name, Straße, PLZ, Ort, ggf. Land)
- Datum
- Betreff "Neuer Ausweis"
- Anschreiben-Text
- Grußformel

### Ausweiskarte (unten rechts, 85x54mm)
- Name (fett)
- Geburtsdatum (fett)
- Profil-ID (fett)
- QR-Code (enthält nur die Profil-ID)

## Dateien

```
kurabu-ausweis-addon/
├── manifest.json          # Addon-Konfiguration (Manifest v2)
├── content.js             # Hauptlogik: Daten-Extraktion + PDF-Generierung
├── popup/
│   ├── popup.html         # Popup-UI
│   └── popup.js           # Popup-Steuerung (delegiert PDF an content.js)
├── lib/
│   ├── qrcode.min.js      # QR-Code Bibliothek (qrcodejs)
│   └── jspdf.umd.min.js   # PDF Bibliothek (jsPDF)
└── icons/
    ├── icon-48.png        # Toolbar-Icon
    └── icon-96.png        # Hochauflösendes Icon
```

## Anpassungen

### Positionen ändern
In `content.js` die Koordinaten anpassen (Einheit: mm, A4 = 210x297mm):

```javascript
// Kartenposition
const CARD_MARGIN_RIGHT = 15;  // Abstand vom rechten Rand
const CARD_MARGIN_BOTTOM = 15; // Abstand vom unteren Rand

// Adresse
let addressY = 43;    // Vertikale Position
const addressX = 28;  // Horizontale Position
```

### Anschreiben-Text ändern
In `content.js` in der Funktion `generatePDF()` die `doc.text()` Aufrufe anpassen.

### Farbe ändern
In `content.js` die CSS-Variable `#8B1A1A` (bremen 1860 Dunkelrot) ersetzen.

## Technische Details

- **Manifest Version**: 2 (Firefox)
- **Daten-Extraktion**: DOM-Queries mit `data-testid` Attributen
- **QR-Code**: Enthält nur die Profil-ID (z.B. "0000000482")
- **PDF Format**: DIN A4, Portrait, Einheit mm
- **Bibliotheken**: jsPDF, qrcodejs (lokal eingebunden)

## Lizenz

Entwickelt für bremen 1860 e.V.
