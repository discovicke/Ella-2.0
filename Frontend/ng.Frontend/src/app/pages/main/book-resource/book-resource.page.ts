import { Component, inject, resource, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResourceService } from '../../../core/services/resource.service';
import { CampusService } from '../../../shared/services/campus.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ToastService } from '../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { 
  ResourceResponseDto, 
  ResourceCategoryDto, 
  CampusResponseDto,
  CreateResourceBookingDto
} from '../../../models/models';

@Component({
  selector: 'app-book-resource-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Boka Resurs</h1>
        <p>Välj ort och kategori för att se tillgängliga resurser.</p>
      </div>

      <div class="booking-grid">
        <!-- Filters Sidebar -->
        <aside class="filters-panel">
          <div class="filter-group">
            <label>Ort</label>
            <select [value]="selectedCampusId()" (change)="onCampusChange($event)">
              <option [value]="0">Alla orter</option>
              @for (c of campuses(); track c.id) {
                <option [value]="c.id">{{ c.city }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label>Kategori</label>
            <select [value]="selectedCategoryId()" (change)="onCategoryChange($event)">
              <option [value]="0">Alla kategorier</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>
        </aside>

        <!-- Main Content: Resource List or Booking Form -->
        <main class="booking-content">
          @if (selectedResource()) {
            <div class="booking-form-card animate-fade-in">
              <div class="form-header">
                <button class="back-link" (click)="selectedResource.set(null)">← Tillbaka till listan</button>
                <h2>Boka {{ selectedResource()?.name }}</h2>
                <span class="category-tag">{{ selectedResource()?.categoryName }}</span>
              </div>

              <form [formGroup]="bookingForm" (ngSubmit)="submitBooking()">
                <div class="form-row">
                  <div class="form-group">
                    <label>Datum</label>
                    <input type="date" formControlName="date" [min]="today" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Starttid</label>
                    <input type="time" formControlName="startTime" />
                  </div>
                  <div class="form-group">
                    <label>Sluttid</label>
                    <input type="time" formControlName="endTime" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Noteringar</label>
                  <textarea formControlName="notes" rows="3" placeholder="Syfte med bokningen..."></textarea>
                </div>

                <div class="form-actions">
                  <app-button variant="secondary" (clicked)="selectedResource.set(null)">Avbryt</app-button>
                  <app-button type="submit" [disabled]="bookingForm.invalid || isSubmitting()">
                    {{ isSubmitting() ? 'Bokar...' : 'Slutför bokning' }}
                  </app-button>
                </div>
              </form>
            </div>
          } @else {
            <div class="resource-list">
              @for (res of filteredResources(); track res.id) {
                <div class="resource-card" (click)="selectResource(res)">
                  <div class="res-info">
                    <h3>{{ res.name }}</h3>
                    <p class="desc">{{ res.description || 'Ingen beskrivning.' }}</p>
                    <div class="tags">
                      <span class="tag campus">{{ res.campusCity }}</span>
                      <span class="tag category">{{ res.categoryName }}</span>
                    </div>
                  </div>
                  <div class="res-action">
                    <app-button variant="primary" size="sm">Välj</app-button>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">
                  <p>Inga resurser matchar dina filter.</p>
                </div>
              }
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { margin: 0; color: var(--color-text-primary); }
    .page-header p { color: var(--color-text-secondary); margin: 0.5rem 0 0; }

    .booking-grid { display: grid; grid-template-columns: 250px 1fr; gap: 2rem; }

    .filters-panel { display: flex; flex-direction: column; gap: 1.5rem; background: var(--color-bg-panel); padding: 1.5rem; border-radius: var(--radii-lg); height: fit-content; }
    .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .filter-group label { font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); }
    .filter-group select { padding: 0.6rem; border-radius: var(--radii-md); border: 1px solid var(--color-border); background: var(--color-bg-body); color: var(--color-text-primary); }

    .resource-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .resource-card { 
      display: flex; justify-content: space-between; align-items: center;
      background: var(--color-bg-card); border: 1px solid var(--color-border); 
      padding: 1.5rem; border-radius: var(--radii-lg); cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
      &:hover { transform: translateY(-2px); border-color: var(--color-primary); }
    }
    .res-info h3 { margin: 0; font-size: 1.1rem; }
    .res-info .desc { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0.5rem 0 1rem; }
    .tags { display: flex; gap: 0.5rem; }
    .tag { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 500; }
    .tag.campus { background: var(--color-primary-surface); color: var(--color-primary); }
    .tag.category { background: var(--color-bg-panel); color: var(--color-text-secondary); }

    .booking-form-card { background: var(--color-bg-card); padding: 2rem; border-radius: var(--radii-xl); border: 1px solid var(--color-border); max-width: 600px; }
    .form-header { margin-bottom: 2rem; position: relative; }
    .back-link { background: transparent; border: none; color: var(--color-primary); cursor: pointer; padding: 0; margin-bottom: 1rem; font-size: 0.875rem; }
    .form-header h2 { margin: 0; }
    .category-tag { position: absolute; top: 0; right: 0; background: var(--color-bg-panel); font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 100px; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
    .form-group label { font-size: 0.875rem; font-weight: 500; }
    .form-group input, .form-group textarea { padding: 0.75rem; border-radius: var(--radii-md); border: 1px solid var(--color-border); background: var(--color-bg-panel); color: var(--color-text-primary); }
    .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }

    .empty-state { text-align: center; padding: 4rem; color: var(--color-text-muted); background: var(--color-bg-panel); border-radius: var(--radii-lg); }

    @media (max-width: 768px) {
      .booking-grid { grid-template-columns: 1fr; }
    }
  `]
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
  
  isSubmitting = signal(false);
  today = new Date().toISOString().split('T')[0];

  // Computed: Filtered list
  filteredResources = computed(() => {
    return this.allResources().filter(r => {
      const matchCampus = this.selectedCampusId() === 0 || r.campusId === this.selectedCampusId();
      const matchCategory = this.selectedCategoryId() === 0 || r.categoryId === this.selectedCategoryId();
      return matchCampus && matchCategory && r.isActive;
    });
  });

  // Booking Form
  bookingForm = new FormGroup({
    date: new FormControl(this.today, { nonNullable: true, validators: [Validators.required] }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('')
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
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
    }
  }

  onCampusChange(event: Event) {
    this.selectedCampusId.set(Number((event.target as HTMLSelectElement).value));
  }

  onCategoryChange(event: Event) {
    this.selectedCategoryId.set(Number((event.target as HTMLSelectElement).value));
  }

  selectResource(res: ResourceResponseDto) {
    this.selectedResource.set(res);
    this.bookingForm.patchValue({
      date: this.today,
      startTime: '08:00',
      endTime: '17:00'
    });
  }

  submitBooking() {
    if (this.bookingForm.invalid || !this.selectedResource()) return;

    this.isSubmitting.set(true);
    const form = this.bookingForm.getRawValue();
    const res = this.selectedResource()!;

    const dto: CreateResourceBookingDto = {
      resourceId: res.id,
      startTime: new Date(`${form.date}T${form.startTime}`).toISOString(),
      endTime: new Date(`${form.date}T${form.endTime}`).toISOString(),
      notes: form.notes || ''
    };

    this.resourceService.createBooking(dto).subscribe({
      next: () => {
        this.toastService.showSuccess(`Bokning av ${res.name} klar!`);
        this.selectedResource.set(null);
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.toastService.showError('Resursen är redan bokad under denna tid.');
        } else {
          this.toastService.showError('Kunde inte genomföra bokningen.');
        }
      }
    });
  }
}