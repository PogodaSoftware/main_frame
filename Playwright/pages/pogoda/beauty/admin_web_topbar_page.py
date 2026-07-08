"""Selectors for the shared BeautyAdminWebTopbarComponent (`app-admin-web-topbar`).

The topbar appears on every post-auth admin page as part of the shared
admin-web chrome.  Scope all selectors to the component host element so they
are unambiguous when the CRM list also has its own `.aw-search` strip.
"""

# The topbar global search form + input
topbar_search_form   = "app-admin-web-topbar .awt-search"
topbar_search_input  = "app-admin-web-topbar input.awt-search-input"
topbar_search_clear  = "app-admin-web-topbar .awt-search-clear"
