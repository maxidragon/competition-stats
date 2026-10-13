export const WCA_ORIGIN = "https://www.worldcubeassociation.org";

/**
 * Major version of the WCIF spec this app is written against. The WCIF is
 * requested from `wcif/version/{major}` so that it does not change under us:
 * the plain `wcif/public` endpoint serves the `stable` lifecycle (still v1.1)
 * and `wcif/latest` will move on to v3. Unauthenticated requests get the public
 * scope. See https://github.com/thewca/wcif/blob/latest/versioning-policy.md
 */
export const WCIF_MAJOR_VERSION = 2;

export const wcaApiRequest = async (path: string) => {
  const response = await fetch(`${WCA_ORIGIN}/api/v0/${path}`);
  if (!response.ok) {
    throw new Error(`WCA API request failed: ${response.status} ${path}`);
  }
  return response.json();
};
