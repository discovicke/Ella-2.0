import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  resource,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CampusResponseDto, CreateCampusDto } from '../../../models/models';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { CampusService } from '../../../shared/services/campus.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { CampusFormModalComponent, CampusFormPayload } from './campus-form-modal.component';

@Component({
  selector: 'app-manage-campuses-page',
  imports: [ButtonComponent, TableComponent],
  templateUrl: './manage-campuses.page.html',
  styleUrl: './manage-campuses.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCampusesPage implements OnInit {
  private readonly campusService = inject(CampusService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly confirmService = inject(ConfirmService);

  @ViewChild('cityTpl', { static: true }) cityTpl!: TemplateRef<any>;
  @ViewChild('streetTpl', { static: true }) streetTpl!: TemplateRef<any>;
  @ViewChild('contactTpl', { static: true }) contactTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<CampusResponseDto>[] = [];

  searchQuery = signal('');
  pageIndex = signal(0);
  pageSize = signal(10);

  campusResource = resource({
    loader: async () => firstValueFrom(this.campusService.getAll()),
  });

  readonly campuses = computed(() => this.campusResource.value() ?? []);

  readonly filteredCampuses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    return this.campuses().filter((c) => {
      if (!query) return true;
      return (
        c.city.toLowerCase().includes(query) ||
        c.street.toLowerCase().includes(query) ||
        (c.zip ?? '').toLowerCase().includes(query) ||
        c.country.toLowerCase().includes(query) ||
        (c.contact ?? '').toLowerCase().includes(query)
      );
    });
  });

  readonly totalCampuses = computed(() => this.filteredCampuses().length);
  readonly totalAllCampuses = computed(() => this.campuses().length);

  readonly paginatedCampuses = computed(() => {
    const list = this.filteredCampuses();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly hasActiveFilters = computed(() => this.searchQuery() !== '');

  ngOnInit(): void {
    this.columns = [
      { header: 'Stad', template: this.cityTpl },
      { header: 'Adress', template: this.streetTpl },
      { header: 'Postnummer', field: 'zip', width: '110px' },
      { header: 'Land', field: 'country', width: '100px' },
      { header: 'Kontakt', template: this.contactTpl },
      { header: '', template: this.actionsTpl, width: '80px', align: 'right' },
    ];
  }

  handlePageChange(page: number): void {
    this.pageIndex.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    const maxPage = Math.ceil(this.totalCampuses() / size) - 1;
    if (this.pageIndex() > maxPage && maxPage >= 0) {
      this.pageIndex.set(maxPage);
    }
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.pageIndex.set(0);
  }

  openAddCampusModal(): void {
    this.modalService.open(CampusFormModalComponent, {
      title: 'Skapa nytt campus',
      data: {
        campus: null,
        onSave: (payload: CampusFormPayload) => this.handleSaveCampus(payload),
      },
      width: '480px',
    });
  }

  openEditCampusModal(campus: CampusResponseDto, event?: Event): void {
    if (event) event.stopPropagation();

    this.modalService.open(CampusFormModalComponent, {
      title: 'Redigera campus',
      data: {
        campus,
        onSave: (payload: CampusFormPayload) => this.handleSaveCampus(payload, campus.id),
        onDelete: (id: number) => this.handleDeleteCampus(id),
      },
      width: '480px',
    });
  }

  private async handleSaveCampus(payload: CampusFormPayload, campusId?: number): Promise<void> {
    try {
      if (campusId) {
        await firstValueFrom(this.campusService.update(campusId, payload));
        this.toastService.showSuccess('Campuset uppdaterades.');
      } else {
        await firstValueFrom(this.campusService.create(payload as CreateCampusDto));
        this.toastService.showSuccess('Campuset skapades.');
      }
      this.modalService.close();
      this.campusResource.reload();
    } catch (err) {
      console.error('Failed saving campus', err);
      this.toastService.showError('Kunde inte spara campuset.');
      throw err;
    }
  }

  private async handleDeleteCampus(id: number): Promise<void> {
    const confirmed = await this.confirmService.show(
      'Är du säker på att du vill ta bort detta campus? Denna åtgärd går inte att ångra.',
      {
        title: 'Ta bort campus?',
        icon: 'warning',
        confirmText: 'Ta bort',
        cancelText: 'Avbryt',
        dangerConfirm: true,
      },
    );
    if (!confirmed) return;

    try {
      await firstValueFrom(this.campusService.delete(id));
      this.toastService.showSuccess('Campuset togs bort.');
      this.modalService.close();
      this.campusResource.reload();
      if (this.paginatedCampuses().length === 0 && this.pageIndex() > 0) {
        this.pageIndex.update((p) => p - 1);
      }
    } catch (err: any) {
      console.error('Failed deleting campus', err);
      this.toastService.showError(
        'Kunde inte ta bort campuset. Det kan finnas rum kopplade till det.',
      );
    }
  }
}
