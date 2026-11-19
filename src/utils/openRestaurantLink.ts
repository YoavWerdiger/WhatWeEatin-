import { Linking, Platform } from 'react-native';
import type { RestaurantSource } from '../types';

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

function woltAppCandidates(httpsUrl: string): string[] {
  const path = httpsUrl.replace(/^https?:\/\/(www\.)?wolt\.com\/?/i, '');
  const candidates = [`wolt://${path}`];

  if (Platform.OS === 'android') {
    candidates.push(
      `intent://wolt.com/${path}#Intent;scheme=https;package=com.wolt.android;end`,
    );
  }

  return candidates;
}

function tenbisAppCandidates(httpsUrl: string): string[] {
  const withoutHost = httpsUrl
    .replace(/^https?:\/\/(www\.)?10bis\.co\.il\/?/i, '')
    .replace(/^https?:\/\/(www\.)?tenbis\.co\.il\/?/i, '');

  return [
    `tenbisapp://${withoutHost}`,
    `tenbis://${withoutHost}`,
    httpsUrl.replace(/^https?:\/\//i, 'tenbisapp://'),
    httpsUrl.replace(/^https?:\/\//i, 'tenbis://'),
  ];
}

/**
 * Prefer native delivery apps when installed; fall back to the https URL
 * via system Linking (universal links / browser) — not an in-app browser,
 * so iOS/Android can still hand off to the installed app.
 */
export async function openRestaurantLink(
  url?: string,
  source?: RestaurantSource,
): Promise<void> {
  if (!url) return;

  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }

  if (source === 'wolt') {
    for (const candidate of woltAppCandidates(url)) {
      if (await tryOpenUrl(candidate)) return;
    }
  }

  if (source === 'tenbis') {
    for (const candidate of tenbisAppCandidates(url)) {
      if (await tryOpenUrl(candidate)) return;
    }
  }

  try {
    await Linking.openURL(url);
  } catch {
    // no-op: nothing else we can do without a browser sheet
  }
}
