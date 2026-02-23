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
import { RoomDetailModel, RoomTypeResponseDto } from '../../../models/models';
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
  selectedTypeId = signal<number | 'All'>('All');
  minCapacity = signal<number>(0);
  filtersOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  // --- RESOURCES ---

  // Rooms
  roomsResource = resource({
    loader: () => firstValueFrom(this.roomService.getAllRooms()),
  });

  // Room Types
  typesResource = resource({
    loader: () => firstValueFrom(this.roomService.getRoomTypes()),
  });

  // --- COMPUTED ---
  filteredRooms = computed(() => {
    const all = this.roomsResource.value() ?? [];
    const query = this.searchQuery().toLowerCase();
    const typeId = this.selectedTypeId();
    const capacity = this.minCapacity();

    return all.filter((r) => {
      const matchesSearch = !query || r.name?.toLowerCase().includes(query);
      const matchesType = typeId === 'All' || r.roomTypeId === typeId;
      const matchesCapacity = (r.capacity ?? 0) >= capacity;
      return matchesSearch && matchesType && matchesCapacity;
    });
  });

  totalRooms = computed(() => this.roomsResource.value()?.length ?? 0);

  hasActiveFilters = computed(
    () => this.searchQuery() !== '' || this.selectedTypeId() !== 'All' || this.minCapacity() > 0,
  );

  readonly roomTypes = computed(() => this.typesResource.value() ?? []);

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
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTypeId.set(value === 'All' ? 'All' : Number(value));
  }

  updateCapacity(event: Event) {
    this.minCapacity.set(Number((event.target as HTMLInputElement).value));
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedTypeId.set('All');
    this.minCapacity.set(0);
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
  }
}
