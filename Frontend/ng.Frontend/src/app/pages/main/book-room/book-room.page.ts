import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RoomService } from '../../../shared/services/room.service';
import { ModalService } from '../../../shared/services/modal.service';
import { RoomDetailModel, RoomType } from '../../../models/models';
import { BookingModalComponent } from './booking-modal/booking-modal.component';

@Component({
  selector: 'app-book-room-page',
  standalone: true,
  imports: [],
  templateUrl: './book-room.page.html',
  styleUrl: './book-room.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookRoomPage {
  private readonly roomService = inject(RoomService);
  private readonly modalService = inject(ModalService);

  // --- STATE ---
  searchQuery = signal('');
  selectedType = signal<RoomType | 'All'>('All');
  minCapacity = signal<number>(0);
  filtersOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  // --- RESOURCES ---

  // Rooms
  roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms()),
  });

  // --- COMPUTED ---
  filteredRooms = computed(() => {
    const all = this.roomsResource.value() ?? [];
    const query = this.searchQuery().toLowerCase();
    const type = this.selectedType();
    const capacity = this.minCapacity();

    return all.filter((r) => {
      const matchesSearch =
        !query || r.name?.toLowerCase().includes(query) || r.address?.toLowerCase().includes(query);
      const matchesType = type === 'All' || r.type === type;
      const matchesCapacity = (r.capacity ?? 0) >= capacity;
      return matchesSearch && matchesType && matchesCapacity;
    });
  });

  totalRooms = computed(() => this.roomsResource.value()?.length ?? 0);

  hasActiveFilters = computed(
    () => this.searchQuery() !== '' || this.selectedType() !== 'All' || this.minCapacity() > 0,
  );

  readonly roomTypes = Object.values(RoomType);

  // --- ACTIONS ---

  onBookRoom(room: RoomDetailModel) {
    this.modalService.open(BookingModalComponent, {
      title: `Boka ${room.name}`,
      data: room,
      width: '600px',
    });
  }

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  updateType(event: Event) {
    this.selectedType.set((event.target as HTMLSelectElement).value as RoomType | 'All');
  }

  updateCapacity(event: Event) {
    this.minCapacity.set(Number((event.target as HTMLInputElement).value));
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedType.set('All');
    this.minCapacity.set(0);
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
  }
}
