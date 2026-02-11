import { Injectable, Type, signal, computed } from '@angular/core';

export interface ModalOptions<T = any> {
  title?: string;
  data?: T;
  width?: string; // T.ex. '500px' eller '80vw'
  hideCloseButton?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  // Vilken komponent som ska visas inuti modalen
  private activeComponentSignal = signal<Type<any> | null>(null);
  
  // Inställningar för nuvarande modal
  private optionsSignal = signal<ModalOptions>({});
  
  // Synlighet
  private isOpenSignal = signal<boolean>(false);

  // Exponera read-only signaler till komponenterna
  readonly activeComponent = this.activeComponentSignal.asReadonly();
  readonly options = this.optionsSignal.asReadonly();
  readonly isOpen = this.isOpenSignal.asReadonly();

  // Hjälpare för att hämta data i child-komponenten
  readonly modalData = computed(() => this.optionsSignal().data);

  /**
   * Öppnar en modal med angiven komponent och inställningar.
   * @param component Komponenten som ska renderas i modal-kroppen
   * @param options Titel, data, bredd etc.
   */
  open<T>(component: Type<any>, options?: ModalOptions<T>) {
    this.activeComponentSignal.set(component);
    this.optionsSignal.set(options || {});
    this.isOpenSignal.set(true);
    document.body.style.overflow = 'hidden'; // Förhindra scroll på bakgrunden
  }

  /**
   * Stänger modalen.
   */
  close() {
    this.isOpenSignal.set(false);
    
    // TODO: Implementera fördröjning här så att ut-animationen hinner spelas klart innan komponenten rensas
    // Rensa efter animationen (vi använder setTimeout eller bara rensar direkt beroende på CSS-setup, 
    // men för enkelhetens skull i Angular Signals-flödet rensar vi komponenten direkt eller låter CSS hantera fade-out)
    this.activeComponentSignal.set(null);
    this.optionsSignal.set({});
    document.body.style.overflow = ''; // Återställ scroll
  }
}
