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
import { ClassResponseDto, CreateClassDto } from '../../../models/models';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ClassService } from '../../../shared/services/class.service';
import { CampusService } from '../../../shared/services/campus.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { ClassFormModalComponent, ClassFormPayload } from './class-form-modal.component';

@Component({
  selector: 'app-manage-classes-page',
  imports: [ButtonComponent, TableComponent],
  templateUrl: './manage-classes.page.html',
  styleUrl: './manage-classes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageClassesPage implements OnInit {
  private readonly classService = inject(ClassService);
  private readonly campusService = inject(CampusService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly confirmService = inject(ConfirmService);

  @ViewChild('classNameTpl', { static: true }) classNameTpl!: TemplateRef<any>;
  @ViewChild('campusTpl', { static: true }) campusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<ClassResponseDto>[] = [];

  searchQuery = signal('');
  pageIndex = signal(0);
  pageSize = signal(10);

  classResource = resource({
    loader: async () => firstValueFrom(this.classService.getAll()),
  });

  campusResource = resource({
    loader: async () => firstValueFrom(this.campusService.getAll()),
  });

  readonly classes = computed(() => this.classResource.value() ?? []);
  readonly allCampuses = computed(() => this.campusResource.value() ?? []);

  readonly filteredClasses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    return this.classes().filter((c) => {
      if (!query) return true;
      return c.className.toLowerCase().includes(query);
    });
  });

  readonly totalClasses = computed(() => this.filteredClasses().length);
  readonly totalAllClasses = computed(() => this.classes().length);

  readonly paginatedClasses = computed(() => {
    const list = this.filteredClasses();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly hasActiveFilters = computed(() => this.searchQuery() !== '');

  ngOnInit(): void {
    this.columns = [
      { header: 'Klassnamn', template: this.classNameTpl },
      { header: 'Campus', template: this.campusTpl, width: '200px' },
      { header: '', template: this.actionsTpl, width: '80px', align: 'right' },
    ];
  }

  handlePageChange(page: number): void {
    this.pageIndex.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    const maxPage = Math.ceil(this.totalClasses() / size) - 1;
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

  openAddClassModal(): void {
    this.modalService.open(ClassFormModalComponent, {
      title: 'Skapa ny klass',
      data: {
        schoolClass: null,
        campusOptions: this.allCampuses(),
        initialCampusIds: [],
        onSave: (payload: ClassFormPayload) => this.handleSaveClass(payload),
      },
      width: '420px',
    });
  }

  async openEditClassModal(schoolClass: ClassResponseDto, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const campusIds = await firstValueFrom(this.classService.getClassCampuses(schoolClass.id));

    this.modalService.open(ClassFormModalComponent, {
      title: 'Redigera klass',
      data: {
        schoolClass,
        campusOptions: this.allCampuses(),
        initialCampusIds: campusIds,
        onSave: (payload: ClassFormPayload) => this.handleSaveClass(payload, schoolClass.id),
        onDelete: (id: number) => this.handleDeleteClass(id),
      },
      width: '420px',
    });
  }

  private async handleSaveClass(payload: ClassFormPayload, classId?: number): Promise<void> {
    try {
      let id = classId;
      if (id) {
        await firstValueFrom(this.classService.update(id, { className: payload.className }));
        this.toastService.showSuccess('Klassen uppdaterades.');
      } else {
        const created = await firstValueFrom(
          this.classService.create({ className: payload.className } as CreateClassDto),
        );
        id = created.id;
        this.toastService.showSuccess('Klassen skapades.');
      }

      // Save campus associations
      await firstValueFrom(this.classService.setClassCampuses(id!, payload.campusIds));

      this.modalService.close();
      this.classResource.reload();
    } catch (err) {
      console.error('Failed saving class', err);
      this.toastService.showError('Kunde inte spara klassen.');
      throw err;
    }
  }

  private async handleDeleteClass(id: number): Promise<void> {
    const confirmed = await this.confirmService.show(
      'Är du säker på att du vill ta bort denna klass? Denna åtgärd går inte att ångra.',
      {
        title: 'Ta bort klass?',
        icon: 'warning',
        confirmText: 'Ta bort',
        cancelText: 'Avbryt',
        dangerConfirm: true,
      },
    );
    if (!confirmed) return;

    try {
      await firstValueFrom(this.classService.delete(id));
      this.toastService.showSuccess('Klassen togs bort.');
      this.modalService.close();
      this.classResource.reload();
      if (this.paginatedClasses().length === 0 && this.pageIndex() > 0) {
        this.pageIndex.update((p) => p - 1);
      }
    } catch (err: any) {
      console.error('Failed deleting class', err);
      this.toastService.showError(
        'Kunde inte ta bort klassen. Det kan finnas användare kopplade till den.',
      );
    }
  }
}
