# Piano Progress

A small practice tracker for relearning scales hands together. The circle of fifths shows all 24 major and minor keys, colored by status. Open a scale for its spelling, key signature, standard two-octave fingerings, and a keyboard you can play.

UI text is in English. Note names also appear in French solfège (`do ré mi fa sol la si`) as a smaller label.

## Features

- Interactive circle of fifths. The outer ring is the major keys (C, G, D, A, E, B, F♯/G♭, D♭, A♭, E♭, B♭, F) with the key signature. The inner ring is the relative minor.
- Green means mastered, amber means in progress, and a dashed red outline means not started. The center shows how many of the 24 are mastered.
- A “next up” suggestion walks clockwise from C, continuing the first scale still in progress, or the first one not started.
- Scale detail: status, key signature, relative major or minor, and the notes with correct spelling (one letter each, including E♯ and double sharps such as F×).
- Minor scales switch between natural, harmonic, and melodic. Harmonic is the default. Melodic raises 6 and 7 on the way up and comes down natural. Raised notes are highlighted.
- A two-octave keyboard with standard fingerings for both hands, including the usual exceptions (F♯, D♭, B♭, E♭, A♭, and the minor exceptions F♯m, C♯m, G♯m, D♯m, B♭m).
- Optional notes and a last-practiced date for each scale.
- Sound, via the Web Audio API. Browsers block audio until a click or key press, so **Enable sound** stays in the header until the audio context is actually running. After that, hovering a scale plays its tonic (debounced); on a touch screen, the tap plays it. Hovering or tapping a keyboard key plays that note. **Play scale** runs the two octaves up and back down at a tempo you set, lighting each key as it sounds. Mute and volume live in the header and are remembered in this browser. Acoustic grand samples are loaded from the public soundfont CDN when the browser can reach it. If that download fails, or no notes decode, a piano-style synth plays instead.

On iPhone and iPad, Safari follows the hardware silent switch: if the ringer is muted, this page is muted too. Flip the switch to ring, turn the volume up, and tap **Enable sound** once. A context created from a hover, before any tap, cannot be started on Safari.

Pieces and resources are reserved in the data file and have placeholder tabs. They are not built out yet.

## Progress, on this browser and across devices

The saved shape is:

```json
{
  "version": 1,
  "scales": { "C": { "status": "mastered" } },
  "pieces": [],
  "resources": []
}
```

1. Every edit is written to `localStorage` in this browser.
2. `public/progress.json` is the committed default. On the first visit, when `localStorage` is empty, the app loads that file.
3. Settings can store a fine-grained GitHub personal access token in `localStorage` only. **Save to GitHub** commits `public/progress.json` on `JulesRive/piano-progress-tracker` (`main`) through the GitHub contents API. **Load from GitHub** reads that file back. The token is not written into the repo; it is sent only to `api.github.com` when you click Save or Load. Create the token with Contents read and write on this repository and no other permissions.
4. Export JSON and Import JSON are the offline fallback. Reset restores the committed `progress.json`.

Saving to GitHub commits on `main`, which also redeploys the site. If GitHub already has a newer file, load it before saving again.

The starting file has C major, A minor, G major, and D major mastered, and E minor and B minor in progress (harmonic). Everything else is not started.

## Run locally

```bash
npm install
npm test
npm run dev
```

The dev server prints a local URL. Production build:

```bash
npm run build
npm run preview
```

Vite’s `base` is `/piano-progress-tracker/`, matching the GitHub Pages project URL.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the app and deploys `dist` with `actions/deploy-pages` on every push to `main`.

In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions** (if it is not already). The site is then published at:

https://julesrive.github.io/piano-progress-tracker/

The first deployment can take a minute after the workflow finishes. Pages will not update until that source setting is GitHub Actions.
