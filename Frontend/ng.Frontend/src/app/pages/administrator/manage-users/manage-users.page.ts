import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalService } from '../../../shared/services/modal.service';
import { UserFormModalComponent } from './user-form-modal.component';

@Component({
  selector: 'app-manage-users-page',
  imports: [],
  templateUrl: './manage-users.page.html',
  styleUrl: './manage-users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsersPage {
  private modalService = inject(ModalService);

  openAddUserModal() {
    this.modalService.open(UserFormModalComponent, {
      title: 'Skapa ny användare',
      width: '500px'
    });
  }

  openEditUserModal(user: any) {
    this.modalService.open(UserFormModalComponent, {
      title: 'Redigera användare',
      data: user, // Skicka med befintlig data till modalen
      width: '500px'
    });
  }
}
