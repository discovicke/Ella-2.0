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
import { PermissionTemplateService } from '../../../shared/services/permission-template.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PermissionTemplateDto } from '../../../models/models';
import { firstValueFrom } from 'rxjs';
import { initPermissionTemplates } from '../../../core/permission-templates';

/** Local working copy of a template for editing. */
interface EditableTemplate {
  uid: number;
  label: string;
  cssClass: string;
  permissions: Record<string, boolean>;
  isNew?: boolean;
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
  private templateService = inject(PermissionTemplateService);
  private toastService = inject(ToastService);

  // --- State ---
  templates = signal<EditableTemplate[]>([]);
  saving = signal(false);
  loading = signal(true);

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
          label: t.label ?? '',
          cssClass: t.cssClass ?? '',
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
        this.toastService.show(`Roll "${tpl.label}" saknar CSS-klass.`, 'error');
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
        label: t.label.trim(),
        cssClass: t.cssClass.trim(),
        permissions: { ...t.permissions },
      }));

      const result = await firstValueFrom(this.templateService.updateAll(dtos));

      // Update local state with server response
      this.templates.set(
        result.map((t) => ({
          uid: nextUid++,
          label: t.label ?? '',
          cssClass: t.cssClass ?? '',
          permissions: { ...(t.permissions ?? {}) },
        })),
      );

      // Refresh the global permission templates signal so the rest of the app updates
      await initPermissionTemplates();

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
}
