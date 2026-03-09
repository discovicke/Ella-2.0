import { Component, inject, resource, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingSlugService } from '../../../core/services/booking-slug.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { BookingSlugResponseDto } from '../../../models/models';

@Component({
  selector: 'app-manage-slugs-page',
  standalone: true,
  imports: [CommonModule, TableComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Hantera Bokningslänkar</h1>
        <p>Här kan du se och ta bort aktiva snabbokningslänkar för användare.</p>
      </div>

      <div class="page-content">
        <app-table
          [data]="slugsResource.value() || []"
          [columns]="columns"
          [isLoading]="slugsResource.isLoading()"
          [total]="(slugsResource.value() || []).length"
          emptyMessage="Inga aktiva bokningslänkar hittades."
        >
        </app-table>
      </div>
    </div>

    <!-- Templates -->
    <ng-template #createdAtTpl let-slug>
      {{ slug.createdAt | date: 'yyyy-MM-dd HH:mm' }}
    </ng-template>

    <ng-template #urlTpl let-slug>
      <div class="url-cell">
        <code>{{ slug.slug }}</code>
        <button class="icon-btn" (click)="copyLink(slug.bookingUrl)" title="Kopiera länk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.242a2 2 0 0 0-.602-1.43L16.083 2.57A2 2 0 0 0 14.654 2H10a2 2 0 0 0-2 2z"/><path d="M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"/></svg>
        </button>
      </div>
    </ng-template>

    <ng-template #actionsTpl let-slug>
      <button class="delete-btn" (click)="deleteSlug(slug)" title="Ta bort länk">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </ng-template>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; color: var(--color-text-primary); }
    .page-header p { margin: 0.5rem 0 0; color: var(--color-text-secondary); }
    
    .url-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      code { background: var(--color-bg-panel); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
    }

    .icon-btn, .delete-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      svg { width: 1.1rem; height: 1.1rem; }
    }

    .icon-btn { color: var(--color-text-muted); &:hover { color: var(--color-primary); background: var(--color-primary-surface); } }
    .delete-btn { color: var(--color-danger); &:hover { background: var(--color-danger-surface); } }
  `]
})
export class ManageSlugsPage implements OnInit {
  private slugService = inject(BookingSlugService);
  private toastService = inject(ToastService);

  @ViewChild('createdAtTpl', { static: true }) createdAtTpl!: TemplateRef<any>;
  @ViewChild('urlTpl', { static: true }) urlTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<BookingSlugResponseDto>[] = [];

  slugsResource = resource({
    loader: () => firstValueFrom(this.slugService.getAllSlugs())
  });

  ngOnInit() {
    this.columns = [
      { header: 'Användare', field: 'userDisplayName' },
      { header: 'Länk (Slug)', template: this.urlTpl },
      { header: 'Skapad', template: this.createdAtTpl, width: '180px' },
      { header: '', template: this.actionsTpl, width: '60px', align: 'right' }
    ];
  }

  copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.showSuccess('Länken kopierad!');
    });
  }

  async deleteSlug(slug: BookingSlugResponseDto) {
    if (confirm(`Är du säker på att du vill ta bort länken för ${slug.userDisplayName}?`)) {
      this.slugService.deleteSlug(slug.id).subscribe({
        next: () => {
          this.toastService.showSuccess('Länken har tagits bort.');
          this.slugsResource.reload();
        },
        error: () => this.toastService.showError('Kunde inte ta bort länken.')
      });
    }
  }
}