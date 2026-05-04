/** TypeScript shapes for the business application wizard payloads. */

export type ApplicationStep = 'entity' | 'services' | 'stripe' | 'schedule' | 'tools' | 'review';

export interface ApplicationDto {
  id: number;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  entity_type: '' | 'person' | 'business';
  itin_masked: string;
  has_itin: boolean;
  applicant_first_name: string;
  applicant_last_name: string;
  business_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  selected_categories: string[];
  third_party_tools: string[];
  completed_steps: string[];
  tos_accepted: boolean;
  submitted_at: string | null;
  next_incomplete_step: ApplicationStep | null;
  is_ready_to_submit: boolean;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export interface ToolOption {
  value: string;
  label: string;
}

export interface WeeklyHourRow {
  day_of_week: number;
  day_label: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  is_24h: boolean;
}

export interface WizardData {
  step: ApplicationStep;
  step_index: number;
  total_steps: number;
  step_title: string;
  application: ApplicationDto;
  business: { email: string; business_name: string };
  submit_href: string;
  submit_method: 'PATCH';
  submit_step_key: ApplicationStep;
  category_options?: CategoryOption[];
  tool_options?: ToolOption[];
  weekly_hours?: WeeklyHourRow[];
  availability_href?: string;
  availability_method?: string;
  stripe_copy?: string;
  tos_text?: string;
  submit_application_href?: string;
  submit_application_method?: string;
  success_screen?: string;
  category_labels?: string[];
  tool_labels?: string[];
}
