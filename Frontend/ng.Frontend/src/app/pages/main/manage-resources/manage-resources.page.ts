import { Component, inject, resource, signal, computed, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ModalService } from '../../../shared/services/modal.service';
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
  imports: [CommonModule, FormsModule, TableComponent, ButtonComponent, BadgeComponent],
  templateUrl: './manage-resources.page.html',
  styleUrl: './manage-resources.page.scss'
})
export class ManageResourcesPage implements OnInit {
  private resourceService = inject(ResourceService);
  private campusService = inject(CampusService);
  private modalService = inject(ModalService);

  @ViewChild('resourceIconTpl', { static: true }) resourceIconTpl!: TemplateRef<any>;
  @ViewChild('categoryTpl', { static: true }) categoryTpl!: TemplateRef<any>;
  @ViewChild('campusTpl', { static: true }) campusTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<ResourceResponseDto>[] = [];
  
  // State
  filtersOpen = signal(false);
  searchQuery = signal('');
  selectedCampusId = signal<number | null>(null);
  selectedCategoryId = signal<number | null>(null);
  
  pageIndex = signal(0);
  pageSize = signal(10);

  // Resources
  resourcesResource = resource({
    loader: () => firstValueFrom(this.resourceService.getResources())
  });

  categoriesResource = resource({
    loader: () => firstValueFrom(this.resourceService.getCategories())
  });

  campusesResource = resource({
    loader: () => firstValueFrom(this.campusService.getAll())
  });

  categories = computed(() => this.categoriesResource.value() ?? []);
  campuses = computed(() => this.campusesResource.value() ?? []);

  // Filtering
  filteredResources = computed(() => {
    let list = this.resourcesResource.value() ?? [];
    
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(r => 
        r.name.toLowerCase().includes(query) || 
        (r.description && r.description.toLowerCase().includes(query))
      );
    }
    
    const campusId = this.selectedCampusId();
    if (campusId) {
      list = list.filter(r => r.campusId === campusId);
    }
    
    const catId = this.selectedCategoryId();
    if (catId) {
      list = list.filter(r => r.categoryId === catId);
    }
    
    return list;
  });

  hasActiveFilters = computed(() => 
    this.searchQuery().length > 0 || 
    this.selectedCampusId() !== null || 
    this.selectedCategoryId() !== null
  );

  totalAllResources = computed(() => (this.resourcesResource.value() ?? []).length);
  totalResources = computed(() => this.filteredResources().length);

  paginatedResources = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredResources().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.columns = [
      { header: '', template: this.resourceIconTpl, width: '60px' },
      { header: 'Namn', field: 'name' },
      { header: 'Kategori', field: 'categoryName', template: this.categoryTpl },
      { header: 'Ort', field: 'campusCity', template: this.campusTpl },
      { header: 'Status', field: 'isActive', template: this.statusTpl },
      { header: '', template: this.actionsTpl, width: '60px', align: 'right' }
    ];
  }

  // Filter actions
  toggleFilters() {
    this.filtersOpen.update(v => !v);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedCampusId.set(null);
    this.selectedCategoryId.set(null);
    this.pageIndex.set(0);
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  updateCampusFilter(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCampusId.set(val ? Number(val) : null);
    this.pageIndex.set(0);
  }

  updateCategoryFilter(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(val ? Number(val) : null);
    this.pageIndex.set(0);
  }

  // Pagination
  handlePageChange(newIndex: number): void {
    this.pageIndex.set(newIndex);
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.pageIndex.set(0);
  }

  // Modals
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

  openEditResourceModal(res: ResourceResponseDto, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.modalService.open(ResourceFormModalComponent, { 
      title: 'Redigera resurs', 
      width: '500px',
      data: {
        resource: res,
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
}


