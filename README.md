# Kurabu Mitgliedsausweis Generator

Firefox-Addon zum Generieren von druckbaren Mitgliedsausweisen aus Kurabu-Profilen.

## Installation

### 1. Icons erstellen (einmalig)
1. Öffne `icons/create-icons.html` im Browser
2. Rechtsklick auf das 48x48 Bild → "Bild speichern unter" → `icons/icon-48.png`
3. Rechtsklick auf das 96x96 Bild → "Bild speichern unter" → `icons/icon-96.png`

### 2. Addon in Firefox laden
1. Öffne Firefox
2. Gib `about:debugging` in die Adressleiste ein
3. Klicke auf "Dieser Firefox" (links)
4. Klicke auf "Temporäres Add-on laden..."
5. Navigiere zum Ordner `kurabu-ausweis-addon` und wähle `manifest.json`

### 3. Permanente Installation (optional)
Für eine permanente Installation muss das Addon signiert werden:
- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/

## Verwendung

1. Öffne eine Kurabu-Mitgliederseite (z.B. `https://bremen1860.kurabu.com/de/admin/members/...`)
2. Klicke auf das Addon-Icon in der Toolbar
3. Die Mitgliederdaten werden automatisch erkannt
4. Klicke auf "PDF Ausweis erstellen"
5. Das PDF wird heruntergeladen und kann gedruckt werden

## PDF-Layout

Das generierte PDF enthält:
- **Oben**: Kurzes Anschreiben mit Vereinsname
- **Unten rechts**: Ausweiskarte im Scheckkartenformat (85x54mm)
  - Vereinsname
  - Name des Mitglieds
  - Profil-ID
  - Mitglied seit
  - QR-Code (enthält die Profil-ID)

## Anpassungen

### Vereinsname ändern
In `popup/popup.js` den Text "TV Bremen 1860" suchen und ersetzen.

### Kartenposition ändern
In `popup/popup.js` die Konstanten anpassen:
```javascript
const CARD_MARGIN_RIGHT = 15; // Abstand vom rechten Rand in mm
const CARD_MARGIN_BOTTOM = 15; // Abstand vom unteren Rand in mm
```

### Anschreiben-Text ändern
In `popup/popup.js` in der Funktion `generatePDF()` die `doc.text()` Aufrufe anpassen.

## Dateien

```
kurabu-ausweis-addon/
├── manifest.json       # Addon-Konfiguration
├── content.js          # Extrahiert Daten von der Kurabu-Seite
├── popup/
│   ├── popup.html      # Popup-UI
│   └── popup.js        # PDF- und QR-Generierung
├── lib/
│   ├── qrcode.min.js   # QR-Code Bibliothek
│   └── jspdf.umd.min.js# PDF Bibliothek
└── icons/
    ├── icon.svg        # Icon-Vorlage
    ├── icon-48.png     # 48px Icon (muss erstellt werden)
    └── icon-96.png     # 96px Icon (muss erstellt werden)
```

## Technische Details

- **Profil-ID Extraktion**: Sucht nach `data-testid="label-value-pair-profil-id"`
- **Name Extraktion**: Sucht nach `#member-name` oder `data-testid="label-value-pair-name"`
- **QR-Code Inhalt**: Nur die numerische Profil-ID (z.B. "0000000482")
- **PDF Format**: DIN A4, Portrait
