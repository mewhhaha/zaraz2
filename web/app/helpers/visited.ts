export type VisitedHeaders = {
  city?: string | undefined;
  country?: string | undefined;
  continent?: string | undefined;
  longitude?: string | undefined;
  latitude?: string | undefined;
  region?: string | undefined;
  regionCode?: string | undefined;
  metroCode?: string | undefined;
  postalCode?: string | undefined;
  timezone?: string | undefined;
};

const headerMap: Record<keyof VisitedHeaders, string> = {
  city: "cf-ipcity",
  country: "cf-ipcountry",
  continent: "cf-ipcontinent",
  longitude: "cf-iplongitude",
  latitude: "cf-iplatitude",
  region: "cf-region",
  regionCode: "cf-region-code",
  metroCode: "cf-metro-code",
  postalCode: "cf-postal-code",
  timezone: "cf-timezone",
};

export const extractVisitedHeaders = (headers: Headers): VisitedHeaders => {
  const result: VisitedHeaders = {};

  const entries = Object.entries(headerMap) as [
    keyof VisitedHeaders,
    string,
  ][];

  for (const [key, headerName] of entries) {
    result[key] = headers.get(headerName) ?? undefined;
  }

  return result;
};
