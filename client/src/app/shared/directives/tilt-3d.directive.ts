import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

// Mouse-driven perspective tilt for image cards — no 3D assets required, just a
// CSS transform derived from cursor position relative to the element bounds.
@Directive({
  selector: '[appTilt3d]',
  standalone: true,
})
export class Tilt3dDirective {
  @Input() tiltMax = 10;
  @Input() tiltScale = 1.04;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {
    const host = this.el.nativeElement;
    this.renderer.setStyle(host, 'transition', 'transform 150ms ease-out');
    this.renderer.setStyle(host, 'will-change', 'transform');
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 2 * this.tiltMax;
    const rotateX = (0.5 - y) * 2 * this.tiltMax;
    this.renderer.setStyle(
      host,
      'transform',
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${this.tiltScale}, ${this.tiltScale}, ${this.tiltScale})`
    );
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.renderer.setStyle(
      this.el.nativeElement,
      'transform',
      'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    );
  }
}
