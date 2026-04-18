/**
 * BFF response types
 * ------------------
 * Shared TypeScript model for the HATEOAS envelope and dynamic form
 * schema returned by /api/bff/beauty/resolve/. The shell and every
 * presentational component import from here so the contract is in one
 * place.
 */

export type BffAction = 'render' | 'redirect';

export type LinkMethod = 'NAV' | 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

export interface BffLink {
  rel: string;
  href: string | null;
  method: LinkMethod;
  screen: string | null;
  route: string | null;
  prompt: string | null;
}

export interface BffFieldSchema {
  name: string;
  type: 'text' | 'email' | 'password';
  label: string;
  placeholder: string;
  required: boolean;
  min_length: number | null;
  autocomplete: string | null;
  inputmode: string | null;
  autocapitalize: string | null;
  secret_toggle: boolean;
  error_messages: Partial<Record<'required' | 'min_length' | 'pattern' | 'email' | 'server', string>>;
}

export interface BffFooterLink {
  rel: string;
  cta_class: string;
  group_class: string;
  label_prefix: string | null;
}

export interface BffFormPresentation {
  page_class: string;
  main_class: string;
  title_class: string;
  subtitle_class: string;
  form_class: string;
  submit_class: string;
  header_brand_icon: string;
  header_brand_label: string;
  header_badge_text?: string;
  header_badge_class?: string;
  footer_label?: string;
  footer_class?: string;
  show_field_labels?: boolean;
}

export interface BffFormSchema {
  title: string;
  subtitle: string;
  fields: BffFieldSchema[];
  submit: BffLink;
  success: BffLink;
  presentation: BffFormPresentation;
  footer_links: BffFooterLink[];
  error_status_map: Record<string, string>;
  error_default: string;
  include_device_id: boolean;
}

export interface BffResponse {
  action: BffAction;
  screen?: string;
  data?: Record<string, unknown>;
  meta?: { title?: string };
  /** HATEOAS link envelope. Keyed by rel. */
  _links?: Record<string, BffLink>;
  /** Dynamic form schema for screens that render a form. */
  form?: BffFormSchema;
  /** Legacy redirect target (string) — still emitted for backward compat. */
  redirect_to?: string;
  reason?: string;
  app_version?: string;
  needs_update?: boolean;
}
