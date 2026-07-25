import { AfterViewInit, Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import QRCode from 'qrcode';

// Thin wrapper around the `qrcode` package — renders `value` as a scannable
// QR code onto a canvas. Used to show the delivery OTP as a QR code the
// delivery partner can scan instead of the customer reading it aloud.
@Component({
  selector: 'app-qr-code',
  standalone: true,
  template: `<canvas #canvas [width]="size" [height]="size"></canvas>`,
})
export class QrCodeComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) value!: string;
  @Input() size = 180;

  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    this.render();
  }

  ngOnChanges() {
    this.render();
  }

  private render() {
    if (!this.canvasRef || !this.value) return;
    QRCode.toCanvas(this.canvasRef.nativeElement, this.value, { width: this.size, margin: 1 }).catch(() => {});
  }
}
