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
import { CommonModule } from '@angular/common';
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
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import {
  permissionTemplates,
  resolveRoleLabel,
  resolveRoleCssClass,
  getTemplateLabels,
  RoleLabel,
} from '../../../core/permission-templates';

@Component({
  selector: 'app-manage-users-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, TableComponent],
  templateUrl: './manage-users.page.html',
  styleUrl: './manage-users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsersPage implements OnInit {
  private modalService = inject(ModalService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  @ViewChild('avatarTpl', { static: true }) avatarTpl!: TemplateRef<any>;
  @ViewChild('roleTpl', { static: true }) roleTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<UserResponseDto>[] = [];

  // --- FILTER STATE ---
  searchQuery = signal('');
  selectedRole = signal<RoleLabel | 'All'>('All');
  selectedStatus = signal<BannedStatus | 'All'>('All');
  filtersOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  readonly roleLabels = computed(() => [...getTemplateLabels(), 'Custom']);
  readonly templateOptions = computed<PermissionTemplateDto[]>(() =>
    permissionTemplates().filter((template) => !!template.id),
  );
  readonly resolveRoleLabel = resolveRoleLabel;
  readonly resolveRoleCssClass = resolveRoleCssClass;

  // Pagination state
  pageIndex = signal(0);
  pageSize = signal(10);

  // Resource för användarlistan
  userResource = resource({
    loader: () => firstValueFrom(this.userService.getAllUsers()),
  });

  // --- COMPUTED ---
  filteredUsers = computed(() => {
    const all = this.userResource.value() ?? [];
    const query = this.searchQuery().toLowerCase();
    const role = this.selectedRole();
    const status = this.selectedStatus();

    return all.filter((u) => {
      const matchesSearch =
        !query ||
        u.displayName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query);
      const matchesRole = role === 'All' || resolveRoleLabel(u.permissions) === role;
      const matchesStatus = status === 'All' || u.isBanned === status;
      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  totalUsers = computed(() => this.filteredUsers().length);
  totalAllUsers = computed(() => this.userResource.value()?.length ?? 0);

  paginatedUsers = computed(() => {
    const users = this.filteredUsers();
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return users.slice(start, end);
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
    // Optionally reset to page 0 if current page is out of bounds, 
    // but TableComponent usually handles the display logic or parent should check.
    // If we are on page 5 and size doubles, page 5 might still be valid or not.
    // Simpler to keep pageIndex unless it's invalid.
    const maxPage = Math.ceil(this.totalUsers() / size) - 1;
    if (this.pageIndex() > maxPage && maxPage >= 0) {
      this.pageIndex.set(maxPage);
    }
  }

  // --- FILTER ACTIONS ---
  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
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
    this.selectedRole.set('All');
    this.selectedStatus.set('All');
    this.pageIndex.set(0);
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
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
          myBookings: true,
          manageUsers: false,
          manageClasses: false,
          manageRooms: false,
          manageAssets: false,
          manageBookings: false,
          manageCampuses: false,
          manageRoles: false,
        },
        onSave: (payload: UserFormPayload) => this.handleSave(payload),
      },
      width: '500px',
    });
  }

  openEditUserModal(user: UserResponseDto, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.modalService.open(UserFormModalComponent, {
      title: 'Redigera användare',
      data: {
        user: user,
        templateOptions: this.templateOptions(),
        initialTemplateId: user.permissions?.permissionTemplateId ?? null,
        initialPermissions: user.permissions,
        onSave: (payload: UserFormPayload) => this.handleSave(payload, user.id, user.permissions),
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
        if (created.id) {
          await this.syncTemplateAssignment(
            created.id,
            selectedTemplateId,
            payload.customPermissions,
            undefined,
          );
        }
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
      !!existingPermissions.myBookings !== next.myBookings ||
      !!existingPermissions.manageUsers !== next.manageUsers ||
      !!existingPermissions.manageClasses !== next.manageClasses ||
      !!existingPermissions.manageRooms !== next.manageRooms ||
      !!existingPermissions.manageAssets !== next.manageAssets ||
      !!existingPermissions.manageBookings !== next.manageBookings ||
      !!existingPermissions.manageCampuses !== next.manageCampuses ||
      !!existingPermissions.manageRoles !== next.manageRoles
    );
  }
}
