'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { geoEqualEarth, geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { CreditCard, Globe2, GraduationCap, MapPin, Users, X } from 'lucide-react';
import { AFGHANISTAN_CITIES, type CityKey } from '@/lib/cities';
import { COUNTRY_NAMES, WORLD_LAND, countryFeature } from '@/lib/worldMap';
import { Dropdown } from '@/components/ports';
import { cn } from '@/lib/utils';

export type CityStats = {
  name: string;
  students: number;
  enrollments: number;
  payments: number;
  revenue: number;
  pending: number;
  completed: number;
};

type CityMapProps = {
  locations: CityStats[];
  selected?: string;
  onSelect: (city: string | '') => void;
};

const MAP_W = 800;
const MAP_H = 500;

function emptyTotals(): Omit<CityStats, 'name'> {
  return { students: 0, enrollments: 0, payments: 0, revenue: 0, pending: 0, completed: 0 };
}

export default function CityMap({ locations, selected, onSelect }: CityMapProps) {
  const [country, setCountry] = useState('Afghanistan');
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<CityKey | null>(null);

  const countryOptions = useMemo(
    () => [
      { value: '', label: 'World' },
      ...COUNTRY_NAMES.map((name) => ({ value: name, label: name })),
    ],
    []
  );
  const byName = useMemo(() => new Map(locations.map((row) => [row.name, row])), [locations]);
  const maxStudents = Math.max(1, ...locations.map((row) => row.students));
  const countryGeo = country ? countryFeature(country) : undefined;
  const features = countryGeo ? [countryGeo] : WORLD_LAND.features;

  const projection = useMemo(() => {
    const pad = country ? 28 : 16;
    if (countryGeo) {
      return geoMercator().fitExtent(
        [
          [pad, pad],
          [MAP_W - pad, MAP_H - pad],
        ],
        countryGeo
      );
    }
    return geoEqualEarth().fitExtent(
      [
        [pad, pad],
        [MAP_W - pad, MAP_H - pad],
      ],
      WORLD_LAND
    );
  }, [country, countryGeo]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const isAfghanistan = country === 'Afghanistan';
  const activeCityName = (hoveredCity || (isAfghanistan ? selected : '') || '') as CityKey | '';
  const activeCity = activeCityName ? byName.get(activeCityName) : undefined;
  const selectedCity = isAfghanistan && selected ? byName.get(selected) : undefined;
  const countryTotals = useMemo(() => {
    if (!isAfghanistan) return emptyTotals();
    return locations.reduce(
      (sum, row) => ({
        students: sum.students + row.students,
        enrollments: sum.enrollments + row.enrollments,
        payments: sum.payments + row.payments,
        revenue: sum.revenue + row.revenue,
        pending: sum.pending + row.pending,
        completed: sum.completed + row.completed,
      }),
      emptyTotals()
    );
  }, [isAfghanistan, locations]);

  const detail = selectedCity || activeCity;
  const hoverCountryName = hoveredCountry && hoveredCountry !== country ? hoveredCountry : null;

  return (
    <article className="city-map-card panel">
      <div className="card-heading">
        <div>
          <h2>City coverage</h2>
          <p>Choose a country to inspect its map, then click a city marker when records exist</p>
        </div>
        <div className="city-map-actions">
          <Dropdown
            label="Country"
            value={country}
            onChange={(next) => {
              setCountry(next);
              setHoveredCountry(null);
              if (next !== 'Afghanistan') onSelect('');
            }}
            options={countryOptions}
            placeholder="World"
            filterPlaceholder="Search country"
            filter
            clearable
            className="city-country-picker"
          />
          {country && (
            <button type="button" className="city-clear" onClick={() => setCountry('')}>
              <Globe2 size={14} />
              World map
            </button>
          )}
          {selected && (
            <button type="button" className="city-clear" onClick={() => onSelect('')}>
              <X size={14} />
              All cities
            </button>
          )}
        </div>
      </div>

      <div className="city-map-layout">
        <div className={cn('city-map-stage', country && 'is-country')}>
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="city-map-svg"
            role="img"
            aria-label={country ? `${country} map` : 'World map'}
          >
            <defs>
              <linearGradient id="countryFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2" />
              </linearGradient>
              <filter id="cityGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path d={path({ type: 'Sphere' } as GeoPermissibleObjects) || undefined} className="city-map-ocean" />
            {features.map((geo) => {
              const name = geo.properties?.name || 'Unknown';
              const d = path(geo);
              if (!d) return null;
              const active = country ? true : hoveredCountry === name || name === 'Afghanistan';
              return (
                <path
                  key={name}
                  d={d}
                  className={cn('city-country-path', active && 'is-active')}
                  fill={country ? 'url(#countryFill)' : undefined}
                  onMouseEnter={() => setHoveredCountry(name)}
                  onMouseLeave={() => setHoveredCountry((current) => (current === name ? null : current))}
                  onClick={() => setCountry(name)}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCountry(name);
                    }
                  }}
                >
                  <title>{name}</title>
                </path>
              );
            })}
            {isAfghanistan &&
              AFGHANISTAN_CITIES.map((city) => {
                const point = projection([city.lng, city.lat]);
                if (!point) return null;
                const [x, y] = point;
                const stats = byName.get(city.name);
                const students = stats?.students ?? 0;
                const r = 5 + (students / maxStudents) * 8;
                const isSelected = selected === city.name;
                const isHovered = hoveredCity === city.name;
                return (
                  <g
                    key={city.name}
                    className="city-marker"
                    transform={`translate(${x} ${y})`}
                    onMouseEnter={() => setHoveredCity(city.name)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(isSelected ? '' : city.name);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(isSelected ? '' : city.name);
                      }
                    }}
                    aria-label={`${city.name}: ${students} students`}
                  >
                    {(isSelected || isHovered) && <circle r={r + 10} className="city-pulse" />}
                    <circle
                      r={r}
                      className={cn('city-dot', isSelected && 'is-selected', isHovered && 'is-hovered')}
                      filter="url(#cityGlow)"
                    />
                    <text y={r + 13} textAnchor="middle" className="city-label">
                      {city.name}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        <aside className="city-detail" aria-live="polite">
          <AnimatePresence mode="wait">
            {detail ? (
              <motion.div
                key={detail.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <div className="city-detail-head">
                  <MapPin size={16} />
                  <div>
                    <strong>{detail.name}</strong>
                    <p>
                      {AFGHANISTAN_CITIES.find((city) => city.name === detail.name)?.province} province · Afghanistan
                    </p>
                  </div>
                </div>
                <CountryMetrics stats={detail} />
                <p className="city-hint">
                  {selected
                    ? 'Dashboard cards and charts now show this city only. Clear the filter to return nationwide.'
                    : 'Click the marker to lock this city as a dashboard filter.'}
                </p>
              </motion.div>
            ) : country ? (
              <motion.div
                key={country}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <div className="city-detail-head">
                  <Globe2 size={16} />
                  <div>
                    <strong>{country}</strong>
                    <p>{isAfghanistan ? 'Institute records for this country' : 'Country map from world atlas'}</p>
                  </div>
                </div>
                <CountryMetrics stats={countryTotals} />
                <p className="city-hint">
                  {isAfghanistan
                    ? 'Click a city marker to filter the dashboard to that city.'
                    : 'No local institute city records are mapped for this country yet.'}
                </p>
              </motion.div>
            ) : hoverCountryName ? (
              <motion.div
                key={hoverCountryName}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <div className="city-detail-head">
                  <Globe2 size={16} />
                  <div>
                    <strong>{hoverCountryName}</strong>
                    <p>Click the country or choose it from the dropdown</p>
                  </div>
                </div>
                <p className="city-hint">The map will zoom to this country’s outline.</p>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="city-empty">
                <Globe2 size={22} />
                <p>Select a country from the dropdown, or click it on the world map.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </article>
  );
}

function CountryMetrics({ stats }: { stats: Omit<CityStats, 'name'> }) {
  return (
    <div className="city-metrics">
      <div>
        <Users size={14} />
        <span>Students</span>
        <b>{stats.students}</b>
      </div>
      <div>
        <GraduationCap size={14} />
        <span>Enrollments</span>
        <b>{stats.enrollments}</b>
      </div>
      <div>
        <CreditCard size={14} />
        <span>Payments</span>
        <b>{stats.payments}</b>
      </div>
      <div>
        <CreditCard size={14} />
        <span>Revenue</span>
        <b>${Number(stats.revenue || 0).toLocaleString()}</b>
      </div>
    </div>
  );
}
