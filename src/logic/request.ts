export const WCA_ORIGIN = "https://www.worldcubeassociation.org";

/**
 * WCIF lifecycle to request. The plain `wcif/public` endpoint always serves the
 * `stable` version (still WCIF v1.1), so we ask for `latest` to get v2.
 * See https://github.com/thewca/wcif/blob/latest/versioning-policy.md
 */
export const WCIF_LIFECYCLE = "latest";

/** Major version of the WCIF spec this app is written against. */
export const WCIF_MAJOR_VERSION = 2;

export const wcaApiRequest = async (path: string) => {
  const response = await fetch(`${WCA_ORIGIN}/api/v0/${path}`);
  if (!response.ok) {
    throw new Error(`WCA API request failed: ${response.status} ${path}`);
  }
  return response.json();
};
