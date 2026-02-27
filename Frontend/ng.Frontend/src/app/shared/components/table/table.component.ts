import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  input,
  output,
  ElementRef,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';

export interface TableColumn<T = any> {
  header: string;
  field?: keyof T;
  template?: TemplateRef<any>;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-table',
  imports: [NgTemplateOutlet],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent<T> implements AfterViewInit, OnDestroy {
  data = input.required<T[]>();
  columns = input.required<TableColumn<T>[]>();
  isLoading = input(false);
  emptyMessage = input('Inga data hittades.');

  // Pagination
  pageIndex = input(0);
  pageSize = input(10);
  total = input(0);

  // AutoSize: calculates how many rows fit in the container.
  // On first calc uses rowHeight as estimate; after data renders,
  // measures actual row height for accuracy. No feedback loop because
  // .table-body height is content-independent (flex:1 + overflow:hidden).
  autoSize = input(false);
  rowHeight = input(53);

  // Outputs
  pageChange = output<number>();
  pageSizeChange = output<number>();
  rowClicked = output<T>();

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize()));
  startItem = computed(() => this.pageIndex() * this.pageSize() + 1);
  endItem = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.total()));

  private elementRef = inject(ElementRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private resizeObserver?: ResizeObserver;
  private bodyEl: HTMLElement | null = null;
  private measuredRowHeight = 0;

  /** After data renders, re-measure using actual row height. */
  private recalcEffect = effect(() => {
    this.data(); // track
    if (this.autoSize() && this.bodyEl) {
      setTimeout(() => this.bodyEl && this.emitFit(this.bodyEl));
    }
  });

  ngAfterViewInit() {
    if (!this.isBrowser || !this.autoSize()) return;

    this.bodyEl = this.elementRef.nativeElement.querySelector('.table-body');
    if (!this.bodyEl) return;

    // Calculate once immediately (uses rowHeight constant — no rows yet)
    this.emitFit(this.bodyEl);

    // Recalculate when .table-body resizes. Because .table-body has
    // overflow:hidden + flex:1, its size only changes on genuine layout
    // changes (window resize, sidebar toggle, monitor switch) — never
    // from content/row changes. So this is safe from feedback loops.
    this.resizeObserver = new ResizeObserver(() => this.emitFit(this.bodyEl!));
    this.resizeObserver.observe(this.bodyEl);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private emitFit(bodyEl: HTMLElement) {
    const bodyH = bodyEl.getBoundingClientRect().height;
    if (!bodyH) return;

    const thead = this.elementRef.nativeElement.querySelector('thead');
    const headerH = thead ? thead.getBoundingClientRect().height : 50;

    // Prefer measured row height from actual rendered rows
    if (!this.measuredRowHeight) {
      const row = bodyEl.querySelector('tbody tr.clickable-row');
      if (row) {
        this.measuredRowHeight = row.getBoundingClientRect().height;
      }
    }

    const rh = this.measuredRowHeight || this.rowHeight();
    const fit = Math.max(1, Math.floor((bodyH - headerH) / rh));

    if (fit !== this.pageSize()) {
      this.pageSizeChange.emit(fit);
    }
  }

  onRowClick(row: T) {
    this.rowClicked.emit(row);
  }

  onPageChange(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.pageChange.emit(newPage);
    }
  }
}
