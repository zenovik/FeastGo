import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { isPdfDataUrl, readImageFileAsDataUrl, validateImageFile } from '../../utils/image-file';
import { IconComponent } from '../icon/icon.component';

export type ImageUploadShape = 'circle' | 'square' | 'banner';

// Single reusable upload widget behind every image field in the app (avatar,
// restaurant logo/cover, menu item, category, banner, delivery docs). Owns:
// instant preview, drag-and-drop, format/size validation, and rendering a
// spinner + real upload-progress bar the parent drives via [uploading]/
// [progress] (the parent still owns the actual HTTP call and when to make
// it, since save timing differs — some sites save immediately, most queue
// into a form's Save button).
//
// Preview semantics: the instant a valid file is picked, it's shown via an
// internal `pendingPreview` signal — before any network call. That preview
// is automatically dropped the moment the parent's own `[value]` genuinely
// changes (i.e. after a successful save re-set it), falling back to the
// authoritative saved value. If a save FAILS, the parent calls
// `discardPending()` (via a template ref) to revert to the last-saved image
// instead of leaving the failed pick on screen.
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div>
      <div
        class="group relative cursor-pointer overflow-hidden border border-dashed border-ink-300 bg-ink-50 text-ink-400 transition hover:border-ember-400 dark:border-ink-600 dark:bg-ink-800"
        [class.rounded-full]="shape === 'circle'"
        [class.rounded-xl]="shape !== 'circle'"
        [class.h-14]="shape === 'circle' && size === 'sm'"
        [class.w-14]="shape === 'circle' && size === 'sm'"
        [class.h-20]="shape === 'circle' && size === 'md'"
        [class.w-20]="shape === 'circle' && size === 'md'"
        [class.h-28]="shape === 'circle' && size === 'lg'"
        [class.w-28]="shape === 'circle' && size === 'lg'"
        [class.h-16]="shape === 'square' && size === 'sm'"
        [class.w-16]="shape === 'square' && size === 'sm'"
        [class.h-24]="shape === 'square' && size === 'md'"
        [class.w-24]="shape === 'square' && size === 'md'"
        [class.h-32]="shape === 'square' && size === 'lg'"
        [class.w-32]="shape === 'square' && size === 'lg'"
        [class.h-36]="shape === 'banner'"
        [class.w-full]="shape === 'banner'"
        [class.border-ember-400]="dragOver()"
        [class.bg-ember-50]="dragOver()"
        [class.pointer-events-none]="disabled || uploading"
        [class.opacity-70]="disabled"
        (click)="fileInput.click()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
      >
        @if (displaySrc() && isPdf()) {
          <div class="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-ember-500">
            <app-icon name="receipt" [size]="shape === 'banner' ? 22 : 16" />
            <span class="text-[11px] font-semibold">PDF attached</span>
          </div>
        } @else if (displaySrc()) {
          <img [src]="displaySrc()" alt="" class="h-full w-full object-cover" />
        } @else {
          <div class="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
            <app-icon name="camera" [size]="shape === 'banner' ? 22 : 16" />
            @if (shape === 'banner') {
              <span class="text-xs font-semibold">{{ label }}</span>
            }
          </div>
        }

        @if (!uploading) {
          <div class="absolute inset-0 flex items-center justify-center bg-ink-900/0 opacity-0 transition group-hover:bg-ink-900/40 group-hover:opacity-100">
            <app-icon name="camera" [size]="18" class="text-white" />
          </div>
        }

        @if (uploading) {
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink-900/60">
            <app-icon name="clock" [size]="18" class="animate-spin text-white" />
            @if (progress != null) {
              <span class="text-[11px] font-bold text-white">{{ progress }}%</span>
            }
          </div>
        }

        @if (uploading && progress != null) {
          <div class="absolute bottom-0 left-0 h-1 w-full bg-white/20">
            <div class="h-full bg-ember-500 transition-all" [style.width.%]="progress"></div>
          </div>
        }
      </div>

      @if (shape !== 'banner' && label) {
        <p class="mt-1 text-center text-[11px] text-ink-400">{{ label }}</p>
      }

      <input
        #fileInput
        type="file"
        [attr.accept]="acceptAttr()"
        [multiple]="multiple"
        class="hidden"
        (change)="onFileInputChange($event)"
      />
    </div>
  `,
})
export class ImageUploadComponent {
  @Input() shape: ImageUploadShape = 'square';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() maxBytes = 2_000_000;
  @Input() multiple = false;
  @Input() uploading = false;
  @Input() progress: number | null = null;
  @Input() disabled = false;
  @Input() label = 'Change image';
  @Input() allowPdf = false;

  @Input()
  set value(v: string | null) {
    this._value = v;
    // Authoritative data changed (e.g. a successful save re-set it) — drop
    // any locally-picked-but-unconfirmed preview so we display fresh truth.
    this.pendingPreview.set(null);
  }
  get value(): string | null {
    return this._value;
  }
  private _value: string | null = null;

  @Output() picked = new EventEmitter<{ dataUrl: string; file: File }>();
  @Output() invalidFile = new EventEmitter<string>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private pendingPreview = signal<string | null>(null);
  dragOver = signal(false);

  displaySrc(): string | null {
    return this.pendingPreview() ?? this.value;
  }

  isPdf(): boolean {
    return isPdfDataUrl(this.displaySrc());
  }

  acceptAttr(): string {
    return this.allowPdf ? 'image/jpeg,image/jpg,image/png,application/pdf' : 'image/jpeg,image/jpg,image/png,image/webp';
  }

  discardPending() {
    this.pendingPreview.set(null);
  }

  onFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.handleFiles(input.files);
    input.value = ''; // allow re-picking the exact same file again later
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    if (this.disabled || this.uploading) return;
    this.dragOver.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    if (this.disabled || this.uploading) return;
    this.handleFiles(e.dataTransfer?.files ?? null);
  }

  private handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = this.multiple ? Array.from(fileList) : [fileList[0]];
    for (const file of files) {
      const error = validateImageFile(file, this.maxBytes, this.allowPdf);
      if (error) {
        this.invalidFile.emit(error);
        continue;
      }
      readImageFileAsDataUrl(file).then((dataUrl) => {
        if (!this.multiple) this.pendingPreview.set(dataUrl);
        this.picked.emit({ dataUrl, file });
      });
    }
  }
}
