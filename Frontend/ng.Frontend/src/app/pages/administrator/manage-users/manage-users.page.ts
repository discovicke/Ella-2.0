import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../shared/services/user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../../../models/models';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {UserFormModalComponent} from './user-form-modal.component';
import {PanelComponent} from '../../../shared/components/panel/panel.component';
import {CardComponent} from '../../../shared/components/card/card.component';

@Component({
  selector: 'app-manage-users-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, UserFormModalComponent, PanelComponent, CardComponent],
  templateUrl: './manage-users.page.html',
  styleUrl: './manage-users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsersPage {
  private modalService = inject(ModalService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  // Resource för användarlistan
  userResource = resource({
    loader: () => firstValueFrom(this.userService.getAllUsers())
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
        this.userResource.reload(); // Uppdatera listan direkt
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.toastService.showError('Kunde inte radera användaren.');
      }
    });
  }

    private handleSave(payload: any, userId?: number) {

      console.log('Sending payload:', payload); // DEBUG

  

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

          console.error('Save failed. Server responded with:', err.error); // Se exakt valideringsfel

          this.toastService.showError(err.error || 'Kunde inte spara användaren.');

        }

      });

    }

  
}
