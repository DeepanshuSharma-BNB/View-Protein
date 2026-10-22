# View Protein

**A standalone molecular structure viewer for Meta Ray-Ban Display glasses.**

**Website:** https://deepanshusharma-bnb.github.io/View-Protein/

Enter a PDB ID *on the glasses*, download its experimental coordinates directly from the RCSB Protein Data Bank, and inspect it using Neural Band wrist rotation, zoom, and selection. No Android companion APK, pairing code, or phone-browser app is required.

## Getting started

1. Register the website URL above under **Meta AI → Developer Mode → App connections → Add a web app**.
2. Open **View Protein** on the glasses.
3. Focus **FIND**, pinch to open the PDB entry panel, and enter a four-character PDB ID using the on-glasses text composer. Or choose one of the sample entries: **1UBQ** (ubiquitin), **1CRN** (crambin), **4HHB** (hemoglobin), **1AKI** (lysozyme).
4. Select **WRIST** and hold the Neural Band still briefly. Then rotate your wrist to inspect the structure.
5. Use the **ZOOM** buttons, **STYLE** to cycle cartoon/ribbon, sticks, spheres, and **CENTER** to reset the camera and wrist neutral position.

**Neural Band D-pad fallback:** In the main molecular viewer, left/right turn the structure, up/down zoom, and Select focuses the bottom toolbar. Within that toolbar, left/right selects a button, and Select activates it. On the PDB panel, Select acts on the selected option and arrows move among controls. A focused text input supports the Meta native dictation/handwriting/keyboard composer.

## How it works

- **3Dmol.js 2.5.5** renders the PDB or mmCIF atomic structure using WebGL.
- Browser `fetch()` calls the official **RCSB PDB** coordinate endpoint `https://files.rcsb.org/download/{id}.pdb` with a `.cif` fallback, plus the metadata endpoint `https://data.rcsb.org/rest/v1/core/entry/{id}`.
- On-glasses wrist rotation uses `RelativeOrientationSensor` with `sensorId: 'emg-wrist'`, neutral quaternion calibration and smoothing. Sensor permissions/availability may vary by firmware.
- GitHub Pages hosts the static app, while GitHub Actions packages the molecular viewer locally. The glasses still need internet access to RCSB, but **do not need to pair with a phone browser**.
- No app backend, cloud model storage, tracking or account is implemented. A phone may supply internet tethering to the glasses if required by the platform.

## App icon and registration stability

The existing molecular icon is provided as SVG source and automatically rasterized to **PNG 64×64, 192×192 and 512×512** during GitHub Pages deployment. The site advertises the PNG favicon, app manifest icons, name and stable canonical HTTPS URL so browsers and Meta can retrieve a compatible icon. The launcher icon ultimately shown is controlled by Meta AI and glasses firmware, and may be cached or replaced by a generic icon.

**Keep the installed web-app URL exactly:**
https://deepanshusharma-bnb.github.io/View-Protein/

Do not install test URLs, branch previews, links with query parameters, or URLs that change across deployments. The GitHub Pages address is stable unless the GitHub username, repository name or Pages configuration changes.

**App disappearance is controlled by Meta, not the web app.** Once registered, the installed-app list belongs to the Meta AI app/glasses; JavaScript in this web app cannot pin itself, re-register itself or prevent Meta from removing a registration. Manifest metadata and a permanent URL help make the app recognizable, but are not a guaranteed fix for developer-preview synchronization issues.

If the app disappears from both Meta AI and the glasses:
1. Verify Meta AI and the glasses firmware are current and **Developer Mode remains enabled**.
2. In Meta AI, open your connected Display glasses, go to **App connections → Web apps**, and re-add the exact HTTPS URL above. Check the app name and icon.
3. If it disappears again even while Meta AI remains open, capture the Meta AI app version, glasses firmware, approximate disappearance time and whether other custom web apps vanish. Report this to Meta as a registration/persistence bug; it cannot be repaired by web-page code.
4. Keep the URL bookmarked on your phone so re-adding it is straightforward. Avoid clearing Meta AI app data or resetting the glasses unless directed by support, as that may delete stored settings.

## Scientific and technical limitations

The viewer uses deposited coordinate models, not automatically reconstructed biological assemblies. It limits downloads to approximately **7 MB** to avoid overwhelming the glasses' GPU. Very large complexes, membrane proteins, or experimental structures that lack coordinates may be unsupported. WebGL support, RCSB access, on-glasses text composition, and wrist tracking still require physical-device testing.

Credit the [RCSB Protein Data Bank](https://www.rcsb.org/) for molecular structures and [3Dmol.js](https://3dmol.org/) for rendering.

## Developer workflow

Source files are public in this repository. Run `npm run check` and `npm test`. The GitHub Actions workflow builds, verifies and deploys to GitHub Pages automatically when changes land on `main`.


## App icon and reinstallation

The web app serves the existing View Protein molecular icon as `icon.svg` and generated PNG images (`icon-64.png`, `icon-192.png`, `icon-512.png`). The page exposes icon/manifest metadata and preserves the same canonical URL across releases.

**One-tap recovery link:** https://deepanshusharma-bnb.github.io/View-Protein/install.html

If the Meta AI phone app removes its Web Apps registration, bookmark that recovery page on the phone and tap **Add to Meta AI**, or register the URL manually via **App connections → Web apps → Add a web app**.

**Important:** The Meta AI app and glasses control which web apps stay registered. There is no supported website or PWA metadata API that lets View Protein force its registration to persist. Icons and an unchanging URL can improve discoverability and make reinstalls consistent, but cannot fix a Meta-side registration bug. The artwork is provided in compatible web formats; the Meta AI launcher may still choose its own app tile/icon. Check Developer Mode and device/app updates if registrations disappear; report repeated removals to Meta with app and glasses firmware versions.
