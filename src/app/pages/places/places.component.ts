import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { GovernorateService } from '../../services/governorate.service';
import { Governorate } from '../../models/governorate.model';

type SortOption = 'name-asc' | 'name-desc';

const FALLBACK_IMG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"%3E%3Crect fill="%23e0e0e0" width="200" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';

@Component({
  selector: 'app-places',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './places.component.html',
  styleUrls: ['./places.component.css']
})
export class PlacesComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  governorates: Governorate[] = [];
  filteredGovernorates: Governorate[] = [];
  loading = true;
  errorMessage = '';

  searchTerm = '';
  sortOption: SortOption = 'name-asc';

  constructor(
    private governorateService: GovernorateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadGovernorates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchInput$
      .pipe(debounceTime(280), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  loadGovernorates(): void {
    this.loading = true;
    this.governorateService.getAllGovernorates().subscribe({
      next: (data) => {
        this.governorates = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'فشل تحميل المحافظات. يرجى المحاولة لاحقاً.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchInput$.next(term);
  }

  onSortChange(option: SortOption): void {
    this.sortOption = option;
    this.applyFilters();
  }

  goToGovernorate(gov: Governorate): void {
    this.router.navigate(['/governorate', gov.nameEn]);
  }

  trackByGovernorateId(_: number, gov: Governorate): number {
    return gov.id;
  }

  onImageError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el?.src && el.src !== FALLBACK_IMG) el.src = FALLBACK_IMG;
  }

  private applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    let result = this.governorates.filter((gov) => {
      if (!term) return true;
      const matchAr = gov.nameAr.includes(term) || gov.nameAr.toLowerCase().includes(term);
      const matchEn = gov.nameEn.toLowerCase().includes(term);
      const matchDesc = gov.description.toLowerCase().includes(term);
      return matchAr || matchEn || matchDesc;
    });

    result = [...result].sort((a, b) => {
      const cmp = a.nameEn.localeCompare(b.nameEn);
      return this.sortOption === 'name-desc' ? -cmp : cmp;
    });

    this.filteredGovernorates = result;
  }
}
