import { ChangeDetectionStrategy, Component, inject, resource, ViewChild, TemplateRef, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../shared/services/user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../../../models/models';
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

  // Pagination state
  pageIndex = signal(0);
  pageSize = 10;

  // Resource för användarlistan
  userResource = resource({
    loader: () => firstValueFrom(this.userService.getAllUsers())
  });

  // Computed values for pagination
  totalUsers = computed(() => this.userResource.value()?.length ?? 0);
  
  paginatedUsers = computed(() => {
    const users = this.userResource.value() ?? [];
    const start = this.pageIndex() * this.pageSize;
    const end = start + this.pageSize;
    return users.slice(start, end);
  });

  ngOnInit() {
    this.columns = [
      { header: '', template: this.avatarTpl, width: '40px', align: 'center' },
      { header: 'Namn', field: 'displayName' }, // Removed ID, moved name first
      { header: 'E-post', field: 'email' },
      { header: 'Kurs/Klass', field: 'userClass' },
      { header: 'Roll', template: this.roleTpl, width: '100px' },
      { header: 'Status', template: this.statusTpl, width: '100px' },
      { header: '', template: this.actionsTpl, width: '80px', align: 'right' }
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

  openAddUserModal() {
    this.modalService.open(UserFormModalComponent, {
      title: 'Skapa ny användare',
      data: {
        user: null,
        onSave: (payload: CreateUserDto) => this.handleSave(payload)
      },
      width: '500px'
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
        onDelete: (id: number) => this.handleDelete(id)
      },
      width: '500px'
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
          this.pageIndex.update(p => p - 1);
        }
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.toastService.showError('Kunde inte radera användaren.');
      }
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
      }
    });
  }
}
