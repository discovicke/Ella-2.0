import { Component, inject, resource, signal, computed, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  CampusResponseDto
} from '../../../models/models';
import { ResourceFormModalComponent } from './resource-form-modal.component';
import { CategoryFormModalComponent } from './category-form-modal.component';

@Component({
  selector: 'app-manage-resources-page',
  standalone: true,
  imports: [CommonModule, TableComponent, ButtonComponent],
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

    <!-- Templates -->
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

    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
    
    .table-actions { display: flex; justify-content: flex-end; }
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

  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<ResourceResponseDto>[] = [];
  
  // Resources
  resourcesResource = resource({
    loader: () => firstValueFrom(this.resourceService.getResources())
  });

  // Categories & Campuses (Static lists for dropdowns)
  categoriesResource = resource({
    loader: () => firstValueFrom(this.resourceService.getCategories())
  });

  campusesResource = resource({
    loader: () => firstValueFrom(this.campusService.getAll())
  });

  categories = computed(() => this.categoriesResource.value() ?? []);
  campuses = computed(() => this.campusesResource.value() ?? []);

  ngOnInit() {
    this.columns = [
      { header: 'Namn', field: 'name' },
      { header: 'Kategori', field: 'categoryName' },
      { header: 'Ort', field: 'campusCity' },
      { header: '', template: this.actionsTpl, width: '60px', align: 'right' }
    ];
  }

  openCreateResourceModal() {
    this.modalService.open(ResourceFormModalComponent, { 
      title: 'Skapa ny resurs', 
      width: '500px',
      data: {
        categories: this.categories(),
        campuses: this.campuses(),
        onSave: () => this.resourcesResource.reload()
      }
    });
  }

  openCategoryModal() {
    this.modalService.open(CategoryFormModalComponent, { 
      title: 'Hantera kategorier', 
      width: '450px',
      data: {
        categories: this.categories(),
        onRefresh: () => this.categoriesResource.reload()
      }
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