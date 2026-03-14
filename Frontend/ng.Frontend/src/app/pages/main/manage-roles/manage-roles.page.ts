import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionTemplateService } from '../../../shared/services/permission-template.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { PermissionTemplateDto } from '../../../models/models';
import { firstValueFrom } from 'rxjs';
import { initPermissionTemplates } from '../../../core/permission-templates';

/** Local working copy of a template for editing. */
interface EditableTemplate {
  uid: number;
  id?: number | null;
  label: string;
  cssClass: string;
  defaultPermissionLevel: number;
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
  imports: [FormsModule, ButtonComponent, SelectComponent],
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
    { label: 'Grön', cssClass: 'green' },
    { label: 'Blå', cssClass: 'blue' },
    { label: 'Orange', cssClass: 'orange' },
    { label: 'Lila', cssClass: 'purple' },
    { label: 'Röd', cssClass: 'red' },
    { label: 'Grå', cssClass: 'gray' },
  ];

  protected readonly permissionLevelOptions: SelectOption[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    label: `${i + 1}${i === 0 ? ' (Lägst)' : i === 9 ? ' (Högst)' : ''}`
  }));

  private readonly permissionLabelMap: Record<string, string> = {
    BookRoom: 'Boka rum',
    BookResource: 'Boka resurs',
    ManageUsers: 'Hantera användare',
    ManageClasses: 'Hantera klasser',
    ManageRooms: 'Hantera rum',
    ManageBookings: 'Hantera bokningar',
    ManageCampuses: 'Hantera campus',
    ManageRoles: 'Hantera roller',
    ManageResources: 'Hantera resurser',
  };

  /** All unique permission keys (static definition). */
  permissionKeys = computed(() => {
    return Object.keys(this.permissionLabelMap);
  });

  /** Formats PascalCase keys to human-readable labels. */
  formatKey(key: string): string {
    if (this.permissionLabelMap[key]) {
      return this.permissionLabelMap[key];
    }
    // Fallback: split PascalCase
    return key.replace(/([A-Z])/g, ' $1').trim();
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
        data.map((t) => {
          const perms = { ...(t.permissions ?? {}) };
          // Backfill missing keys as false
          this.permissionKeys().forEach((key) => {
            if (!(key in perms)) {
              perms[key] = false;
            }
          });

          return {
            uid: nextUid++,
            id: t.id,
            label: t.label ?? '',
            cssClass: this.normalizeCssClass(t.cssClass),
            defaultPermissionLevel: t.defaultPermissionLevel ?? 1,
            permissions: perms,
          };
        })
          .sort((a, b) => b.defaultPermissionLevel - a.defaultPermissionLevel)
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

  updateDefaultPermissionLevel(templateIndex: number, value: string | number) {
    this.templates.update((list) => {
      const copy = [...list];
      copy[templateIndex] = { ...copy[templateIndex], defaultPermissionLevel: Number(value) };
      return copy;
    });
    this.hasChanges.set(true);
  }

  addTemplate() {
    const keys = this.permissionKeys();
    const perms: Record<string, boolean> = {};
    keys.forEach((k) => (perms[k] = false));

    this.templates.update((list) => [
      { uid: nextUid++, label: '', cssClass: 'gray', defaultPermissionLevel: 1, permissions: perms, isNew: true },
      ...list,
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
      const dtos: PermissionTemplateDto[] = templates.map((t) => {
        // Ensure payload has all keys
        const permissions: Record<string, boolean> = {};
        this.permissionKeys().forEach((key) => {
          permissions[key] = t.permissions[key] ?? false;
        });

        return {
          id: t.id,
          label: t.label.trim(),
          cssClass: t.cssClass.trim(),
          defaultPermissionLevel: t.defaultPermissionLevel,
          permissions: permissions,
        };
      });

      // In the new architecture, updates are always global.
      // Propagation is automatic via database view.
      const result = await firstValueFrom(this.templateService.updateAll(dtos));

      // Update local state with server response
      this.templates.set(
        result.map((t) => ({
          uid: nextUid++,
          id: t.id,
          label: t.label ?? '',
          cssClass: this.normalizeCssClass(t.cssClass),
          defaultPermissionLevel: t.defaultPermissionLevel ?? 1,
          permissions: { ...(t.permissions ?? {}) },
        }))
        .sort((a, b) => b.defaultPermissionLevel - a.defaultPermissionLevel)
      );

      // Refresh the global permission templates signal so the rest of the app updates
      await initPermissionTemplates();
      await this.authService.refreshCurrentUser();

      this.hasChanges.set(false);
      this.toastService.show('Roller sparade!', 'success');
    } catch (err: any) {
      console.error('Failed to save roles', err);
      // Backend returns 409 Conflict with ProblemDetails
      let errorMsg = err?.error?.detail || err?.error?.title || 'Kunde inte spara roller.';

      if (errorMsg.includes('Cannot delete roles because')) {
        // Parse the number of users from the string: "...because 5 user(s)..."
        const count = errorMsg.match(/because (\d+) user/)?.[1] || 'flera';
        errorMsg = `Kan inte ta bort rollen eftersom ${count} användare fortfarande har den. Byt roll på dem först.`;
      }

      this.toastService.show(errorMsg, 'error');
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
    return isKnown ? cssClass : 'gray';
  }
}
