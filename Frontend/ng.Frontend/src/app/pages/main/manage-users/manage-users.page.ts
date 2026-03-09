import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  ViewChild,
  TemplateRef,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../shared/services/user.service';
import {
  BannedStatus,
  CreateUserDto,
  UserPermissions,
  PermissionTemplateDto,
  UpdateUserDto,
  UserResponseDto,
} from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  UserFormModalComponent,
  UserFormPayload,
  CustomPermissionsPayload,
} from './user-form-modal.component';
import { ImportUsersModalComponent } from './import-users-modal.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import {
  permissionTemplates,
  resolveRoleLabel,
  resolveRoleCssClass,
  getTemplateLabels,
  RoleLabel,
} from '../../../core/permission-templates';
import { CampusService } from '../../../shared/services/campus.service';
import { ClassService } from '../../../shared/services/class.service';

@Component({
  selector: 'app-manage-users-page',
  imports: [ButtonComponent, TableComponent],
  templateUrl: './manage-users.page.html',
  styleUrl: './manage-users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsersPage implements OnInit {
  private modalService = inject(ModalService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private campusService = inject(CampusService);
  private classService = inject(ClassService);

  @ViewChild('avatarTpl', { static: true }) avatarTpl!: TemplateRef<any>;
  @ViewChild('roleTpl', { static: true }) roleTpl!: TemplateRef<any>;
  @ViewChild('campusTpl', { static: true }) campusTpl!: TemplateRef<any>;
  @ViewChild('classTpl', { static: true }) classTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<UserResponseDto>[] = [];

  // --- FILTER STATE ---
  searchQuery = signal('');
  debouncedSearch = signal('');
  selectedRole = signal<RoleLabel | 'All'>('All');
  selectedStatus = signal<BannedStatus | 'All'>('All');
  filtersOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly roleLabels = computed(() => [...getTemplateLabels(), 'Custom']);
  readonly templateOptions = computed<PermissionTemplateDto[]>(() =>
    permissionTemplates().filter((template) => !!template.id),
  );
  readonly resolveRoleLabel = resolveRoleLabel;
  readonly resolveRoleCssClass = resolveRoleCssClass;

  /** Resolve selected role label → templateId for server filtering.
   *  undefined = no filter, 0 = custom (no template), >0 = specific template */
  private resolvedTemplateId = computed((): number | undefined => {
    const role = this.selectedRole();
    if (role === 'All') return undefined;
    if (role === 'Custom') return 0;
    const template = this.templateOptions().find((t) => t.label === role);
    return template?.id ?? undefined;
  });

  // Pagination state
  pageIndex = signal(0);
  pageSize = signal(0); // starts at 0; autoSize sets the real value before first fetch

  // Resource för användarlistan — server-side pagination + filtering
  userResource = resource({
    params: () => {
      const ps = this.pageSize();
      if (ps === 0) return undefined; // wait for autoSize
      return {
        page: this.pageIndex() + 1,
        pageSize: ps,
        search: this.debouncedSearch() || undefined,
        templateId: this.resolvedTemplateId(),
        isBanned: this.selectedStatus() === 'All' ? undefined : this.selectedStatus(),
      };
    },
    loader: ({ params }) =>
      firstValueFrom(
        this.userService.getAllUsers({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          templateId: params.templateId,
          isBanned: params.isBanned,
        }),
      ),
  });

  // Lookup resources for associations
  campusResource = resource({
    loader: () => firstValueFrom(this.campusService.getAll()),
  });

  classResource = resource({
    loader: () => firstValueFrom(this.classService.getAll()),
  });

  readonly allCampuses = computed(() => this.campusResource.value() ?? []);
  readonly allClasses = computed(() => this.classResource.value() ?? []);

  // --- COMPUTED (server provides filtered + paginated data) ---
  // Keep previous data visible while loading to avoid flash
  private lastUsers: UserResponseDto[] = [];
  private lastTotal = 0;

  paginatedUsers = computed(() => {
    const val = this.userResource.value();
    if (val) {
      this.lastUsers = val.items;
      this.lastTotal = val.totalCount;
    }
    return this.lastUsers;
  });
  totalUsers = computed(() => {
    const val = this.userResource.value();
    if (val) return val.totalCount;
    return this.lastTotal;
  });

  hasActiveFilters = computed(
    () =>
      this.searchQuery() !== '' || this.selectedRole() !== 'All' || this.selectedStatus() !== 'All',
  );

  ngOnInit() {
    this.columns = [
      { header: '', template: this.avatarTpl, width: '40px', align: 'center' },
      { header: 'Namn', field: 'displayName' },
      { header: 'E-post', field: 'email' },
      { header: 'Campus', template: this.campusTpl, width: '140px' },
      { header: 'Klass', template: this.classTpl, width: '120px' },
      { header: 'Roll', template: this.roleTpl, width: '100px' },
      { header: 'Status', template: this.statusTpl, width: '100px' },
      { header: '', template: this.actionsTpl, width: '80px', align: 'right' },
    ];
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  handlePageChange(page: number) {
    this.pageIndex.set(page);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  // --- FILTER ACTIONS ---
  updateSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.debouncedSearch.set(value);
      this.pageIndex.set(0);
    }, 300);
  }

  updateStatus(event: Event) {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as BannedStatus | 'All');
    this.pageIndex.set(0);
  }

  updateRole(event: Event) {
    this.selectedRole.set((event.target as HTMLSelectElement).value as RoleLabel | 'All');
    this.pageIndex.set(0);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.debouncedSearch.set('');
    this.selectedRole.set('All');
    this.selectedStatus.set('All');
    this.pageIndex.set(0);
    clearTimeout(this.searchDebounceTimer);
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
  }

  openImportUsersModal() {
    this.modalService.open(ImportUsersModalComponent, {
      title: 'Importera användare',
      data: {
        classOptions: this.allClasses(),
        roleOptions: this.templateOptions(),
        onComplete: () => this.userResource.reload(),
      },
      width: '500px',
    });
  }

  openAddUserModal() {
    const studentTemplate = this.templateOptions().find(
      (t) =>
        (typeof t.name === 'string' && t.name.toLowerCase() === 'student') ||
        (typeof t.label === 'string' && t.label.toLowerCase() === 'student'),
    );
    const initialTemplateId = studentTemplate?.id ?? null;

    this.modalService.open(UserFormModalComponent, {
      title: 'Skapa ny användare',
      data: {
        user: null,
        templateOptions: this.templateOptions(),
        initialTemplateId: initialTemplateId,
        initialPermissions: {
          bookRoom: true,
          manageUsers: false,
          manageClasses: false,
          manageRooms: false,
          manageBookings: false,
          manageCampuses: false,
          manageRoles: false,
        },
        campusOptions: this.allCampuses(),
        classOptions: this.allClasses(),
        initialCampusIds: [],
        initialClassIds: [],
        onSave: (payload: UserFormPayload) => this.handleSave(payload),
      },
      width: '500px',
    });
  }

  async openEditUserModal(user: UserResponseDto, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // Fetch full user data (with effective permissions) + associations in parallel
    const [fullUser, campusIds, classIds] = await Promise.all([
      firstValueFrom(this.userService.getUserById(user.id)),
      firstValueFrom(this.userService.getUserCampuses(user.id)),
      firstValueFrom(this.userService.getUserClasses(user.id)),
    ]);

    this.modalService.open(UserFormModalComponent, {
      title: 'Redigera användare',
      data: {
        user: fullUser,
        templateOptions: this.templateOptions(),
        initialTemplateId: fullUser.permissions?.permissionTemplateId ?? null,
        initialPermissions: fullUser.permissions,
        campusOptions: this.allCampuses(),
        classOptions: this.allClasses(),
        initialCampusIds: campusIds,
        initialClassIds: classIds,
        onSave: (payload: UserFormPayload) =>
          this.handleSave(payload, fullUser.id, fullUser.permissions),
        onDelete: (id: number) => this.handleDelete(id),
      },
      width: '500px',
    });
  }

  private handleDelete(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.toastService.showSuccess('Användaren raderad!');
          this.modalService.close();
          this.userResource.reload();
          // Reset page if we delete the last item on the current page
          if (this.paginatedUsers().length === 0 && this.pageIndex() > 0) {
            this.pageIndex.update((p) => p - 1);
          }
          resolve();
        },
        error: (err) => {
          console.error('Delete failed', err);
          this.toastService.showError('Kunde inte radera användaren.');
          reject(err);
        },
      });
    });
  }

  private async handleSave(
    payload: UserFormPayload,
    userId?: number,
    existingPermissions?: UserPermissions,
  ) {
    try {
      const selectedTemplateId = payload.selectedTemplateId ?? null;
      let targetUserId = userId;

      if (userId) {
        const updatePayload: UpdateUserDto = {
          id: userId,
          email: payload.email,
          displayName: payload.displayName,
          password: payload.password ?? null,
          isBanned: payload.isBanned ?? BannedStatus.NotBanned,
        };

        await firstValueFrom(this.userService.updateUser(userId, updatePayload));
        await this.syncTemplateAssignment(
          userId,
          selectedTemplateId,
          payload.customPermissions,
          existingPermissions,
        );
      } else {
        const createPayload: CreateUserDto = {
          email: payload.email,
          displayName: payload.displayName,
          password: payload.password ?? '',
        };

        const created = await firstValueFrom(this.userService.createUser(createPayload));
        targetUserId = created.id;
        if (created.id) {
          await this.syncTemplateAssignment(
            created.id,
            selectedTemplateId,
            payload.customPermissions,
            undefined,
          );
        }
      }

      // Sync campus/class associations
      if (targetUserId) {
        await Promise.all([
          firstValueFrom(this.userService.setUserCampuses(targetUserId, payload.campusIds)),
          firstValueFrom(this.userService.setUserClasses(targetUserId, payload.classIds)),
        ]);
      }

      this.toastService.showSuccess(`Användaren ${userId ? 'uppdaterad' : 'skapad'}!`);
      this.modalService.close();
      this.userResource.reload();
    } catch (err: any) {
      console.error('Save failed', err);
      this.toastService.showError(err?.error || 'Kunde inte spara användaren.');
      throw err;
    }
  }

  private async syncTemplateAssignment(
    userId: number,
    selectedTemplateId: number | null,
    customPermissions: CustomPermissionsPayload,
    existingPermissions?: UserPermissions,
  ) {
    if (selectedTemplateId && selectedTemplateId > 0) {
      await firstValueFrom(this.userService.applyTemplate(userId, selectedTemplateId));
      return;
    }

    if (selectedTemplateId === null) {
      const previousTemplateId = existingPermissions?.permissionTemplateId ?? null;
      const shouldUpdateCustom =
        previousTemplateId !== null ||
        this.permissionsChanged(existingPermissions, customPermissions);

      if (!shouldUpdateCustom) {
        return;
      }

      await firstValueFrom(
        this.userService.updatePermissions(userId, {
          templateId: null,
          ...customPermissions,
        }),
      );
    }
  }

  private permissionsChanged(
    existingPermissions: UserPermissions | undefined,
    next: CustomPermissionsPayload,
  ): boolean {
    if (!existingPermissions) return true;

    return (
      !!existingPermissions.bookRoom !== next.bookRoom ||
      !!existingPermissions.manageUsers !== next.manageUsers ||
      !!existingPermissions.manageClasses !== next.manageClasses ||
      !!existingPermissions.manageRooms !== next.manageRooms ||
      !!existingPermissions.manageBookings !== next.manageBookings ||
      !!existingPermissions.manageCampuses !== next.manageCampuses ||
      !!existingPermissions.manageRoles !== next.manageRoles
    );
  }
}
