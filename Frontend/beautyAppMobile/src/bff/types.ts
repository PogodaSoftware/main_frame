export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT' | 'NAV';

export interface BffLink {
  rel: string;
  href: string | null;
  method: HttpMethod;
  screen: string | null;
  route: string | null;
  prompt: string | null;
  params: Record<string, string | number> | null;
}

export interface BffField {
  name: string;
  type: 'email' | 'password' | 'text' | string;
  label: string;
  placeholder: string;
  required: boolean;
  min_length: number | null;
  pattern: string | null;
  autocomplete: string | null;
  inputmode: string | null;
  autocapitalize: string | null;
  secret_toggle: boolean;
  error_messages: Record<string, string>;
}

export interface BffFooterLink {
  rel: string;
  cta_class: string;
  group_class: string;
  label_prefix: string | null;
}

export interface BffForm {
  title: string;
  subtitle: string;
  fields: BffField[];
  submit: BffLink;
  success?: BffLink;
  presentation?: Record<string, unknown>;
  footer_links?: BffFooterLink[];
  error_status_map?: Record<string, string>;
  error_default?: string;
  include_device_id?: boolean;
}

export interface BffRenderEnvelope<TData = Record<string, unknown>> {
  action: 'render';
  screen: string;
  data?: TData;
  meta?: { title?: string };
  _links?: Record<string, BffLink>;
  form?: BffForm;
}

export interface BffRedirectEnvelope {
  action: 'redirect';
  redirect_to: string;
  reason: string;
  _links?: { self?: BffLink; target?: BffLink };
}

export type BffEnvelope<TData = Record<string, unknown>> =
  | BffRenderEnvelope<TData>
  | BffRedirectEnvelope;

export function isRedirect<TData>(env: BffEnvelope<TData>): env is BffRedirectEnvelope {
  return env.action === 'redirect';
}
