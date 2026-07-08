"""Page object for business bookings screen (/(business)/bookings)."""
from playwright.sync_api import Page

bookings_heading = ":text('Bookings')"
bookings_upcoming_section = ":text('Upcoming')"
bookings_past_section = ":text('Past')"
bookings_empty_upcoming = ":text('No upcoming bookings')"
