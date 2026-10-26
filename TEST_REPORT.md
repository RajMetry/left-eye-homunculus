# LEFT EYE — Release Test Report

**Release package:** `left-eye-homunculus` 1.0.0  
**Scope:** Static source checks and local-engine unit tests for the packaged repository.

## Automated checks

Run from the repository root with Node.js installed:

```bash
npm test
```

The release checks currently pass for:

- JavaScript and theme configuration syntax.
- Unique HTML IDs and statically referenced DOM elements.
- Core interaction handlers and release asset references.
- Keyword mapping for body-part descriptions, including no invented regions for unrelated text.
- Data validation, numeric bounds, and safe text handling.
- Privacy invariants: no AI provider API integration, no API-key fields, no app-owned network/storage calls, no inline handlers/scripts, no third-party font requests, CSP, and no-referrer policy.
- GitHub Pages workflow stages the HTML, JavaScript, styles, configuration, and `assets/` folder.

## Browser verification

A local HTTP smoke check returned **200 OK** for `index.html`, `app.js`, `styles.css`, `tailwind-config.js`, the favicon, and the README banner. A full interactive browser run is **not marked as passed**: the available Chromium environment blocked navigation to the local HTTP test server with `ERR_BLOCKED_BY_ADMINISTRATOR`, so WebGL rendering and interactive end-to-end behaviour could not be confirmed here. CDN-hosted assets also require internet access.

Before calling the site live-ready, verify on your own machine after deployment:

1. The page loads with no console errors and the 3D figure renders.
2. Drag, zoom, camera reset, auto-rotate, HUD tags, and region selection work.
3. All three presets update the visualizer and report consistently.
4. Typed chest/hand/arm/head metaphors map locally; unrelated text does not invent affected regions.
5. Space toggles eye mode without intercepting typing in a form field.
6. Speech is unavailable/falls back to typing when on-device recognition is not explicitly supported; no cloud fallback occurs.
7. Camera access begins only after a user click and permission; the manual Cover Test works.
8. The report opens, fills correctly, and prints / saves as PDF.
9. Browser DevTools Network shows only the pinned third-party library CDN requests; app connection APIs remain blocked by CSP.
10. The GitHub Pages workflow succeeds and the deployed URL passes the same smoke tests.

## Known limitations

- The project is a creative, unvalidated prototype, not clinical software or evidence of a health/psychological condition.
- The camera feature samples brightness; it is not eye tracking.
- Local mapping uses a small keyword ruleset and can miss context.
- Third-party CDN scripts are still trusted code executing in the page. A production-hardening follow-up should self-host verified dependencies and compile Tailwind CSS instead of using the development-oriented Play CDN.
