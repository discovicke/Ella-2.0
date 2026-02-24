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
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  AssetTypeResponseDto,
  CreateRoomDto,
  RoomDetailModel,
  RoomTypeResponseDto,
} from '../../../models/models';
import { ModalService } from '../../../shared/services/modal.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { RoomService } from '../../../shared/services/room.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { RoomFormModalComponent, RoomFormPayload } from './room-form-modal.component';
import { AssetTypesModalComponent } from './asset-types-modal.component';

@Component({
  selector: 'app-manage-rooms-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, TableComponent],
  templateUrl: './manage-rooms.page.html',
  styleUrl: './manage-rooms.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageRoomsPage implements OnInit {
  private readonly roomService = inject(RoomService);
  private readonly toastService = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly confirmService = inject(ConfirmService);

  @ViewChild('roomIconTpl', { static: true }) roomIconTpl!: TemplateRef<any>;
  @ViewChild('campusTpl', { static: true }) campusTpl!: TemplateRef<any>;
  @ViewChild('typeTpl', { static: true }) typeTpl!: TemplateRef<any>;
  @ViewChild('capacityTpl', { static: true }) capacityTpl!: TemplateRef<any>;
  @ViewChild('assetsTpl', { static: true }) assetsTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl', { static: true }) actionsTpl!: TemplateRef<any>;

  columns: TableColumn<RoomDetailModel>[] = [];

  // Filter state
  searchQuery = signal('');
  selectedCampusId = signal<number | null>(null);
  selectedRoomTypeId = signal<number | null>(null);
  filtersOpen = signal(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  // Pagination
  pageIndex = signal(0);
  pageSize = signal(10);

  // Data resource
  roomResource = resource({
    loader: async () => {
      const [rooms, roomTypes, assetTypes] = await Promise.all([
        firstValueFrom(this.roomService.getAllRooms()),
        firstValueFrom(this.roomService.getRoomTypes()),
        firstValueFrom(this.roomService.getAssetTypes()),
      ]);
      return { rooms, roomTypes, assetTypes };
    },
  });

  // Derived data
  readonly rooms = computed(() => this.roomResource.value()?.rooms ?? []);
  readonly roomTypes = computed(() => this.roomResource.value()?.roomTypes ?? []);
  readonly assetTypes = computed(() => this.roomResource.value()?.assetTypes ?? []);

  readonly campusOptions = computed(() => {
    const lookup = new Map<number, string>();
    for (const room of this.rooms()) {
      if (room.campusId && room.campusCity) {
        lookup.set(room.campusId, room.campusCity);
      }
    }
    return Array.from(lookup.entries())
      .map(([id, city]) => ({ id, city }))
      .sort((a, b) => a.city.localeCompare(b.city));
  });

  // Filtered data
  readonly filteredRooms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const campusId = this.selectedCampusId();
    const roomTypeId = this.selectedRoomTypeId();

    return this.rooms().filter((room) => {
      const matchesQuery =
        !query ||
        room.name?.toLowerCase().includes(query) ||
        room.campusCity?.toLowerCase().includes(query) ||
        room.roomTypeName?.toLowerCase().includes(query);
      const matchesCampus = !campusId || room.campusId === campusId;
      const matchesType = !roomTypeId || room.roomTypeId === roomTypeId;
      return matchesQuery && matchesCampus && matchesType;
    });
  });

  readonly totalRooms = computed(() => this.filteredRooms().length);
  readonly totalAllRooms = computed(() => this.rooms().length);

  readonly paginatedRooms = computed(() => {
    const rooms = this.filteredRooms();
    const start = this.pageIndex() * this.pageSize();
    return rooms.slice(start, start + this.pageSize());
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery() !== '' ||
      this.selectedCampusId() !== null ||
      this.selectedRoomTypeId() !== null,
  );

  ngOnInit(): void {
    this.columns = [
      { header: '', template: this.roomIconTpl, width: '40px', align: 'center' },
      { header: 'Namn', field: 'name' },
      { header: 'Campus', template: this.campusTpl },
      { header: 'Typ', template: this.typeTpl, width: '110px' },
      { header: 'Kapacitet', template: this.capacityTpl, width: '90px', align: 'center' },
      { header: 'Assets', template: this.assetsTpl, width: '80px', align: 'center' },
      { header: '', template: this.actionsTpl, width: '80px', align: 'right' },
    ];
  }

  // --- Pagination ---
  handlePageChange(page: number): void {
    this.pageIndex.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    const maxPage = Math.ceil(this.totalRooms() / size) - 1;
    if (this.pageIndex() > maxPage && maxPage >= 0) {
      this.pageIndex.set(maxPage);
    }
  }

  // --- Filters ---
  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  updateCampusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCampusId.set(value ? Number(value) : null);
    this.pageIndex.set(0);
  }

  updateTypeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedRoomTypeId.set(value ? Number(value) : null);
    this.pageIndex.set(0);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCampusId.set(null);
    this.selectedRoomTypeId.set(null);
    this.pageIndex.set(0);
  }

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  // --- Room modals ---
  openAddRoomModal(): void {
    const defaultCampus = this.campusOptions()[0]?.id ?? null;
    const defaultRoomType = this.roomTypes()[0]?.id ?? null;

    this.modalService.open(RoomFormModalComponent, {
      title: 'Skapa nytt rum',
      data: {
        room: null,
        campusOptions: this.campusOptions(),
        roomTypes: this.roomTypes(),
        assetTypes: this.assetTypes(),
        initialAssetIds: [],
        onSave: (payload: RoomFormPayload) => this.handleSaveRoom(payload),
      },
      width: '540px',
    });
  }

  openEditRoomModal(room: RoomDetailModel, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const assetIds = this.mapAssetDescriptionsToIds(room.assets ?? []);

    this.modalService.open(RoomFormModalComponent, {
      title: 'Redigera rum',
      data: {
        room,
        campusOptions: this.campusOptions(),
        roomTypes: this.roomTypes(),
        assetTypes: this.assetTypes(),
        initialAssetIds: assetIds,
        onSave: (payload: RoomFormPayload) => this.handleSaveRoom(payload, room.roomId),
        onDelete: (id: number) => this.handleDeleteRoom(id),
      },
      width: '540px',
    });
  }

  // --- Asset types modal ---
  openAssetTypesModal(): void {
    this.modalService.open(AssetTypesModalComponent, {
      title: 'Hantera utrustning',
      data: {
        assetTypes: this.assetTypes(),
        refreshAssetTypes: () => firstValueFrom(this.roomService.getAssetTypes()),
        onCreate: async (description: string) => {
          await firstValueFrom(this.roomService.createAssetType({ description }));
          this.toastService.showSuccess('Utrustningstyp skapades.');
          this.roomResource.reload();
        },
        onUpdate: async (id: number, description: string) => {
          await firstValueFrom(this.roomService.updateAssetType(id, { description }));
          this.toastService.showSuccess('Utrustningstyp uppdaterades.');
          this.roomResource.reload();
        },
        onDelete: async (assetType: AssetTypeResponseDto) => {
          try {
            await firstValueFrom(this.roomService.deleteAssetType(assetType.id));
            this.toastService.showSuccess('Utrustningstypen togs bort.');
            this.roomResource.reload();
          } catch {
            this.toastService.showError(
              'Kunde inte ta bort utrustningstypen. Den kan vara kopplad till rum.',
            );
            throw new Error('Delete failed');
          }
        },
      },
      width: '500px',
    });
  }

  // --- Handlers ---
  private async handleSaveRoom(payload: RoomFormPayload, roomId?: number | null): Promise<void> {
    try {
      if (roomId) {
        await firstValueFrom(this.roomService.updateRoom(roomId, payload));
        this.toastService.showSuccess('Rummet uppdaterades.');
      } else {
        await firstValueFrom(this.roomService.createRoom(payload as CreateRoomDto));
        this.toastService.showSuccess('Rummet skapades.');
      }

      this.modalService.close();
      this.roomResource.reload();
    } catch (err: any) {
      console.error('Failed saving room', err);
      this.toastService.showError('Kunde inte spara rummet.');
      throw err;
    }
  }

  private async handleDeleteRoom(id: number): Promise<void> {
    try {
      await firstValueFrom(this.roomService.deleteRoom(id));
      this.toastService.showSuccess('Rummet togs bort.');
      this.modalService.close();
      this.roomResource.reload();
      if (this.paginatedRooms().length === 0 && this.pageIndex() > 0) {
        this.pageIndex.update((p) => p - 1);
      }
    } catch (err: any) {
      if (err?.status === 409) {
        const bookingCount = err?.error?.bookingCount ?? 0;
        const confirmed = await this.confirmService.show(
          `Rummet har ${bookingCount} bokning(ar). Alla bokningar kommer att tas bort permanent.\n\nDenna åtgärd går inte att ångra.`,
          {
            title: 'Ta bort rum och bokningar?',
            icon: 'warning',
            confirmText: 'Ta bort allt',
            cancelText: 'Avbryt',
            dangerConfirm: true,
          },
        );
        if (confirmed) {
          try {
            await firstValueFrom(this.roomService.deleteRoom(id, true));
            this.toastService.showSuccess('Rummet och alla bokningar togs bort.');
            this.modalService.close();
            this.roomResource.reload();
            if (this.paginatedRooms().length === 0 && this.pageIndex() > 0) {
              this.pageIndex.update((p) => p - 1);
            }
          } catch (forceErr) {
            console.error('Failed force-deleting room', forceErr);
            this.toastService.showError('Kunde inte ta bort rummet.');
          }
        }
      } else {
        console.error('Failed deleting room', err);
        this.toastService.showError('Kunde inte ta bort rummet.');
      }
    }
  }

  private mapAssetDescriptionsToIds(descriptions: string[]): number[] {
    if (!descriptions.length) return [];
    const lookup = new Map(this.assetTypes().map((at) => [at.description.toLowerCase(), at.id]));
    return descriptions
      .map((d) => lookup.get(d.toLowerCase().trim()))
      .filter((id): id is number => typeof id === 'number');
  }
}
