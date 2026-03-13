import { Component, inject, resource, signal, computed, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
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
  templateUrl: './manage-resources.page.html',
  styleUrl: './manage-resources.page.scss'
})
export class ManageResourcesPage implements OnInit {
  private resourceService = inject(ResourceService);
  private campusService = inject(CampusService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

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
    const confirmed = await this.confirmService.danger(
      `Är du säker på att du vill ta bort resursen "${res.name}"? Denna åtgärd kan inte ångras.`,
      'Ta bort resurs'
    );
    
    if (confirmed) {
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
