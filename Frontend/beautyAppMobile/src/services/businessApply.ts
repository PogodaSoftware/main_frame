/**
 * Business application wizard REST shim.
 *
 * PATCH the wizard application with a `{ step, ...fields }` payload to
 * persist a step's data and append it to `completed_steps`. POST the
 * `submit` endpoint from the review step to finalize. Both endpoints
 * come from the BFF envelope (`data.submit_href` / `submit_application_href`)
 * so we follow whatever the backend hands us rather than hard-coding.
 */
import { api } from '@/services/api';

export interface ApplicationPatchResponse {
  application?: Record<string, unknown>;
}

export async function patchApplicationStep(
  href: string,
  step: string,
  fields: Record<string, unknown>,
): Promise<ApplicationPatchResponse> {
  const resp = await api.patch<ApplicationPatchResponse>(href, {
    step,
    ...fields,
  });
  return resp.data;
}

export async function submitApplication(href: string, acceptTos = true): Promise<unknown> {
  const resp = await api.post(href, { accept_tos: acceptTos });
  return resp.data;
}

export async function putWeeklyHours(
  href: string,
  rows: WeeklyHourRow[],
  timezone?: string,
): Promise<unknown> {
  const body: Record<string, unknown> = { weekly_hours: rows };
  if (timezone) body.timezone = timezone;
  const resp = await api.put(href, body);
  return resp.data;
}

export interface WeeklyHourRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  is_24h: boolean;
}
