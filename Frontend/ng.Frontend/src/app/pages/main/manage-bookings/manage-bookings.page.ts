import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  resource,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { BookingDetailedReadModel, BookingStatus } from '../../../models/models';
import { BookingService } from '../../../shared/services/booking.service';
import { ModalService } from '../../../shared/services/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { BookingEditModalComponent } from './booking-edit-modal.component';

@Component({
  selector: 'app-manage-bookings-page',
  imports: [TableComponent, DatePipe],
  templateUrl: './manage-bookings.page.html',
  styleUrl: './manage-bookings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageBookingsPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly modalService = inject(ModalService);
  private readonly toastService = inject(ToastService);

  @ViewChild('userTpl', { static: true }) userTpl!: TemplateRef<any>;
  @ViewChild('roomTpl', { static: true }) roomTpl!: TemplateRef<any>;
  @ViewChild('dateTpl', { static: true }) dateTpl!: TemplateRef<any>;
  @ViewChild('timeTpl', { static: true }) timeTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<BookingDetailedReadModel>[] = [];

  // --- Filter state ---
  searchQuery = signal('');
  selectedStatus = signal<BookingStatus | 'All'>('All');
  pageIndex = signal(0);
  pageSize = signal(10);

  // --- Resource ---
  bookingsResource = resource({
    loader: () => firstValueFrom(this.bookingService.getAllBookings()),
  });

  readonly bookings = computed(() => this.bookingsResource.value() ?? []);

  readonly filteredBookings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.bookings().filter((b) => {
      const matchesStatus = status === 'All' || b.status === status;
      const matchesSearch =
        !query ||
        (b.userName ?? '').toLowerCase().includes(query) ||
        (b.userEmail ?? '').toLowerCase().includes(query) ||
        (b.roomName ?? '').toLowerCase().includes(query) ||
        (b.notes ?? '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  });

  readonly totalBookings = computed(() => this.filteredBookings().length);
  readonly totalAllBookings = computed(() => this.bookings().length);

  readonly paginatedBookings = computed(() => {
    const list = this.filteredBookings();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly hasActiveFilters = computed(
    () => this.searchQuery() !== '' || this.selectedStatus() !== 'All',
  );

  // --- Stats ---
  readonly activeCount = computed(
    () => this.bookings().filter((b) => b.status === BookingStatus.Active).length,
  );
  readonly cancelledCount = computed(
    () => this.bookings().filter((b) => b.status === BookingStatus.Cancelled).length,
  );
  readonly expiredCount = computed(
    () => this.bookings().filter((b) => b.status === BookingStatus.Expired).length,
  );

  ngOnInit(): void {
    this.columns = [
      { header: 'Användare', template: this.userTpl },
      { header: 'Rum', template: this.roomTpl, width: '140px' },
      { header: 'Datum', template: this.dateTpl, width: '110px' },
      { header: 'Tid', template: this.timeTpl, width: '120px' },
      { header: 'Status', template: this.statusTpl, width: '110px' },
      { header: '', template: this.actionsTpl, width: '80px', align: 'right' },
    ];
  }

  // --- Filter actions ---
  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  updateStatus(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as BookingStatus | 'All');
    this.pageIndex.set(0);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('All');
    this.pageIndex.set(0);
  }

  handlePageChange(page: number): void {
    this.pageIndex.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    const maxPage = Math.ceil(this.totalBookings() / size) - 1;
    if (this.pageIndex() > maxPage && maxPage >= 0) {
      this.pageIndex.set(maxPage);
    }
  }

  // --- Status label ---
  statusLabel(status?: BookingStatus): string {
    switch (status) {
      case BookingStatus.Active:
        return 'Aktiv';
      case BookingStatus.Cancelled:
        return 'Avbokad';
      case BookingStatus.Expired:
        return 'Utgången';
      default:
        return '—';
    }
  }

  // --- Modal ---
  openBookingModal(booking: BookingDetailedReadModel, event?: Event): void {
    if (event) event.stopPropagation();

    this.modalService.open(BookingEditModalComponent, {
      title: 'Bokningsdetaljer',
      data: {
        booking,
        onStatusChange: (bookingId: number, newStatus: BookingStatus) =>
          this.handleStatusChange(bookingId, newStatus),
      },
      width: '520px',
    });
  }

  private async handleStatusChange(bookingId: number, newStatus: BookingStatus): Promise<void> {
    try {
      await firstValueFrom(this.bookingService.updateBookingStatus(bookingId, newStatus));
      const label = newStatus === BookingStatus.Active ? 'aktiverad' : 'avbokad';
      this.toastService.showSuccess(`Bokningen har ${label}.`);
      this.modalService.close();
      this.bookingsResource.reload();
    } catch (err) {
      console.error('Failed updating booking status', err);
      this.toastService.showError('Kunde inte uppdatera bokningens status.');
      throw err;
    }
  }
}
