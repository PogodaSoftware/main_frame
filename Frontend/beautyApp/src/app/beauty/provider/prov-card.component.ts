import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-prov-card',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="prov-card" [style.padding]="paddingStyle"><ng-content></ng-content></div>`,
  styles: [`
    :host { display: block; }
    .prov-card {
      background: #FFFFFF;
      border: 1px solid #DCDCDF;
      border-radius: 14px;
    }
  `],
})
export class BeautyProviderCardComponent {
  @Input() padding: number | string = 16;
  get paddingStyle(): string {
    return typeof this.padding === 'number' ? this.padding + 'px' : this.padding;
  }
}
