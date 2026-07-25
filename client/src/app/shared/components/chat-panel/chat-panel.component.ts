import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageRole, OrderMessage } from '../../../core/models/message.model';
import { IconComponent } from '../icon/icon.component';

// Minimal shared chat widget reused for both order-scoped threads
// (customer<->delivery, seller<->delivery). Purely presentational — the
// parent owns fetching history, sending, and the real-time socket
// subscription, since each role talks to a different backend service.
@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="flex h-96 w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-pop)] dark:border-ink-700 dark:bg-ink-800">
      <div class="flex items-center justify-between border-b border-ink-100 p-3 dark:border-ink-700">
        <p class="text-sm font-bold text-ink-900 dark:text-white">{{ title }}</p>
        <button type="button" class="rounded-lg p-1 text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-700" (click)="closed.emit()" aria-label="Close chat">
          <app-icon name="x" [size]="16" />
        </button>
      </div>

      <div #scrollArea class="flex-1 space-y-2 overflow-y-auto p-3">
        @for (m of messages; track m._id) {
          <div class="flex" [class.justify-end]="m.senderRole === myRole">
            <div>
              <div
                class="max-w-[220px] rounded-2xl px-3 py-2 text-sm"
                [class.rounded-br-sm]="m.senderRole === myRole"
                [class.rounded-bl-sm]="m.senderRole !== myRole"
                [class]="m.senderRole === myRole ? 'bg-ember-500 text-white' : 'bg-ink-100 text-ink-800 dark:bg-ink-700 dark:text-ink-100'"
              >
                {{ m.text }}
              </div>
              <p class="mt-0.5 text-[10px] text-ink-400" [class.text-right]="m.senderRole === myRole">{{ m.senderName }}</p>
            </div>
          </div>
        } @empty {
          <p class="mt-8 text-center text-xs text-ink-400">No messages yet — say hello.</p>
        }
      </div>

      <form class="flex gap-2 border-t border-ink-100 p-2 dark:border-ink-700" (submit)="onSubmit($event)">
        <input
          [(ngModel)]="draft"
          name="draft"
          placeholder="Type a message…"
          maxlength="1000"
          class="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ember-400 dark:border-ink-600 dark:bg-ink-900 dark:text-white"
        />
        <button type="submit" [disabled]="!draft.trim()" class="rounded-lg bg-ember-500 px-3 py-2 text-white disabled:opacity-50" aria-label="Send">
          <app-icon name="send" [size]="16" />
        </button>
      </form>
    </div>
  `,
})
export class ChatPanelComponent implements AfterViewChecked {
  @Input() title = 'Chat';
  @Input() messages: OrderMessage[] = [];
  @Input() myRole: MessageRole = 'customer';
  @Output() sendMessage = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;
  private lastCount = 0;

  draft = '';

  ngAfterViewChecked() {
    if (this.messages.length !== this.lastCount && this.scrollArea) {
      this.lastCount = this.messages.length;
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
    }
  }

  onSubmit(e: Event) {
    e.preventDefault();
    if (!this.draft.trim()) return;
    this.sendMessage.emit(this.draft.trim());
    this.draft = '';
  }
}
