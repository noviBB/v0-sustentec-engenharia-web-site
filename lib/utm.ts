import proj4 from 'proj4';

/**
 * UTM (Universal Transverse Mercator) → WGS84 (lat/lng) converter.
 *
 * Notion ingest pipelines may eventually deliver coordinates in UTM (commonly
 * the case with surveys in Brazil — e.g. SIRGAS 2000 / UTM zone 23S for São
 * Paulo). This helper normalizes them to WGS84 so the rest of the app deals
 * only in lat/lng.
 *
 * EPSG conventions:
 *   - Northern hemisphere: `EPSG:32600 + zone` (e.g. zone 18N → 32618)
 *   - Southern hemisphere: `EPSG:32700 + zone` (e.g. zone 23S → 32723)
 *   - WGS84 geographic:    `EPSG:4326`
 *
 * `proj4` registers EPSG:4326 by default. The UTM CRS string is built inline
 * with `+proj=utm` so callers don't have to pre-register definitions.
 *
 * usage: utmToLatLng(23, 'S', 350000, 7400000) // → { lat: -23.5, lng: -46.6 }
 */
export function utmToLatLng(
  zone: number,
  hemisphere: 'N' | 'S',
  easting: number,
  northing: number,
): { lat: number; lng: number } {
  if (!Number.isFinite(zone) || zone < 1 || zone > 60) {
    throw new Error(`utmToLatLng: invalid UTM zone ${zone} (must be 1-60)`);
  }

  const utmProj =
    hemisphere === 'S'
      ? `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`
      : `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;

  const [lng, lat] = proj4(utmProj, 'EPSG:4326', [easting, northing]);
  return { lat, lng };
}
