import { Injectable, signal } from '@angular/core';

export type ConfirmIcon = 'warning' | 'question' | 'info';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: ConfirmIcon;
  dangerConfirm?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmService {
  // --- Signals exposed to the component ---
  readonly isOpen = signal(false);
  readonly message = signal('');
  readonly title = signal('Bekräfta');
  readonly confirmText = signal('Ja');
  readonly cancelText = signal('Avbryt');
  readonly icon = signal<ConfirmIcon>('warning');
  readonly dangerConfirm = signal(true);

  private resolveRef: ((value: boolean) => void) | null = null;

  /**
   * Show a confirm dialog and return a promise that resolves to true/false.
   */
  show(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    this.message.set(message);
    this.title.set(options.title ?? 'Bekräfta');
    this.confirmText.set(options.confirmText ?? 'Ja');
    this.cancelText.set(options.cancelText ?? 'Avbryt');
    this.icon.set(options.icon ?? 'warning');
    this.dangerConfirm.set(options.dangerConfirm ?? true);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';

    return new Promise((resolve) => {
      this.resolveRef = resolve;
    });
  }

  /** Resolves the promise with true and closes the dialog. */
  confirm(): void {
    this.resolveRef?.(true);
    this._close();
  }

  /** Resolves the promise with false and closes the dialog. */
  cancel(): void {
    this.resolveRef?.(false);
    this._close();
  }

  private _close(): void {
    this.isOpen.set(false);
    this.resolveRef = null;
    document.body.style.overflow = '';
  }

  // --- Convenience methods ---

  /** Red confirm button – for destructive actions (delete, remove). */
  danger(message: string, title = 'Varning'): Promise<boolean> {
    return this.show(message, {
      title,
      icon: 'warning',
      confirmText: 'Ta bort',
      cancelText: 'Avbryt',
      dangerConfirm: true,
    });
  }

  /** Neutral confirm button – for standard confirmations. */
  standard(message: string, title = 'Bekräfta'): Promise<boolean> {
    return this.show(message, {
      title,
      icon: 'question',
      confirmText: 'Ja',
      cancelText: 'Nej',
      dangerConfirm: false,
    });
  }
}
