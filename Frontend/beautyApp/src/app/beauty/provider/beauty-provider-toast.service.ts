import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ToastPayload {
  conversationId: number | string;
  sender: string;
  service: string;
  preview: string;
  time?: string;
}

@Injectable({ providedIn: 'root' })
export class BeautyProviderToastService {
  private readonly current$ = new Subject<ToastPayload | null>();
  events$: Observable<ToastPayload | null> = this.current$.asObservable();

  show(payload: ToastPayload): void {
    this.current$.next(payload);
  }

  dismiss(): void {
    this.current$.next(null);
  }
}
