# Security & Privacy

LEFT EYE is a static creative prototype. This document describes the current public release package and its limits; it is not a security certification or penetration-test report.

## Current safeguards

- No AI provider integration, API-key input/storage, or application backend is included.
- The app does not include application-owned `fetch`, XHR, WebSocket, `sendBeacon`, EventSource, cookie, `localStorage`, or `sessionStorage` calls.
- User-entered and mapped text is rendered using text APIs; app JavaScript has no `innerHTML` assignment.
- HTML contains no inline JavaScript blocks or inline event-handler attributes.
- A restrictive meta Content Security Policy disallows app-initiated connection APIs (`connect-src 'none'`), plugins, frames, and inline scripts. A `no-referrer` policy is set, and external script tags suppress referrer information.
- Front-end libraries are version-pinned in their CDN URLs. Google Fonts and analytics have been removed.
- Speech recognition only attempts explicitly supported on-device processing; it does not fall back to cloud transcription.
- Camera access starts only after user interaction and browser permission. The camera feature samples brightness locally and is not eye tracking.
- GitHub Actions runs `npm test`, disables persisted checkout credentials, and deploys only required static runtime files and assets.

## Remaining risks

1. **Third-party CDN code is still trusted.** Tailwind Play CDN, Three.js, OrbitControls, and Lucide execute in the page. Their providers can receive basic network metadata such as IP address and request time. Version-pinned URLs help limit unexpected version drift but are not equivalent to Subresource Integrity or self-hosted dependencies.
2. **Tailwind Play CDN is development-oriented.** Tailwind recommends it for prototyping rather than production. For a longer-lived public release, compile CSS at build time and self-host version-verified dependencies.
3. **The CSP is delivered in a meta tag.** Some directives, including `frame-ancestors`, cannot be fully enforced from meta CSP. A host with custom response-header support could add stronger headers such as `X-Content-Type-Options` and an appropriate `Permissions-Policy`.
4. **The full live origin has not been verified.** `npm test` and static checks pass, but this preparation environment blocked Chromium navigation to the local HTTP server. Perform the browser checklist in [`TEST_REPORT.md`](TEST_REPORT.md) after deployment.
5. **User behaviour matters.** Do not enter real patient data, private health records, passwords, or other sensitive information into a public demo. Printed reports can contain the text entered by the user. GitHub and the hosting provider still receive ordinary account and web-request metadata.

## Reporting a vulnerability

Do not post secrets, personal data, patient information, or exploit details that expose another person's data in a public issue. Use GitHub's private vulnerability reporting for the repository if it is enabled, or contact the repository maintainer privately through GitHub.

## Verification

Run `npm test` to execute the repository's static and local-engine checks. These checks are useful regression guards, but they are not a substitute for dependency review, live browser verification, or a security audit.
