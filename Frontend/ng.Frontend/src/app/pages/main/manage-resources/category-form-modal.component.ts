import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ModalService } from '../../../shared/services/modal.service';
import { ResourceService } from '../../../core/services/resource.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { ResourceCategoryDto, CreateResourceCategoryDto } from '../../../models/models';

@Component({
  selector: 'app-category-form-modal',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, BadgeComponent],
  template: `
    <div class="modal-content-body">
      <div class="form-section">
        <h3 class="form-section-title">Befintliga kategorier</h3>
        <ul class="existing-categories">
          @for (cat of categories(); track cat.id) {
            <li>
              <app-badge variant="brand">{{ cat.name }}</app-badge>
            </li>
          } @empty {
            <li class="empty">Inga kategorier skapade än.</li>
          }
        </ul>
      </div>

      <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()" class="inline-form">
        <div class="form-group">
          <label>Ny Kategori</label>
          <div class="input-with-btn">
            <input type="text" formControlName="name" placeholder="T.ex. Fordon" />
            <app-button type="submit" [disabled]="categoryForm.invalid || isSubmitting()">
              {{ isSubmitting() ? '...' : 'Lägg till' }}
            </app-button>
          </div>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <app-button variant="primary" (clicked)="close()">Klar</app-button>
    </div>
  `,
  styles: [`
    .existing-categories { list-style: none; padding: 0; margin: 0.5rem 0 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .existing-categories li.empty { color: var(--color-text-muted); font-style: italic; font-size: var(--font-sm); }
    .inline-form .input-with-btn { display: flex; gap: 0.5rem; }
    .inline-form input { flex: 1; padding: 0.6rem; border-radius: var(--radii-md); border: 1px solid var(--color-border); background: var(--color-bg-panel); color: var(--color-text-primary); }
    .form-group label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; display: block; }
  `]
})
export class CategoryFormModalComponent {
  private modalService = inject(ModalService);
  private resourceService = inject(ResourceService);
  private toastService = inject(ToastService);

  readonly categories = signal<ResourceCategoryDto[]>(this.modalService.modalData().categories);
  readonly isSubmitting = signal(false);

  readonly categoryForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  async saveCategory() {
    if (this.categoryForm.invalid) return;
    this.isSubmitting.set(true);

    try {
      const dto = this.categoryForm.getRawValue() as CreateResourceCategoryDto;
      const newCat = await firstValueFrom(this.resourceService.createCategory(dto));
      this.toastService.showSuccess(`Kategori "${newCat.name}" tillagd!`);
      this.categories.update(list => [...list, newCat]);
      this.categoryForm.reset();
      this.modalService.modalData().onRefresh();
    } catch (err) {
      this.toastService.showError('Kunde inte skapa kategori.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close() {
    this.modalService.close();
  }
}