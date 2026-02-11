import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { UserFormModalComponent } from './user-form-modal.component';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../shared/services/user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../../../models/models';

@Component({
  selector: 'app-manage-users-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-users.page.html',
  styleUrl: './manage-users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsersPage {
  private modalService = inject(ModalService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  // Resource för användarlistan - laddar om automatiskt när userService.refreshTrigger() ändras
  userResource = resource({
    loader: () => {
      this.userService.refreshTrigger(); // Skapar beroende på signalen
      return firstValueFrom(this.userService.getAllUsers());
    }
  });

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

  openEditUserModal(user: UserResponseDto) {
    this.modalService.open(UserFormModalComponent, {
      title: 'Redigera användare',
      data: {
        user: user,
        onSave: (payload: UpdateUserDto) => this.handleSave(payload, user.id)
      },
      width: '500px'
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
        // userResource kommer ladda om automatiskt pga tap(() => this.refresh()) i servicen
      },
      error: (err) => {
        console.error('Save failed', err);
        this.toastService.showError('Kunde inte spara användaren.');
      }
    });
  }
}
