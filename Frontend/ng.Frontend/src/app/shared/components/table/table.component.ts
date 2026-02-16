import { ChangeDetectionStrategy, Component, TemplateRef, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T = any> {
  header: string;
  field?: keyof T;
  template?: TemplateRef<any>;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent<T> {
  data = input.required<T[]>();
  columns = input.required<TableColumn<T>[]>();
  isLoading = input(false);
  emptyMessage = input('Inga data hittades.');
  
  // Pagination Inputs
  pageIndex = input(0);
  pageSize = input(10);
  total = input(0);
  
  // Outputs
  pageChange = output<number>();
  rowClicked = output<T>();

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize()));

  startItem = computed(() => this.pageIndex() * this.pageSize() + 1);

  endItem = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.total()));

  onRowClick(row: T) {
    this.rowClicked.emit(row);
  }

  onPageChange(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.pageChange.emit(newPage);
    }
  }
}
