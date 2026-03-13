import { Component, inject, signal, computed, OnInit, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalService } from '../../../shared/services/modal.service';
import { firstValueFrom } from 'rxjs';
import { DayPilot } from '@daypilot/daypilot-lite-angular';
import { 
  ResourceResponseDto, 
  ResourceCategoryDto, 
  CampusResponseDto,
  ResourceBookingResponseDto
} from '../../../models/models';
import { ResourceBookingModalComponent } from './resource-booking-modal.component';
// Assume we will create this next
import { ResourceBookingDetailModalComponent } from './resource-booking-detail-modal.component';

@Component({
  selector: 'app-book-resource-page',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonComponent, 
    BadgeComponent,
    SelectComponent,
    CalendarComponent
  ],
  templateUrl: './book-resource.page.html',
  styleUrl: './book-resource.page.scss'
})
export class BookResourcePage implements OnInit {
  private resourceService = inject(ResourceService);
  private campusService = inject(CampusService);
  private toastService = inject(ToastService);
  private modalService = inject(ModalService);

  // Data resources
  campuses = signal<CampusResponseDto[]>([]);
  categories = signal<ResourceCategoryDto[]>([]);
  allResources = signal<ResourceResponseDto[]>([]);

  // Selection state
  selectedCampusId = signal<number>(0);
  selectedCategoryId = signal<number>(0);
  
  discoveryView = signal<'availability' | 'schedule'>('availability');
  selectedDate = signal<Date>(new Date());
  
  isLoading = signal(true);

  readonly bookingsResource = resource({
    loader: () => firstValueFrom(this.resourceService.getBookings())
  });

  readonly bookings = computed(() => this.bookingsResource.value() ?? []);

  // Computed: Filtered list
  filteredResources = computed(() => {
    return this.allResources().filter(r => {
      const matchCampus = this.selectedCampusId() === 0 || r.campusId === this.selectedCampusId();
      const matchCategory = this.selectedCategoryId() === 0 || r.categoryId === this.selectedCategoryId();
      return matchCampus && matchCategory && r.isActive;
    });
  });

  calendarResources = computed<DayPilot.ResourceData[]>(() => {
    return this.filteredResources().map(r => ({
      id: r.id.toString(),
      name: r.name
    }));
  });

  campusOptions = computed<SelectOption[]>(() => [
    { id: 0, label: 'Alla orter' },
    ...this.campuses().map(c => ({ id: c.id, label: c.city }))
  ]);

  categoryOptions = computed<SelectOption[]>(() => [
    { id: 0, label: 'Alla kategorier' },
    ...this.categories().map(cat => ({ id: cat.id, label: cat.name }))
  ]);

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [cams, cats, res] = await Promise.all([
        firstValueFrom(this.campusService.getAll()),
        firstValueFrom(this.resourceService.getCategories()),
        firstValueFrom(this.resourceService.getResources())
      ]);
      this.campuses.set(cams);
      this.categories.set(cats);
      this.allResources.set(res);
    } catch (err) {
      this.toastService.showError('Kunde inte ladda data.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setDiscoveryView(view: 'availability' | 'schedule') {
    this.discoveryView.set(view);
  }

  onCalendarDateChange(date: Date) {
    this.selectedDate.set(date);
  }

  onCampusChange(value: string | number | null) {
    this.selectedCampusId.set(Number(value || 0));
  }

  onCategoryChange(value: string | number | null) {
    this.selectedCategoryId.set(Number(value || 0));
  }

  resetFilters() {
    this.selectedCampusId.set(0);
    this.selectedCategoryId.set(0);
  }

  selectResource(res: ResourceResponseDto) {
    this.modalService.open(ResourceBookingModalComponent, {
      title: `Boka ${res.name}`,
      width: '500px',
      data: {
        resource: res,
        onBookingCreated: () => this.bookingsResource.reload()
      }
    });
  }

  onTimeRangeSelected(range: { start: Date; end: Date; resourceId?: number }) {
    if (!range.resourceId) return;

    const res = this.allResources().find(r => r.id === range.resourceId);
    if (!res) return;

    this.modalService.open(ResourceBookingModalComponent, {
      title: `Boka ${res.name}`,
      width: '500px',
      data: {
        resource: res,
        prefillStart: range.start,
        prefillEnd: range.end,
        onBookingCreated: () => this.bookingsResource.reload()
      }
    });
  }

  onEventClicked(booking: ResourceBookingResponseDto) {
    this.modalService.open(ResourceBookingDetailModalComponent, {
      title: 'Bokningsdetaljer',
      width: '450px',
      data: { booking }
    });
  }
}


