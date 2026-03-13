import { Component, inject, signal, computed, OnInit, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { TimePickerComponent } from '../../../shared/components/time-picker/time-picker.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { CalendarComponent, CalendarViewMode } from '../../../shared/components/calendar/calendar.component';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { DayPilot } from '@daypilot/daypilot-lite-angular';
import { 
  ResourceResponseDto, 
  ResourceCategoryDto, 
  CampusResponseDto,
  CreateResourceBookingDto,
  ResourceBookingResponseDto
} from '../../../models/models';

@Component({
  selector: 'app-book-resource-page',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonComponent, 
    BadgeComponent,
    DatePickerComponent,
    TimePickerComponent,
    SelectComponent,
    CalendarComponent,
    ReactiveFormsModule
  ],
  templateUrl: './book-resource.page.html',
  styleUrl: './book-resource.page.scss'
})
export class BookResourcePage implements OnInit {
  private resourceService = inject(ResourceService);
  private campusService = inject(CampusService);
  private toastService = inject(ToastService);

  // Data resources
  campuses = signal<CampusResponseDto[]>([]);
  categories = signal<ResourceCategoryDto[]>([]);
  allResources = signal<ResourceResponseDto[]>([]);

  // Selection state
  selectedCampusId = signal<number>(0);
  selectedCategoryId = signal<number>(0);
  selectedResource = signal<ResourceResponseDto | null>(null);
  
  discoveryView = signal<'availability' | 'schedule'>('availability');
  selectedDate = signal<Date>(new Date());
  
  isLoading = signal(true);
  isSubmitting = signal(false);
  today = this.toDateInputValue(new Date());

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

  // Booking Form
  bookingForm = new FormGroup({
    date: new FormControl(this.today, { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('08:00', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('17:00', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('')
  });

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

  updateDate(date: string | null) {
    if (date) this.bookingForm.controls.date.setValue(date);
  }

  updateStartTime(time: string | null) {
    if (time) this.bookingForm.controls.startTime.setValue(time);
  }

  updateEndTime(time: string | null) {
    if (time) this.bookingForm.controls.endTime.setValue(time);
  }

  resetFilters() {
    this.selectedCampusId.set(0);
    this.selectedCategoryId.set(0);
  }

  selectResource(res: ResourceResponseDto) {
    this.selectedResource.set(res);
    this.bookingForm.patchValue({
      date: this.today,
      startTime: '08:00',
      endTime: '17:00',
      notes: ''
    });
  }

  onTimeRangeSelected(range: { start: Date; end: Date; resourceId?: number }) {
    if (!range.resourceId) return;

    const res = this.allResources().find(r => r.id === range.resourceId);
    if (!res) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    
    this.selectedResource.set(res);
    this.bookingForm.patchValue({
      date: `${range.start.getFullYear()}-${pad(range.start.getMonth() + 1)}-${pad(range.start.getDate())}`,
      startTime: `${pad(range.start.getHours())}:${pad(range.start.getMinutes())}`,
      endTime: `${pad(range.end.getHours())}:${pad(range.end.getMinutes())}`,
      notes: ''
    });
  }

  onEventClicked(booking: ResourceBookingResponseDto) {
    // Optionally show a detail modal for resource bookings
  }

  async submitBooking() {
    if (this.bookingForm.invalid || !this.selectedResource()) return;

    this.isSubmitting.set(true);
    const form = this.bookingForm.getRawValue();
    const res = this.selectedResource()!;

    // Construct local dates to avoid timezone issues when converting to ISO
    const startStr = `${form.date}T${form.startTime}`;
    const endStr = `${form.date}T${form.endTime}`;

    const dto: CreateResourceBookingDto = {
      resourceId: res.id,
      startTime: new Date(startStr).toISOString(),
      endTime: new Date(endStr).toISOString(),
      notes: form.notes || ''
    };

    try {
      await firstValueFrom(this.resourceService.createBooking(dto));
      this.toastService.showSuccess(`Bokning av ${res.name} klar!`);
      this.selectedResource.set(null);
      this.bookingsResource.reload();
    } catch (err: any) {
      if (err.status === 409) {
        this.toastService.showError('Resursen är redan bokad under denna tid.');
      } else {
        this.toastService.showError('Kunde inte genomföra bokningen.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private toDateInputValue(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}

