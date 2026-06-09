/**
 * Retired service-detail screen.
 * ------------------------------
 * The old Tamagui service page (View provider / Save / inline SlotPickerForm)
 * is no longer used — the booking calendar/time picker on the `book` screen is
 * the canonical "choose a service slot" page. Anything that still lands on
 * `/(customer)/service/:id` (stale link, old bundle, deep link) is redirected
 * to `/(customer)/book/:serviceId` so the customer always gets the calendar.
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RetiredServiceDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/(customer)/book/${id}` as any} />;
}
