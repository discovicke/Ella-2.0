import { Component, inject, resource, signal, computed, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { 
  ResourceResponseDto, 
  ResourceCategoryDto, 
  CampusResponseDto,
  CreateResourceDto,
  CreateResourceCategoryDto
} from '../../../models/models';

@Component({
  selector: 'app-manage-resources-page',
  standalone: true,
  imports: [CommonModule, TableComponent, ButtonComponent, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-text">
          <h1>Hantera Resurser</h1>
          <p>Skapa och hantera bokningsbara resurser som fordon och utrustning.</p>
        </div>
        <div class="header-actions">
          <app-button variant="secondary" (clicked)="openCategoryModal()">Hantera Kategorier</app-button>
          <app-button variant="primary" (clicked)="openCreateResourceModal()">Ny Resurs</app-button>
        </div>
      </div>

      <div class="page-content">
        <app-table
          [data]="resourcesResource.value() || []"
          [columns]="columns"
          [isLoading]="resourcesResource.isLoading()"
          [total]="(resourcesResource.value() || []).length"
          emptyMessage="Inga resurser hittades."
        >
        </app-table>
      </div>
    </div>

    <!-- Modaltemplates -->
    <ng-template #resourceFormTpl let-data>
      <form [formGroup]="resourceForm" class="modal-form" (ngSubmit)="saveResource(data.close)">
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
          <app-button variant="secondary" (clicked)="data.close()">Avbryt</app-button>
          <app-button type="submit" [disabled]="resourceForm.invalid">Spara</app-button>
        </div>
      </form>
    </ng-template>

    <ng-template #categoryFormTpl let-data>
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
              <app-button type="submit" [disabled]="categoryForm.invalid">Lägg till</app-button>
            </div>
          </div>
        </form>

        <div class="modal-actions">
          <app-button variant="primary" (clicked)="data.close()">Klar</app-button>
        </div>
      </div>
    </ng-template>

    <ng-template #actionsTpl let-res>
      <div class="table-actions">
        <button class="delete-btn" (click)="deleteResource(res)" title="Ta bort resurs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .page-container { padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-text h1 { margin: 0; font-size: 1.5rem; color: var(--color-text-primary); }
    .header-text p { margin: 0.5rem 0 0; color: var(--color-text-secondary); }
    .header-actions { display: flex; gap: 0.75rem; }

    .modal-form { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; font-weight: 500; color: var(--color-text-secondary); }
    .form-group input, .form-group select, .form-group textarea {
      padding: 0.6rem; border-radius: var(--radii-md); border: 1px solid var(--color-border);
      background: var(--color-bg-panel); color: var(--color-text-primary);
    }

    .category-manager { display: flex; flex-direction: column; gap: 1.5rem; }
    .existing-categories ul { list-style: none; padding: 0; margin: 0.5rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .existing-categories li { background: var(--color-primary-surface); color: var(--color-primary); padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.875rem; }
    .existing-categories li.empty { background: transparent; color: var(--color-text-muted); font-style: italic; }
    .inline-form .input-with-btn { display: flex; gap: 0.5rem; }
    .inline-form input { flex: 1; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
    
    .delete-btn {
      background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: 4px;
      color: var(--color-danger); transition: all 0.2s;
      &:hover { background: var(--color-danger-surface); }
      svg { width: 1.1rem; height: 1.1rem; }
    }
  `]
})
export class ManageResourcesPage implements OnInit {
  private resourceService = inject(ResourceService);
  private campusService = inject(CampusService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  @ViewChild('resourceFormTpl', { static: true }) resourceFormTpl!: TemplateRef<any>;
  @ViewChild('categoryFormTpl', { static: true }) categoryFormTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<ResourceResponseDto>[] = [];
  
  // Resources
  resourcesResource = resource({
    loader: () => firstValueFrom(this.resourceService.getResources())
  });

  // Categories & Campuses (Static lists for dropdowns)
  categories = signal<ResourceCategoryDto[]>([]);
  campuses = signal<CampusResponseDto[]>([]);

  // Forms
  resourceForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    campusId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true })
  });

  categoryForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  ngOnInit() {
    this.columns = [
      { header: 'Namn', field: 'name' },
      { header: 'Kategori', field: 'categoryName' },
      { header: 'Ort', field: 'campusCity' },
      { header: 'Status', template: null, field: 'isActive' }, // Add active/inactive logic if needed
      { header: '', template: this.actionsTpl, width: '60px', align: 'right' }
    ];

    this.loadDropdownData();
  }

  async loadDropdownData() {
    const [cats, cams] = await Promise.all([
      firstValueFrom(this.resourceService.getCategories()),
      firstValueFrom(this.campusService.getAllAsync())
    ]);
    this.categories.set(cats);
    this.campuses.set(cams);
  }

  openCreateResourceModal() {
    this.resourceForm.reset({ categoryId: null, campusId: null });
    this.modalService.open(this.resourceFormTpl, { title: 'Skapa ny resurs', width: '500px' });
  }

  openCategoryModal() {
    this.categoryForm.reset();
    this.modalService.open(this.categoryFormTpl, { title: 'Hantera kategorier', width: '450px' });
  }

  saveResource(close: () => void) {
    if (this.resourceForm.invalid) return;

    const dto = this.resourceForm.getRawValue() as CreateResourceDto;
    this.resourceService.createResource(dto).subscribe({
      next: () => {
        this.toastService.showSuccess('Resurs skapad!');
        this.resourcesResource.reload();
        close();
      },
      error: () => this.toastService.showError('Kunde inte skapa resurs.')
    });
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;

    const dto = this.categoryForm.getRawValue() as CreateResourceCategoryDto;
    this.resourceService.createCategory(dto).subscribe({
      next: (newCat) => {
        this.toastService.showSuccess(`Kategori "${newCat.name}" tillagd!`);
        this.categories.update(list => [...list, newCat]);
        this.categoryForm.reset();
      },
      error: () => this.toastService.showError('Kunde inte skapa kategori.')
    });
  }

  async deleteResource(res: ResourceResponseDto) {
    if (confirm(`Är du säker på att du vill ta bort resursen "${res.name}"?`)) {
      this.resourceService.deleteResource(res.id).subscribe({
        next: () => {
          this.toastService.showSuccess('Resursen borttagen.');
          this.resourcesResource.reload();
        },
        error: () => this.toastService.showError('Kunde inte ta bort resursen.')
      });
    }
  }
}