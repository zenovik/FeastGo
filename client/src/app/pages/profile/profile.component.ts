import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Address, Gender, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="container-shell max-w-xl py-10">
      <h1 class="font-display text-2xl font-bold text-ink-900">Your profile</h1>

      @if (auth.currentUser(); as u) {
        <div class="card-surface mt-6 flex items-start gap-4 p-5">
          <div class="relative shrink-0">
            @if ((editingProfile() ? editPhoto : u.photo); as photoSrc) {
              <img [src]="photoSrc" class="h-14 w-14 rounded-full object-cover" alt="Profile photo" />
            } @else {
              <span class="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-lg font-bold text-white">
                {{ initials(u.name) }}
              </span>
            }
            @if (editingProfile()) {
              <label class="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink-900 text-white">
                <app-icon name="camera" [size]="12" />
                <input type="file" accept="image/*" class="hidden" (change)="onPhotoSelected($event)" />
              </label>
            }
          </div>
          <div class="flex-1">
            @if (!editingProfile()) {
              <p class="font-display text-lg font-bold text-ink-900">{{ u.name }}</p>
              <p class="text-sm text-ink-400">{{ u.phone }}</p>
              @if (u.email) {
                <p class="text-sm text-ink-400">{{ u.email }}</p>
              }
              @if (u.gender) {
                <p class="text-sm capitalize text-ink-400">{{ u.gender }}</p>
              }
            } @else {
              <form class="space-y-2" (submit)="saveProfile($event)">
                <input [(ngModel)]="editName" name="editName" placeholder="Name" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
                <input [(ngModel)]="editEmail" name="editEmail" type="email" placeholder="Email" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
                <select [(ngModel)]="editGender" name="editGender" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400">
                  <option value="">Gender (optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <div class="flex gap-2">
                  <button type="submit" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Save</button>
                  <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-500" (click)="cancelEditProfile()">Cancel</button>
                </div>
              </form>
            }
          </div>
          @if (!editingProfile()) {
            <button type="button" class="text-ink-300 hover:text-ember-600" (click)="startEditProfile(u)">
              <app-icon name="edit" [size]="16" />
            </button>
          }
        </div>

        <div class="mt-6 flex items-center justify-between">
          <h2 class="font-display text-base font-bold text-ink-900">Saved addresses</h2>
          <button type="button" class="text-sm font-semibold text-ember-600" (click)="showForm.set(!showForm())">
            {{ showForm() ? 'Cancel' : '+ Add address' }}
          </button>
        </div>

        <div class="mt-3 space-y-2">
          @for (addr of u.addresses; track addr._id) {
            <div class="card-surface flex items-start justify-between gap-3 p-3.5">
              <div>
                <p class="text-sm font-semibold text-ink-800">{{ addr.label }} @if (addr.isDefault) { <span class="ml-1 rounded bg-basil-100 px-1.5 py-0.5 text-[10px] font-bold text-basil-600">DEFAULT</span> }</p>
                <p class="text-sm text-ink-500">{{ addr.line1 }}, {{ addr.area }}, {{ addr.city }}</p>
              </div>
              <button type="button" class="text-ink-300 hover:text-ember-600" (click)="removeAddress(addr._id)">
                <app-icon name="trash" [size]="16" />
              </button>
            </div>
          } @empty {
            <p class="text-sm text-ink-400">No saved addresses yet.</p>
          }
        </div>

        @if (showForm()) {
          <form class="card-surface mt-3 space-y-2 p-4" (submit)="addAddress($event)">
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="newAddress.label" name="label" placeholder="Label (Home, Work)" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
              <input [(ngModel)]="newAddress.city" name="city" placeholder="City" required class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            </div>
            <input [(ngModel)]="newAddress.line1" name="line1" placeholder="Street address" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <input [(ngModel)]="newAddress.area" name="area" placeholder="Area / neighborhood" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400" />
            <button type="submit" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Save address</button>
          </form>
        }

        <button
          type="button"
          class="mt-8 flex items-center gap-2 text-sm font-semibold text-ember-600 hover:text-ember-700"
          (click)="logout()"
        >
          <app-icon name="log-out" [size]="16" /> Sign out
        </button>
      }
    </div>
  `,
})
export class ProfileComponent {
  showForm = signal(false);
  newAddress: Partial<Address> = { label: 'Home', line1: '', area: '', city: '' };

  editingProfile = signal(false);
  editName = '';
  editEmail = '';
  editGender: Gender | '' = '';
  editPhoto: string | null = null;

  constructor(
    public auth: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  initials(name: string): string {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  startEditProfile(u: User) {
    this.editName = u.name;
    this.editEmail = u.email ?? '';
    this.editGender = u.gender ?? '';
    this.editPhoto = u.photo;
    this.editingProfile.set(true);
  }

  cancelEditProfile() {
    this.editingProfile.set(false);
  }

  onPhotoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      this.toast.error('Photo must be under 2MB');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => (this.editPhoto = reader.result as string);
    reader.readAsDataURL(file);
  }

  async saveProfile(e: Event) {
    e.preventDefault();
    if (!this.editName.trim()) return;
    await this.auth.updateProfile({
      name: this.editName.trim(),
      email: this.editEmail.trim() || null,
      gender: this.editGender || null,
      photo: this.editPhoto,
    });
    this.editingProfile.set(false);
    this.toast.success('Profile updated');
  }

  async addAddress(e: Event) {
    e.preventDefault();
    if (!this.newAddress.line1 || !this.newAddress.city) return;
    await this.auth.addAddress(this.newAddress as Address);
    this.newAddress = { label: 'Home', line1: '', area: '', city: '' };
    this.showForm.set(false);
    this.toast.success('Address added');
  }

  async removeAddress(id?: string) {
    if (!id) return;
    await this.auth.removeAddress(id);
    this.toast.success('Address removed');
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
