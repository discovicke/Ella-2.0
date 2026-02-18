import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionTemplateService } from '../../../shared/services/permission-template.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PermissionTemplateDto } from '../../../models/models';
import { firstValueFrom } from 'rxjs';
import { initPermissionTemplates } from '../../../core/permission-templates';

/** Local working copy of a template for editing. */
interface EditableTemplate {
  uid: number;
  id?: number | null;
  label: string;
  cssClass: string;
  permissions: Record<string, boolean>;
  isNew?: boolean;
}

interface RoleColorOption {
  label: string;
  cssClass: string;
}

let nextUid = 0;

@Component({
  selector: 'app-manage-roles-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './manage-roles.page.html',
  styleUrl: './manage-roles.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageRolesPage implements OnInit {
  private authService = inject(AuthService);
  private templateService = inject(PermissionTemplateService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);

  // --- State ---
  templates = signal<EditableTemplate[]>([]);
  saving = signal(false);
  loading = signal(true);

  readonly colorOptions: RoleColorOption[] = [
    { label: 'Grön', cssClass: 'student' },
    { label: 'Blå', cssClass: 'educator' },
    { label: 'Orange', cssClass: 'admin' },
    { label: 'Grå', cssClass: 'custom' },
  ];

  private readonly permissionLabelMap: Record<string, string> = {
    book_room: 'Boka rum',
    my_bookings: 'Mina bokningar',
    manage_users: 'Hantera användare',
    manage_classes: 'Hantera klasser',
    manage_rooms: 'Hantera rum',
    manage_assets: 'Hantera tillgångar',
    manage_bookings: 'Hantera bokningar',
    manage_campuses: 'Hantera campus',
    manage_roles: 'Hantera roller',
  };

  /** All unique permission keys across templates (sorted). */
  permissionKeys = computed(() => {
    const keys = new Set<string>();
    for (const tpl of this.templates()) {
      if (tpl.permissions) {
        Object.keys(tpl.permissions).forEach((k) => keys.add(k));
      }
    }
    return [...keys].sort();
  });

  /** Formats snake_case keys to human-readable labels. */
  formatKey(key: string): string {
    if (this.permissionLabelMap[key]) {
      return this.permissionLabelMap[key];
    }

    return key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  hasChanges = signal(false);

  ngOnInit() {
    this.loadTemplates();
  }

  async loadTemplates() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.templateService.getAll());
      this.templates.set(
        data.map((t) => ({
          uid: nextUid++,
          id: t.id,
          label: t.label ?? '',
          cssClass: this.normalizeCssClass(t.cssClass),
          permissions: { ...(t.permissions ?? {}) },
        })),
      );
      this.hasChanges.set(false);
    } catch {
      this.toastService.show('Kunde inte ladda roller.', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  togglePermission(templateIndex: number, key: string) {
    this.templates.update((list) => {
      const copy = list.map((t) => ({ ...t, permissions: { ...t.permissions } }));
      copy[templateIndex].permissions[key] = !copy[templateIndex].permissions[key];
      return copy;
    });
    this.hasChanges.set(true);
  }

  updateLabel(templateIndex: number, value: string) {
    this.templates.update((list) => {
      const copy = [...list];
      copy[templateIndex] = { ...copy[templateIndex], label: value };
      return copy;
    });
    this.hasChanges.set(true);
  }

  updateCssClass(templateIndex: number, value: string) {
    this.templates.update((list) => {
      const copy = [...list];
      copy[templateIndex] = { ...copy[templateIndex], cssClass: value };
      return copy;
    });
    this.hasChanges.set(true);
  }

  addTemplate() {
    const keys = this.permissionKeys();
    const perms: Record<string, boolean> = {};
    keys.forEach((k) => (perms[k] = false));

    this.templates.update((list) => [
      ...list,
      { uid: nextUid++, label: '', cssClass: '', permissions: perms, isNew: true },
    ]);
    this.hasChanges.set(true);
  }

  removeTemplate(index: number) {
    this.templates.update((list) => list.filter((_, i) => i !== index));
    this.hasChanges.set(true);
  }

  async save() {
    const templates = this.templates();

    // Validate
    for (const tpl of templates) {
      if (!tpl.label.trim()) {
        this.toastService.show('Alla roller måste ha ett namn.', 'error');
        return;
      }
      if (!tpl.cssClass.trim()) {
        this.toastService.show(`Roll "${tpl.label}" saknar färg.`, 'error');
        return;
      }
    }

    // Check for duplicate labels
    const labels = templates.map((t) => t.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      this.toastService.show('Rollnamn måste vara unika.', 'error');
      return;
    }

    this.saving.set(true);
    try {
      const dtos: PermissionTemplateDto[] = templates.map((t) => ({
        id: t.id,
        label: t.label.trim(),
        cssClass: t.cssClass.trim(),
        permissions: { ...t.permissions },
      }));

      const propagate = await this.confirmService.show(
        'Ska uppdaterade rollbehörigheter även gälla för användare som redan har de här rollerna?',
        {
          title: 'Tillämpa på befintliga användare?',
          confirmText: 'Ja, uppdatera användare',
          cancelText: 'Nej, spara bara mallar',
          icon: 'question',
          dangerConfirm: false,
        },
      );

      const result = await firstValueFrom(this.templateService.updateAll(dtos, propagate));

      // Update local state with server response
      this.templates.set(
        result.map((t) => ({
          uid: nextUid++,
          id: t.id,
          label: t.label ?? '',
          cssClass: this.normalizeCssClass(t.cssClass),
          permissions: { ...(t.permissions ?? {}) },
        })),
      );

      // Refresh the global permission templates signal so the rest of the app updates
      await initPermissionTemplates();
      await this.authService.refreshCurrentUser();

      this.hasChanges.set(false);
      this.toastService.show('Roller sparade!', 'success');
    } catch {
      this.toastService.show('Kunde inte spara roller.', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  discard() {
    this.loadTemplates();
  }

  private normalizeCssClass(value: string | undefined | null): string {
    const cssClass = (value ?? '').trim().toLowerCase();
    const isKnown = this.colorOptions.some((option) => option.cssClass === cssClass);
    return isKnown ? cssClass : 'custom';
  }
}
