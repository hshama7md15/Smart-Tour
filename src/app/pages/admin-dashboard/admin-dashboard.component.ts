import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PlacesService } from '../../services/places.service';
import { AuthService } from '../../services/auth.service';
import { Place } from '../../models/place.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  places: Place[] = [];
  placeForm!: FormGroup;
  loading = false;
  showForm = false;
  editingId: number | null = null;
  errorMessage = '';
  successMessage = '';

  categories = ['Historical', 'Natural', 'Cultural', 'Religious', 'Architecture', 'Museum'];

  constructor(
    private placeService: PlacesService,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'Admin') {
      this.router.navigate(['/places']);
      return;
    }

    this.initializeForm();
    this.loadPlaces();
  }

  initializeForm(): void {
    this.placeForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      historicalInfo: ['', [Validators.required, Validators.minLength(10)]],
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)]],
      category: ['', Validators.required],
      latitude: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitude: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      rating: ['', [Validators.required, Validators.min(0), Validators.max(5)]],
      visitorsPerYear: ['', [Validators.required, Validators.min(0)]]
    });
  }

  loadPlaces(): void {
    this.loading = true;
    this.placeService.getAllPlaces().subscribe({
      next: (data) => {
        this.places = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load places.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  openForm(place?: Place): void {
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (place) {
      this.editingId = place.id;
      this.placeForm.patchValue(place);
    } else {
      this.editingId = null;
      this.placeForm.reset();
    }
  }

  closeForm(): void {
    this.showForm = false;
    this.placeForm.reset();
    this.editingId = null;
  }

  onSubmit(): void {
    if (this.placeForm.invalid) {
      return;
    }

    const formData = this.placeForm.value;

    if (this.editingId) {
      this.placeService.updatePlace(this.editingId, formData).subscribe({
        next: () => {
          this.successMessage = 'Place updated successfully!';
          this.closeForm();
          this.loadPlaces();
        },
        error: (err) => {
          this.errorMessage = 'Failed to update place.';
          console.error(err);
        }
      });
    } else {
      this.placeService.createPlace(formData).subscribe({
        next: () => {
          this.successMessage = 'Place created successfully!';
          this.closeForm();
          this.loadPlaces();
        },
        error: (err) => {
          this.errorMessage = 'Failed to create place.';
          console.error(err);
        }
      });
    }
  }

  deletePlace(id: number): void {
    if (confirm('Are you sure you want to delete this place?')) {
      this.placeService.deletePlace(id).subscribe({
        next: () => {
          this.successMessage = 'Place deleted successfully!';
          this.loadPlaces();
        },
        error: (err) => {
          this.errorMessage = 'Failed to delete place.';
          console.error(err);
        }
      });
    }
  }
}
