import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Restaurant } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export type MappedRestaurant = Restaurant & { lat: number; lng: number };

export const hasCoords = (r: Restaurant): r is MappedRestaurant =>
  typeof r.lat === 'number' && typeof r.lng === 'number' && Number.isFinite(r.lat) && Number.isFinite(r.lng);

/** Map roulette needs a few real pins; otherwise the screen keeps the reel. */
export const MIN_MAP_PINS = 3;
const MAX_PINS = 40;

const PIN = 44;
const PIN_ACTIVE = 74;
/** The sweep: fast at first, slowing into the winner */
const SWEEP_LOOPS = 3;
const HOP_FAST_MS = 55;
const HOP_SLOW_MS = 480;
/** From this share of the spin the camera chases the highlight, zooming from → to */
const CHASE_FROM = 0.55;
const CHASE_ZOOM_FROM = 14.2;
const CHASE_ZOOM_TO = 16.4;

function fitRegion(points: MappedRestaurant[]): Region {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    // Padding so the edge pins (and the enlarged one) stay inside the frame
    latitudeDelta: Math.max(0.006, (maxLat - minLat) * 1.5),
    longitudeDelta: Math.max(0.006, (maxLng - minLng) * 1.5),
  };
}

interface Props {
  /** Room taken by the floating header / button, so pins and the camera stay in the visible part */
  mapPadding?: { top: number; right: number; bottom: number; left: number };
  restaurants: MappedRestaurant[];
  /** A new token starts a spin that lands on `winnerId`. */
  spin: { winnerId: string; token: number } | null;
  onLanded: (winnerId: string) => void;
}

/**
 * Top-down map with a blurred pin per restaurant. A spin sweeps a highlight around the pins
 * (by angle from the centre), flashing each photo for a beat, slowing down, then the camera
 * flies to the winner.
 */
export function RouletteMap({ restaurants, spin, onLanded, mapPadding }: Props) {
  const mapRef = useRef<MapView>(null);
  const pins = useMemo(() => restaurants.slice(0, MAX_PINS), [restaurants]);
  const region = useMemo(() => fitRegion(pins), [pins]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [landedId, setLandedId] = useState<string | null>(null);
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  // Sweep order: clockwise around the centre — reads as a spiral across the map
  const order = useMemo(() => {
    const cLat = region.latitude;
    const cLng = region.longitude;
    return [...pins].sort(
      (a, b) => Math.atan2(a.lat - cLat, a.lng - cLng) - Math.atan2(b.lat - cLat, b.lng - cLng),
    );
  }, [pins, region]);

  useEffect(() => {
    if (!spin) return;
    const winnerIdx = order.findIndex((p) => p.id === spin.winnerId);
    if (winnerIdx < 0) return;

    setLandedId(null);
    const cam = mapRef.current;
    cam?.animateToRegion(region, 400);

    // Hops: a few full loops, then on to the winner; the delay eases from fast to slow
    const total = SWEEP_LOOPS * order.length + winnerIdx + 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    for (let i = 0; i < total; i++) {
      const p = i / Math.max(1, total - 1);
      const eased = p * p * p; // ease-in on the delay = ease-out on the motion
      const hop = HOP_FAST_MS + (HOP_SLOW_MS - HOP_FAST_MS) * eased;
      at += hop;
      const pin = order[i % order.length];
      const last = i === total - 1;
      timers.push(
        setTimeout(() => {
          setActiveId(pin.id);
          void Haptics.selectionAsync();
          if (!last) {
            // Cinematic camera: wide and slowly turning while it races, then chasing pin to pin
            // and closing in as it slows down
            if (p < CHASE_FROM) {
              cam?.animateCamera({ heading: p * 40 }, { duration: 220 });
            } else {
              const k = (p - CHASE_FROM) / (1 - CHASE_FROM);
              cam?.animateCamera(
                {
                  center: { latitude: pin.lat, longitude: pin.lng },
                  zoom: CHASE_ZOOM_FROM + (CHASE_ZOOM_TO - CHASE_ZOOM_FROM) * k,
                  heading: 40 - 20 * k,
                  pitch: 20 * k,
                },
                { duration: Math.min(650, Math.max(160, hop * 0.95)) },
              );
            }
            return;
          }
          setLandedId(pin.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // The landing: dive in and tilt
          cam?.animateCamera(
            { center: { latitude: pin.lat, longitude: pin.lng }, zoom: 17.6, pitch: 55, heading: 15 },
            { duration: 1300 },
          );
          timers.push(setTimeout(() => onLandedRef.current(pin.id), 1800));
        }, at),
      );
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.token]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="mutedStandard"
        userInterfaceStyle="dark"
        showsPointsOfInterests={false}
        showsBuildings={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsCompass={false}
        mapPadding={mapPadding}
        toolbarEnabled={false}
      >
        {pins.map((r) => {
          const active = r.id === activeId;
          const landed = r.id === landedId;
          const size = active ? PIN_ACTIVE : PIN;
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={active ? 100 : 1}
              tracksViewChanges
            >
              <View style={styles.pinWrap}>
                <View
                  style={[
                    styles.pin,
                    { width: size, height: size, borderRadius: size / 2 },
                    active && styles.pinActive,
                  ]}
                >
                  {/* Blurred until the sweep lands on it — then the real photo for a beat */}
                  <Image
                    source={{ uri: r.image }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    blurRadius={active ? 0 : 10}
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                  {!active && <View style={styles.pinVeil} />}
                </View>
                {landed && (
                  <View style={styles.label}>
                    <Text style={styles.labelText} numberOfLines={1}>
                      {r.name}
                    </Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.card,
  },
  pinWrap: {
    alignItems: 'center',
  },
  pin: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: colors.primaryMuted,
  },
  pinActive: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  pinVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  label: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    maxWidth: 200,
  },
  labelText: {
    ...typography.captionMedium,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
