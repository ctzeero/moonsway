/**
 * Community TIDAL proxy instances.
 * Two lists: "api" for metadata and "streaming" for audio streams.
 * Same instances used by Monochrome.
 */

export type InstanceType = "api" | "streaming" | "qobuz";

const DEFAULT_INSTANCES: Record<InstanceType, string[]> = {
  api: [
    "https://hifi.geeked.wtf",
    "https://eu-central.monochrome.tf",
    "https://us-west.monochrome.tf",
    "https://arran.monochrome.tf",
    "https://api.monochrome.tf/",
    "https://tidal-api.binimum.org",
    "https://monochrome-api.samidy.com",
    "https://triton.squid.wtf",
    "https://wolf.qqdl.site",
    "https://hifi-one.spotisaver.net",
    "https://hifi-two.spotisaver.net",
    "https://maus.qqdl.site",
    "https://vogel.qqdl.site",
    "https://katze.qqdl.site",
    "https://hund.qqdl.site",
    "https://tidal.kinoplus.online",
  ],
  streaming: [
    "https://hifi.geeked.wtf",
    "https://arran.monochrome.tf",
    "https://api.monochrome.tf/",
    "https://triton.squid.wtf",
    "https://wolf.qqdl.site",
    "https://maus.qqdl.site",
    "https://vogel.qqdl.site",
    "https://katze.qqdl.site",
    "https://hund.qqdl.site",
    "https://tidal.kinoplus.online",
    "https://tidal-api.binimum.org",
    "https://hifi-one.spotisaver.net",
    "https://hifi-two.spotisaver.net",
  ],
  qobuz: [
    "https://qdl-api.monochrome.tf",
    "https://qobuz.kennyy.com.br",
    "https://mono.scavengerfurs.net",
  ],
};

export function getInstances(type: InstanceType): string[] {
  return DEFAULT_INSTANCES[type];
}

export function randomInstanceIndex(instances: string[]): number {
  return Math.floor(Math.random() * instances.length);
}
