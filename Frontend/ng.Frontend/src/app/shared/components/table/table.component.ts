import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
  ElementRef,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  OnDestroy,
  effect,
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

  // Pagination Inputs
  pageIndex = input(0);
  pageSize = input(10);
  total = input(0);

  // Layout Inputs
  autoSize = input(false);

  // Outputs
  pageChange = output<number>();
  pageSizeChange = output<number>();
  rowClicked = output<T>();

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize()));

  startItem = computed(() => this.pageIndex() * this.pageSize() + 1);

  endItem = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.total()));

  private elementRef = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private resizeObserver?: ResizeObserver;
  private isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // React to autoSize changes or data changes that might affect layout (like footer appearing)
    effect(() => {
      if (this.autoSize() && this.isBrowser) {
        // Dependencies to track
        this.total();
        this.isLoading();

        // Wait for DOM update
        setTimeout(() => {
          if (this.elementRef?.nativeElement) {
            const rect = this.elementRef.nativeElement.getBoundingClientRect();
            this.calculatePageSize(rect.height);
          }
        });
      }
    });
  }

  ngAfterViewInit() {
    if (this.isBrowser && this.autoSize()) {
      this.initResizeObserver();
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private initResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use a debounce or requestAnimationFrame if needed, but ResizeObserver is usually efficient
        requestAnimationFrame(() => this.calculatePageSize(entry.contentRect.height));
      }
    });
    this.resizeObserver.observe(this.elementRef.nativeElement);
  }

  private calculatePageSize(containerHeight: number) {
    if (!containerHeight) return;

    // Measure header
    const header = this.elementRef.nativeElement.querySelector('thead');
    const headerHeight = header ? header.getBoundingClientRect().height : 50; // default approx

    // Measure footer (or estimate if not visible yet)
    // If we are auto-sizing, we assume we WILL have pagination if data > pageSize
    // So we should reserve space for footer.
    const footer = this.elementRef.nativeElement.querySelector('.table-footer');
    const footerHeight = footer ? footer.getBoundingClientRect().height : 56; // default approx

    // Measure row
    const row = this.elementRef.nativeElement.querySelector('tbody tr');
    // If no row, estimate based on CSS (roughly 53px for simple rows)
    const rowHeight = row ? row.getBoundingClientRect().height : 53;

    // Available space for rows
    const availableHeight = containerHeight - headerHeight - footerHeight;

    // Calculate fit
    // We want at least 1 row
    const fitRows = Math.max(1, Math.floor(availableHeight / rowHeight));

    // If different from current pageSize, emit
    if (fitRows !== this.pageSize()) {
      this.pageSizeChange.emit(fitRows);
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
