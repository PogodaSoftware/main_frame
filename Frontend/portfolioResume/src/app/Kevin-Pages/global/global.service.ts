import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class KevinGlobalService {
  openPage(url: string): void {
    window.open(url, '_blank');
  }
}
