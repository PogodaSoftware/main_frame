"""Locators for the admin CRM screen."""

crm_page_root = "css=[data-testid='crm-page']"
crm_shell = "css=div.beauty-app"
crm_sub_header = "css=.prov-sub-header"
crm_search_input = "css=[data-testid='crm-search-input']"
crm_search_submit = "css=[data-testid='crm-search-submit']"
tab_all = "css=[data-testid='crm-tab-all']"
tab_customer = "css=[data-testid='crm-tab-customer']"
tab_business = "css=[data-testid='crm-tab-business']"
empty = "css=[data-testid='crm-empty']"
page_info = "css=[data-testid='crm-page-info']"
prev_btn = "css=[data-testid='crm-prev']"
next_btn = "css=[data-testid='crm-next']"
suspended_badge = "css=[data-testid='crm-row-suspended']"
suspended_card = "css=article.crm-card.is-suspended"
all_cards = "css=article.crm-card"
all_types = "css=.crm-type"
flags_nav_btn = "css=[data-testid='crm-nav-flags']"
admin_badge = "css=[data-testid='crm-admin-badge']"


def suspend_btn(kind: str, _id: int) -> str:
    return f"css=[data-testid='crm-suspend-{kind}-{_id}']"


def reinstate_btn(kind: str, _id: int) -> str:
    return f"css=[data-testid='crm-reinstate-{kind}-{_id}']"
