import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

// Custom divIcon markers (no image assets) — sidesteps the classic Leaflet
// "marker icon paths break under bundlers" problem entirely.
function dotIcon(emoji: string, bg: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${bg};box-shadow:0 1px 4px rgba(0,0,0,.35);font-size:15px;">${emoji}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

@Component({
  selector: 'app-delivery-route-map',
  standalone: true,
  template: `<div #mapEl class="h-full w-full"></div>`,
})
export class DeliveryRouteMapComponent implements OnChanges, OnDestroy {
  @Input() partner: MapPoint | null = null;
  @Input() destination: MapPoint | null = null;

  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private partnerMarker?: L.Marker;
  private destinationMarker?: L.Marker;
  private routeLine?: L.Polyline;

  ngOnChanges(changes: SimpleChanges) {
    if (!this.map && this.mapEl) this.init();
    if (changes['partner'] || changes['destination']) this.render();
  }

  private init() {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
  }

  private render() {
    if (!this.map) return;

    if (this.partnerMarker) {
      this.map.removeLayer(this.partnerMarker);
      this.partnerMarker = undefined;
    }
    if (this.destinationMarker) {
      this.map.removeLayer(this.destinationMarker);
      this.destinationMarker = undefined;
    }
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = undefined;
    }

    const points: L.LatLngExpression[] = [];

    if (this.partner) {
      this.partnerMarker = L.marker([this.partner.lat, this.partner.lng], { icon: dotIcon('🏍️', '#1e3a8a') })
        .addTo(this.map)
        .bindTooltip(this.partner.label);
      points.push([this.partner.lat, this.partner.lng]);
    }

    if (this.destination) {
      this.destinationMarker = L.marker([this.destination.lat, this.destination.lng], { icon: dotIcon('📍', '#dc2626') })
        .addTo(this.map)
        .bindTooltip(this.destination.label);
      points.push([this.destination.lat, this.destination.lng]);
    }

    if (this.partner && this.destination) {
      this.routeLine = L.polyline(
        [
          [this.partner.lat, this.partner.lng],
          [this.destination.lat, this.destination.lng],
        ],
        { color: '#f97316', weight: 3, dashArray: '6 6' }
      ).addTo(this.map);
    }

    if (points.length === 2) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    } else if (points.length === 1) {
      this.map.setView(points[0], 14);
    } else {
      this.map.setView([20.5937, 78.9629], 4); // fallback: India-wide view when no coordinates are known yet
    }

    // The map container's size is only known after the tab/section it lives
    // in becomes visible — re-measure so tiles don't render into a 0-height box.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
