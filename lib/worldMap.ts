import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-50m.json';

export type CountryProps = { name: string };
export type CountryFeature = Feature<Geometry, CountryProps>;

type WorldObjects = { countries: GeometryCollection<CountryProps> };

const topology = world as unknown as Topology<WorldObjects>;

export const WORLD_COUNTRIES = feature(
  topology,
  topology.objects.countries
) as FeatureCollection<Geometry, CountryProps>;

export const COUNTRY_NAMES = WORLD_COUNTRIES.features
  .map((item) => item.properties?.name)
  .filter((name): name is string => Boolean(name) && name !== 'Antarctica')
  .sort((a, b) => a.localeCompare(b));

export const WORLD_LAND = {
  type: 'FeatureCollection',
  features: WORLD_COUNTRIES.features.filter((item) => item.properties?.name !== 'Antarctica'),
} as FeatureCollection<Geometry, CountryProps>;

export function countryFeature(name: string): CountryFeature | undefined {
  return WORLD_COUNTRIES.features.find((item) => item.properties?.name === name);
}
