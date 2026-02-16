import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, TemplateRef, computed, signal } from '@angular/core';
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
  @Input({ required: true }) data: T[] = [];
  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input() isLoading = false;
  @Input() emptyMessage = 'Inga data hittades.';
  
  // Pagination Inputs
  @Input() pageIndex: number = 0;
  @Input() pageSize: number = 10;
  @Input() total: number = 0;
  
  // Outputs
  @Output() pageChange = new EventEmitter<number>();
  @Output() rowClicked = new EventEmitter<T>();

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get startItem(): number {
    return this.pageIndex * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.total);
  }

  onRowClick(row: T) {
    this.rowClicked.emit(row);
  }

  onPageChange(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.pageChange.emit(newPage);
    }
  }
}
