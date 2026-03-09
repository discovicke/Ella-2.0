import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../shared/services/modal.service';
import { ResourceService } from '../../../core/services/resource.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { ResourceCategoryDto, CreateResourceCategoryDto } from '../../../models/models';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  template: `
    <div class="category-manager">
      <div class="existing-categories">
        <h3>Befintliga kategorier</h3>
        <ul>
          @for (cat of categories(); track cat.id) {
            <li>{{ cat.name }}</li>
          } @empty {
            <li class="empty">Inga kategorier skapade än.</li>
          }
        </ul>
      </div>

      <hr />

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

      <div class="modal-actions">
        <app-button variant="primary" (clicked)="close()">Klar</app-button>
      </div>
    </div>
  `,
  styles: [`
    .category-manager { display: flex; flex-direction: column; gap: 1.5rem; padding: 0.5rem; }
    .existing-categories h3 { font-size: 0.9rem; margin: 0 0 0.5rem; color: var(--color-text-secondary); }
    .existing-categories ul { list-style: none; padding: 0; margin: 0.5rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .existing-categories li { background: var(--color-primary-surface); color: var(--color-primary); padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.875rem; border: 1px solid var(--color-primary-light); }
    .existing-categories li.empty { background: transparent; color: var(--color-text-muted); font-style: italic; border: none; }
    .inline-form .input-with-btn { display: flex; gap: 0.5rem; }
    .inline-form input { flex: 1; padding: 0.6rem; border-radius: var(--radii-md); border: 1px solid var(--color-border); background: var(--color-bg-panel); color: var(--color-text-primary); }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; font-weight: 500; }
    .modal-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }
    hr { border: none; border-top: 1px solid var(--color-border); margin: 0; }
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