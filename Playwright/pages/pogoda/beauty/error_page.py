"""Locators for the Beauty error pages: generic, not-found, offline, and the
catch-all wildcard route.

All variants share the same `BeautyErrorComponent` template rendered as
role=alert (div.err-card) inside div.err-wrap. Copy and CTAs differ per
variant (see feature file for per-variant assertions).

DOM facts (verified live):
  root: div[role='alert'].err-card   (inside :host > div.err-wrap)
  eyebrow: div.err-eyebrow
  title: h1.err-title
  body:  p.err-body
  CTAs:  div.err-actions > button.btn.btn--primary | button.btn.btn--secondary
  No code.err-code element exists in the redesigned component.

Per-variant CTAs:
  generic:           btn--primary="Refresh", btn--secondary="Contact support"
  notfound/catchall: btn--primary="Back home" only
  offline:           btn--secondary="Try again" only
"""

# Root: the role=alert card — present on every variant.
error_page_root = "css=div.err-card[role='alert']"

# Copy — present on every variant.
eyebrow = "css=div.err-card div.err-eyebrow"
title = "css=div.err-card h1.err-title"
body = "css=div.err-card p.err-body"

# Icon disc — present on every variant.
sparkle = "css=div.err-card div.err-disc"

# Any CTA button in the actions container — present on every variant.
any_cta_button = "css=div.err-card div.err-actions button"

# Primary CTA (Refresh / Back home) — generic + notfound/catchall variants.
primary_cta_button = "css=div.err-card button.btn--primary"

# Secondary CTA — generic: Contact support; offline: Try again.
secondary_cta_button = "css=div.err-card button.btn--secondary"

# Named CTAs for targeted assertions.
try_again_button = "css=div.err-card button:has-text('Try again')"
go_home_button = "css=div.err-card button.btn--primary"
contact_support_link = "css=div.err-card button:has-text('Contact support')"
