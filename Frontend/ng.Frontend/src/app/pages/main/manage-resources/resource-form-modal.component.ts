import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ResourceService } from '../../../core/services/resource.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { ResourceCategoryDto, CampusResponseDto, CreateResourceDto, ResourceResponseDto } from '../../../models/models';

export interface ResourceFormModalConfig {
  resource?: ResourceResponseDto;
  categories: ResourceCategoryDto[];
  campuses: CampusResponseDto[];
  onSave: () => void;
}

@Component({
  selector: 'app-resource-form-modal',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  template: `
    <form [formGroup]="resourceForm" (ngSubmit)="onSubmit()">
      <div class="modal-content-body">
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
      </div>

      <div class="modal-footer">
        <app-button variant="tertiary" (clicked)="close()">Avbryt</app-button>
        @if (initialData) {
          <app-button variant="danger" (clicked)="onDelete()" [disabled]="isSubmitting()">
            Ta bort
          </app-button>
        }
        <app-button type="submit" variant="primary" [disabled]="resourceForm.invalid || isSubmitting()">
          {{ isSubmitting() ? 'Sparar...' : initialData ? 'Spara ändringar' : 'Skapa resurs' }}
        </app-button>
      </div>
    </form>
  `,
  styles: [`
    .form-group label { font-size: 0.875rem; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 0.5rem; display: block; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 0.6rem; border-radius: var(--radii-md); border: 1px solid var(--color-border);
      background: var(--color-bg-panel); color: var(--color-text-primary); box-sizing: border-box;
    }
    .form-row { display: flex; gap: 1rem; }
    .form-row .form-group { flex: 1; }
  `]
})
export class ResourceFormModalComponent {
  private modalService = inject(ModalService);
  private resourceService = inject(ResourceService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  private config: ResourceFormModalConfig = this.modalService.modalData();
  protected initialData = this.config?.resource;

  readonly categories = signal<ResourceCategoryDto[]>(this.config?.categories ?? []);
  readonly campuses = signal<CampusResponseDto[]>(this.config?.campuses ?? []);
  readonly isSubmitting = signal(false);

  readonly resourceForm = new FormGroup({
    name: new FormControl(this.initialData?.name ?? '', { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl<number | null>(this.initialData?.categoryId ?? null, { validators: [Validators.required] }),
    campusId: new FormControl<number | null>(this.initialData?.campusId ?? null, { validators: [Validators.required] }),
    description: new FormControl<string | null>(this.initialData?.description ?? null)
  });

  async onSubmit() {
    if (this.resourceForm.invalid) return;
    this.isSubmitting.set(true);

    try {
      const formValue = this.resourceForm.getRawValue();
      const dto: CreateResourceDto = {
        name: formValue.name,
        categoryId: formValue.categoryId!,
        campusId: formValue.campusId!,
        description: formValue.description || null
      };

      if (this.initialData) {
        await firstValueFrom(this.resourceService.updateResource(this.initialData.id, dto));
        this.toastService.showSuccess('Resurs uppdaterad!');
      } else {
        await firstValueFrom(this.resourceService.createResource(dto));
        this.toastService.showSuccess('Resurs skapad!');
      }
      
      this.config.onSave();
      this.close();
    } catch (err) {
      this.toastService.showError(this.initialData ? 'Kunde inte uppdatera resurs.' : 'Kunde inte skapa resurs.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onDelete() {
    if (!this.initialData) return;
    
    const confirmed = await this.confirmService.danger(
      `Är du säker på att du vill ta bort resursen "${this.initialData.name}"? Denna åtgärd kan inte ångras.`,
      'Ta bort resurs'
    );
    
    if (!confirmed) return;
    
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.resourceService.deleteResource(this.initialData.id));
      this.toastService.showSuccess('Resursen borttagen.');
      this.config.onSave();
      this.close();
    } catch {
      this.toastService.showError('Kunde inte ta bort resursen.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close() {
    this.modalService.close();
  }
}