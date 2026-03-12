import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../shared/services/modal.service';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { ResourceCategoryDto, CampusResponseDto, CreateResourceDto } from '../../../models/models';

@Component({
  selector: 'app-resource-form-modal',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="resourceForm" class="modal-form" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label>Namn</label>
        <input type="text" formControlName="name" placeholder="T.ex. Volvo V60 (ABC 123)" />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Kategori</label>
          <select formControlName="categoryId">
            <option [ngValue]="null">Välj kategori...</option>
            @for (cat of categories(); track cat.id) {
              <option [ngValue]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>
        
        <div class="form-group">
          <label>Ort (Campus)</label>
          <select formControlName="campusId">
            <option [ngValue]="null">Välj ort...</option>
            @for (campus of campuses(); track campus.id) {
              <option [ngValue]="campus.id">{{ campus.city }}</option>
            }
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Beskrivning</label>
        <textarea formControlName="description" rows="3" placeholder="Ytterligare info om resursen..."></textarea>
      </div>

      <div class="modal-actions">
        <app-button variant="secondary" (clicked)="close()">Avbryt</app-button>
        <app-button type="submit" [disabled]="resourceForm.invalid || isSubmitting()">
          {{ isSubmitting() ? 'Sparar...' : 'Spara' }}
        </app-button>
      </div>
    </form>
  `,
  styles: [`
    .modal-form { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; font-weight: 500; color: var(--color-text-secondary); }
    .form-group input, .form-group select, .form-group textarea {
      padding: 0.6rem; border-radius: var(--radii-md); border: 1px solid var(--color-border);
      background: var(--color-bg-panel); color: var(--color-text-primary);
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
  `]
})
export class ResourceFormModalComponent {
  private modalService = inject(ModalService);
  private resourceService = inject(ResourceService);
  private toastService = inject(ToastService);

  readonly categories = signal<ResourceCategoryDto[]>(this.modalService.modalData().categories);
  readonly campuses = signal<CampusResponseDto[]>(this.modalService.modalData().campuses);
  readonly isSubmitting = signal(false);

  readonly resourceForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    campusId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true })
  });

  async onSubmit() {
    if (this.resourceForm.invalid) return;
    this.isSubmitting.set(true);

    try {
      const dto = this.resourceForm.getRawValue() as CreateResourceDto;
      await firstValueFrom(this.resourceService.createResource(dto));
      this.toastService.showSuccess('Resurs skapad!');
      this.modalService.modalData().onSave();
      this.close();
    } catch (err) {
      this.toastService.showError('Kunde inte skapa resurs.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close() {
    this.modalService.close();
  }
}