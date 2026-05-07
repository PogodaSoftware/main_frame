import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

const PRICE_RX = /^\d+(\.\d{1,2})?$/;

@Component({
  selector: 'app-prov-price-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BeautyProviderPriceInputComponent),
    multi: true,
  }],
  template: `
    <div class="price-wrap">
      <div class="price-input" [class.has-error]="hasError">
        <span class="prefix" aria-hidden="true">$</span>
        <input
          [id]="inputId"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          [pattern]="rx"
          [placeholder]="placeholder"
          [(ngModel)]="value"
          (ngModelChange)="onChangeText($event)"
          (blur)="onBlur()"
          [disabled]="disabled"
          [attr.aria-invalid]="hasError ? 'true' : null"
          [attr.aria-describedby]="errorMsg ? inputId + '-err' : null"
        />
      </div>
      <div class="hint">{{ hint }}</div>
      <div class="err" *ngIf="errorMsg" [id]="inputId + '-err'" role="alert">{{ errorMsg }}</div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .price-input {
      display: flex; align-items: center;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      height: 44px;
      padding: 0 12px;
      font-family: var(--font-mono);
    }
    .price-input.has-error { border-color: var(--danger); }
    .prefix {
      color: var(--text-muted);
      font-size: 14px; font-weight: 500;
      margin-right: 8px;
      padding-right: 8px;
      border-right: 1px solid var(--line);
      font-family: var(--font-body);
    }
    input {
      flex: 1; border: none; outline: none; background: transparent;
      font-family: inherit; font-size: 14px;
      color: var(--text); min-width: 0;
    }
    input:disabled { color: var(--text-muted); }
    .hint {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 6px;
      font-family: var(--font-mono);
    }
    .err {
      font-size: 11px;
      color: var(--danger);
      margin-top: 4px;
    }
  `],
})
export class BeautyProviderPriceInputComponent implements ControlValueAccessor {
  @Input() inputId = 'prov-price-' + Math.random().toString(36).slice(2, 9);
  @Input() placeholder = '50.00';
  @Input() hint = 'US dollars · decimals OK';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  value = '';
  errorMsg = '';
  hasError = false;
  rx = PRICE_RX.source;

  private onChangeFn: (v: string) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(v: string | number | null): void {
    if (v == null || v === '') {
      this.value = '';
    } else {
      this.value = String(v);
    }
  }
  registerOnChange(fn: (v: string) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  onChangeText(next: string) {
    this.value = next;
    this.validate();
    this.onChangeFn(this.value);
    this.valueChange.emit(this.value);
  }

  onBlur() {
    this.onTouchedFn();
    if (!this.value) { this.hasError = false; this.errorMsg = ''; return; }
    if (PRICE_RX.test(this.value)) {
      const num = parseFloat(this.value);
      if (!isNaN(num)) {
        this.value = num.toFixed(2);
        this.onChangeFn(this.value);
        this.valueChange.emit(this.value);
      }
      this.hasError = false; this.errorMsg = '';
    } else {
      this.hasError = true;
      this.errorMsg = 'Use up to 2 decimal places (e.g. 49.99).';
    }
  }

  private validate() {
    if (!this.value) { this.hasError = false; this.errorMsg = ''; return; }
    this.hasError = !PRICE_RX.test(this.value);
    this.errorMsg = this.hasError ? 'Use up to 2 decimal places (e.g. 49.99).' : '';
  }
}
