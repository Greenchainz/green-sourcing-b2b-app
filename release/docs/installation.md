# Installation Guide

## Revit Plugin

### Requirements
- Autodesk Revit 2024 or 2025
- Windows 10/11
- .NET Framework 4.8+
- Internet connection (HTTPS)

### Installation Steps

1. Download the GreenChainz Revit plugin package
2. Close Revit if running
3. Copy `GreenChainz.addin` to:
   ```
   %APPDATA%\Autodesk\Revit\Addins\2025\
   ```
4. Copy `GreenChainz.dll` (and `/lib` folder if present) to:
   ```
   C:\Program Files\GreenChainz\Revit\
   ```
5. Launch Revit
6. The GreenChainz panel appears in the ribbon toolbar
7. Click "Login" to authenticate with your GreenChainz account

### Troubleshooting

- **Panel not visible:** Check that `.addin` file is in the correct Addins folder for your Revit version
- **Login fails:** Ensure your firewall allows HTTPS to `greenchainz.com`
- **Login fails:** Ensure your firewall allows HTTPS to `greenchainz.com`
- **Data not loading:** Verify internet connection and API status

---

## Forma Extension

### Requirements
- Autodesk Forma (current version)
- Modern browser (Chrome, Edge, Firefox)
- GreenChainz account

### Installation Steps

1. Open Autodesk Forma
2. Navigate to the Extensions panel
3. Search for "GreenChainz" or enable via extension URL
4. Click "Enable"
5. Authenticate with your GreenChainz account
6. The GreenChainz panel appears in your Forma workspace

### Troubleshooting

- **Extension not found:** Ensure you're on the latest Forma version
- **Auth redirect fails:** Check browser popup blocker settings
- **Data not rendering:** Clear browser cache and reload
