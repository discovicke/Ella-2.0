import { Injectable, signal } from '@angular/core';

export interface ToastConfig {
  title?: string;
  duration?: number; // ms, default 6000
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  title: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();
  private nextId = 0;
  private readonly DEFAULT_DURATION = 6000;

  show(message: string, type: 'success' | 'error' | 'info' = 'info', config?: ToastConfig) {
    const id = this.nextId++;
    const duration = config?.duration ?? this.DEFAULT_DURATION;
    
    // Default titles if not provided
    let title = config?.title;
    if (!title) {
      switch (type) {
        case 'success': title = 'Success'; break;
        case 'error': title = 'Error'; break;
        case 'info': title = 'Info'; break;
      }
    }

    const newToast: Toast = { 
      id, 
      message, 
      type, 
      title: title || '', 
      duration 
    };
    
    this.toastsSignal.update(toasts => [...toasts, newToast]);
  }

  showSuccess(message: string, config?: ToastConfig) {
    this.show(message, 'success', config);
  }

  showError(message: string, config?: ToastConfig) {
    this.show(message, 'error', config);
  }

  showInfo(message: string, config?: ToastConfig) {
    this.show(message, 'info', config);
  }

  remove(id: number) {
    this.toastsSignal.update(toasts => toasts.filter(t => t.id !== id));
  }
}