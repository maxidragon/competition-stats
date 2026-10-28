/**
 * Country flags from the flag-icons package, as separate SVG files. The glob
 * only maps country codes to file URLs; a browser downloads a flag when one
 * is shown. `no-inline` stops Vite from embedding each small SVG in the
 * bundle as a data URL.
 */
const FLAG_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../../node_modules/flag-icons/flags/4x3/*.svg", {
      query: "?no-inline",
      import: "default",
      eager: true,
    })
  ).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -".svg".length), url])
);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * A country's flag. Codes without one (the WCA's multiple-country codes such
 * as XE, or Kosovo's XK) get an empty space of the same width so names stay
 * aligned.
 */
export default function Flag({ countryIso2 }: { countryIso2: string }) {
  const url = FLAG_URLS[countryIso2.toLowerCase()];
  if (!url) {
    return <span className="inline-block w-5 shrink-0" aria-hidden="true" />;
  }
  const country = regionNames.of(countryIso2.toUpperCase()) ?? countryIso2;
  return (
    <img
      src={url}
      alt={country}
      title={country}
      width={20}
      height={15}
      loading="lazy"
      className="w-5 h-[15px] shrink-0 rounded-[2px] object-cover"
    />
  );
}
