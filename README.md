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

## Scientific and technical limitations

The viewer uses deposited coordinate models, not automatically reconstructed biological assemblies. It limits downloads to approximately **7 MB** to avoid overwhelming the glasses' GPU. Very large complexes, membrane proteins, or experimental structures that lack coordinates may be unsupported. WebGL support, RCSB access, on-glasses text composition, and wrist tracking still require physical-device testing.

Credit the [RCSB Protein Data Bank](https://www.rcsb.org/) for molecular structures and [3Dmol.js](https://3dmol.org/) for rendering.

## Developer workflow

Source files are public in this repository. Run `npm run check` and `npm test`. The GitHub Actions workflow builds, verifies and deploys to GitHub Pages automatically when changes land on `main`.
