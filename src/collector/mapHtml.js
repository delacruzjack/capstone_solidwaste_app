// The collector map page (Leaflet + street tiles), shown in a WebView. Same look as the website's map:
// only Barangay Poblacion is visible, zone areas are dashed (provisional), truck stops are coloured by
// today's state. The app talks to it with injectJavaScript (setMe) and receives { open: url } messages.
import boundary from './poblacionBoundary.json';
import { TRUCK_TOP_SVG } from './truckSvg';

const esc = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

export function mapHtml({ zones, stops }) {
  const pob = boundary.features.find((f) => f.properties.kind === 'barangay_boundary');
  const ext = boundary.features.find((f) => f.properties.kind === 'display_extent') || pob;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: #f3f5f2; font-family: -apple-system, Roboto, "Segoe UI", sans-serif; }
  .zone-label { background: none; border: 0; box-shadow: none; font-weight: 700; font-size: 12px; color: #14231d; }
  .zone-label:before { display: none; }
  .stop { width: 30px; height: 30px; border-radius: 50%; border: 3px solid #fff; display: grid; place-items: center;
          box-shadow: 0 2px 6px rgba(0,0,0,.35); color: #fff; font-size: 15px; font-weight: 800; }
  .me { position: relative; width: 48px; height: 48px; display: grid; place-items: center; }
  .me:before { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: rgba(31,107,74,.22); animation: pulse 2s ease-out infinite; }
  .me .body { position: relative; width: 26px; height: 38px; color: #1f6b4a; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); transition: transform .6s ease; }
  .me .body svg { display: block; width: 100%; height: 100%; }
  @keyframes pulse { 0% { transform: scale(.7); opacity: 1; } 100% { transform: scale(1.35); opacity: 0; } }
  .leaflet-popup-content { font-size: 14px; line-height: 1.45; margin: 12px 14px; }
  .leaflet-popup-content b { font-size: 15px; }
  .go { display: inline-block; margin-top: 8px; color: #1f6b4a; font-weight: 700; text-decoration: none; }
  #msg { position: absolute; z-index: 999; left: 8px; right: 8px; bottom: 8px; background: #fff; border-radius: 8px; padding: 8px 10px;
         font-size: 13px; color: #4b5a53; box-shadow: 0 2px 8px rgba(0,0,0,.2); display: none; }
</style></head><body><div id="map"></div><div id="msg"></div>
<script>
  var ZONES = ${esc(zones)}, STOPS = ${esc(stops)}, POB = ${esc(pob)}, EXT = ${esc(ext)};
  var COLORS = { done: '#1f8a5b', now: '#2563a8', upcoming: '#a8670e', late: '#c2412d', missed: '#c2412d', off: '#4b5a53' };
  var TRUCK = ${esc(TRUCK_TOP_SVG)};
  function post(o) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  function msg(t) { var m = document.getElementById('msg'); m.textContent = t; m.style.display = t ? 'block' : 'none'; }
  if (!window.L) { msg('The map needs an internet connection.'); }
  else {
    var map = L.map('map', { zoomControl: true, attributionControl: true, zoomSnap: 0.25 });
    var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
    var tileErrors = 0; tiles.on('tileerror', function () { if (++tileErrors === 3) msg('Street map could not load. Zones and stops are still shown.'); });
    map.createPane('outside'); map.getPane('outside').style.zIndex = 350; map.getPane('outside').style.pointerEvents = 'none';
    var ring = EXT.geometry.coordinates[0].map(function (c) { return [c[1], c[0]]; });
    L.polygon([[[-90, -360], [-90, 360], [90, 360], [90, -360]], ring], { pane: 'outside', stroke: false, fillColor: '#f3f5f2', fillOpacity: 1, interactive: false }).addTo(map);
    L.geoJSON(POB, { style: { color: '#14231d', weight: 3, fill: false, interactive: false } }).addTo(map);
    var bounds = L.latLngBounds(ring);
    map.fitBounds(bounds, { padding: [8, 8], animate: false });
    map.setMaxBounds(bounds.pad(0.35)); map.setMinZoom(map.getZoom() - 1);
    ZONES.forEach(function (z) {
      if (z.area && z.area.length > 2) L.polygon(z.area, { color: '#4b5a53', weight: 1.5, fillOpacity: 0.06, dashArray: '5 4', interactive: false })
        .bindTooltip(z.name, { permanent: true, direction: 'center', className: 'zone-label' }).addTo(map);
      if (z.path && z.path.length > 1) L.polyline(z.path, { color: '#1f6b4a', weight: 4, opacity: 0.8, interactive: false }).addTo(map);
    });
    STOPS.forEach(function (s) {
      var c = COLORS[s.state] || COLORS.off;
      var m = L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: '<div class="stop" style="background:' + c + '">' + (s.state === 'done' ? '&#10003;' : s.state === 'missed' ? '&#10005;' : '&#9873;') + '</div>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
      var esc2 = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
      m.bindPopup('<b>' + esc2(s.name) + '</b><br>' + esc2(s.when) + '<br>Serves ' + esc2(s.zones.join(', ')) +
        (s.landmark ? '<br><span style="color:#4b5a53">' + esc2(s.landmark) + '</span>' : '') +
        '<br><a class="go" href="#" data-url="' + esc2(s.url) + '">Open in Google Maps &rsaquo;</a>', { maxWidth: 260 });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-url]');
      if (a) { e.preventDefault(); post({ open: a.getAttribute('data-url') }); }
    }, true);
    var me = null;
    // heading: degrees from north (direction of travel), or null when not moving / unknown.
    window.setMe = function (lat, lng, follow, heading) {
      if (lat == null) return;
      if (!me) me = L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="me"><div class="body">' + TRUCK + '</div></div>', iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -16] }), zIndexOffset: 1000 }).addTo(map).bindPopup('You (the truck)');
      else me.setLatLng([lat, lng]);
      if (heading != null && isFinite(heading) && heading >= 0) {
        var b = me.getElement() && me.getElement().querySelector('.body');
        if (b) b.style.transform = 'rotate(' + Math.round(heading) + 'deg)';
      }
      if (follow) map.setView([lat, lng], Math.max(map.getZoom(), 17));
    };
    post({ ready: true });
  }
</script></body></html>`;
}
