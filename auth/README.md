# Archived site authentication gate

This folder stores the homepage authentication code that was previously active on `index.html`.

## What the previous approach did

- Injected a full-screen login overlay into the homepage at runtime (`auth-gate.js`).
- Required a username and password before users could interact with homepage links.
- Compared entered credentials against values defined in `auth-config.js`.
- Saved successful login state in `sessionStorage` under the key `site-authenticated`, so users stayed signed in for the current browser tab/session.

## Files

- `auth-gate.js` — client-side auth overlay UI, credential check, and session handling.
- `auth-config.js` — username/password configuration object attached to `window.AUTH_CONFIG`.

## Security note

This approach is client-side only and should be treated as lightweight gating, not secure authentication. Credentials are delivered to the browser and can be inspected.

## Re-enable later

To re-enable this behavior on the homepage, include the scripts at the end of `index.html`:

```html
<script src="./auth/auth-config.js"></script>
<script src="./auth/auth-gate.js"></script>
```
