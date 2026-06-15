Feature: Beauty Admin Portal — Dashboard (desktop)
  As a Beauty admin
  I want the desktop dashboard to render real data and respond to controls
  So that I can monitor the platform at a glance.

  Background:
    Given I am signed in as a Beauty admin viewing the dashboard

  Scenario: The dashboard renders real KPI counts
    Then the dashboard chrome should render
    And the Customers KPI should equal the real customer count

  Scenario: The range filter re-resolves the trend window
    When I switch the dashboard range to "Last 30 days"
    Then the trend sub-label should read "Last 30 days · daily signups"
    And the range button should read "Last 30 days"

  Scenario: The notification bell mirrors the BFF notifications feed
    When I open the notification bell
    Then the dropdown should list the same number of items as the BFF feed
    And the bell badge should match the BFF unread count
