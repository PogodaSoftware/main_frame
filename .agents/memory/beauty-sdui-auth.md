---
name: Beauty SDUI auth gate
description: Where access decisions live in the Beauty SDUI/BFF architecture, and why client-side screen bypasses are a security bug.
---

# Beauty SDUI access decisions belong to the BFF resolver

In the `/pogoda/beauty` app the Angular shell (`BeautyShellComponent`) is a thin
server-driven-UI renderer: for every screen it calls the BFF resolve endpoint and
renders whatever envelope comes back (`render` or `redirect`). The resolver is the
authoritative place that decides whether a caller may see a screen — it validates
the device-bound session cookie and returns a redirect-to-login envelope for
anonymous callers.

**Rule:** never add a client-side special-case that renders a screen locally
without calling the resolver. Doing so lets the client override the server's
access decision.
**Why:** that is exactly how the wireframe route leaked — the shell
short-circuited `beauty_wireframe` and rendered it without ever asking the BFF, so
the server's auth gate was dead code and anonymous users saw the page. The server
resolver is the only trustworthy gate; the Angular route guards
(`beautyAuthGuard` / `beautyBusinessAuthGuard`) run in the client and are
defense-in-depth only, so they can be skipped by a determined user.
**How to apply:** when adding a beauty screen, register a resolver that performs
the access check, add the matching route with the appropriate guard, and let the
shell resolve it normally. If you're tempted to `return of({...})` locally in the
shell for a screen, that's the smell — route it through the BFF instead.

**Residual note:** screen *content* baked into a client component (e.g. inline
template HTML) ships in `main.js` to everyone regardless of the gate. If a screen's
body must be truly invisible to anonymous users, serve it in the resolver's `data`
payload rather than hardcoding it in the component.
