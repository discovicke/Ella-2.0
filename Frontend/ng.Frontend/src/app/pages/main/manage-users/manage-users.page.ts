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
  UpdateUserDto,
  UserResponseDto,
  UserRole,
} from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { UserFormModalComponent } from './user-form-modal.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';

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
  selectedRole = signal<UserRole | 'All'>('All');
  selectedStatus = signal<BannedStatus | 'All'>('All');
  searchClass = signal('');
  filtersOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  readonly userRoles = Object.values(UserRole);

  // Pagination state
  pageIndex = signal(0);
  pageSize = 10;

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
    const classQuery = this.searchClass().toLowerCase();

    return all.filter((u) => {
      const matchesSearch =
        !query ||
        u.displayName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query);
      const matchesRole = role === 'All' || u.role === role;
      const matchesStatus = status === 'All' || u.isBanned === status;
      const matchesClass = !classQuery || u.userClass?.toLowerCase().includes(classQuery);
      return matchesSearch && matchesRole && matchesStatus && matchesClass;
    });
  });

  totalUsers = computed(() => this.filteredUsers().length);
  totalAllUsers = computed(() => this.userResource.value()?.length ?? 0);

  paginatedUsers = computed(() => {
    const users = this.filteredUsers();
    const start = this.pageIndex() * this.pageSize;
    const end = start + this.pageSize;
    return users.slice(start, end);
  });

  hasActiveFilters = computed(
    () =>
      this.searchQuery() !== '' ||
      this.selectedRole() !== 'All' ||
      this.selectedStatus() !== 'All' ||
      this.searchClass() !== '',
  );

  ngOnInit() {
    this.columns = [
      { header: '', template: this.avatarTpl, width: '40px', align: 'center' },
      { header: 'Namn', field: 'displayName' }, // Removed ID, moved name first
      { header: 'E-post', field: 'email' },
      { header: 'Kurs/Klass', field: 'userClass' },
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

  // --- FILTER ACTIONS ---
  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  updateRole(event: Event) {
    this.selectedRole.set((event.target as HTMLSelectElement).value as UserRole | 'All');
    this.pageIndex.set(0);
  }

  updateStatus(event: Event) {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as BannedStatus | 'All');
    this.pageIndex.set(0);
  }

  updateClass(event: Event) {
    this.searchClass.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedRole.set('All');
    this.selectedStatus.set('All');
    this.searchClass.set('');
    this.pageIndex.set(0);
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
  }

  openAddUserModal() {
    this.modalService.open(UserFormModalComponent, {
      title: 'Skapa ny användare',
      data: {
        user: null,
        onSave: (payload: CreateUserDto) => this.handleSave(payload),
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
        onSave: (payload: UpdateUserDto) => this.handleSave(payload, user.id),
        onDelete: (id: number) => this.handleDelete(id),
      },
      width: '500px',
    });
  }

  private handleDelete(id: number) {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.toastService.showSuccess('Användaren raderad!');
        this.modalService.close();
        this.userResource.reload();
        // Reset page if we delete the last item on the current page
        if (this.paginatedUsers().length === 0 && this.pageIndex() > 0) {
          this.pageIndex.update((p) => p - 1);
        }
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.toastService.showError('Kunde inte radera användaren.');
      },
    });
  }

  private handleSave(payload: any, userId?: number) {
    const obs = userId
      ? this.userService.updateUser(userId, payload)
      : this.userService.createUser(payload);

    obs.subscribe({
      next: () => {
        this.toastService.showSuccess(`Användaren ${userId ? 'uppdaterad' : 'skapad'}!`);
        this.modalService.close();
        this.userResource.reload();
      },
      error: (err) => {
        console.error('Save failed', err);
        this.toastService.showError(err.error || 'Kunde inte spara användaren.');
      },
    });
  }
}
