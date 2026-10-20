// Collector app: map of Barangay Poblacion with today's truck stops and the truck's own position.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { getDay, getMapData } from '../data/collector';
import { useApi } from '../hooks';
import { Screen, StateView } from '../components/ui';
import { colors, radius, status as STATUS, type } from '../theme';
import { fmtRange } from '../utils/schedule';
import { Header, LinkButton } from './parts';
import { distanceM } from './arrival';
import { mapHtml } from './mapHtml';

async function loadMap() {
  const [map, day] = await Promise.all([getMapData(), getDay().catch(() => null)]);
  const today = new Map((day?.stops ?? []).map((s) => [s.id, s]));
  const stops = map.stops.map((s) => {
    const t = today.get(s.id);
    return {
      ...s,
      state: t ? t.state : 'off',
      when: t ? `Today ${fmtRange(s.start, s.end)}` : `${String(s.days ?? '').split(',').map((d) => d.trim().slice(0, 3)).join(', ')} ${fmtRange(s.start, s.end)}`,
      url: s.maps_url || `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`,
    };
  });
  return { zones: map.zones, stops };
}

function Legend() {
  const items = [['done', 'Done'], ['now', 'Now'], ['upcoming', 'Later today'], ['late', 'Late / not collected']];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
      {items.map(([k, label]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: STATUS[k].fg, marginRight: 6 }} />
          <Text style={type.small}>{label}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.muted, marginRight: 6 }} />
        <Text style={type.small}>Not today</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ width: 9, height: 13, borderRadius: 2, backgroundColor: colors.primary, marginRight: 6 }} />
        <Text style={type.small}>You (the truck)</Text>
      </View>
    </View>
  );
}

export default function CollectorRouteScreen() {
  const { data, error, loading, reload } = useApi(loadMap, { pollMs: 120000 });
  const web = useRef(null);
  const [readyFor, setReadyFor] = useState(null);   // which page (html) reported it is ready
  const [pos, setPos] = useState(null);
  const lastMoved = useRef(null);   // last position at least 8 m away, for the truck's direction
  const [heading, setHeading] = useState(null);
  // Build the page once per data set (zones and stops change rarely); positions are pushed in.
  const html = useMemo(() => (data ? mapHtml(data) : null), [data]);
  const ready = readyFor !== null && readyFor === html;

  // The phone's own position while this screen is open.
  useFocusEffect(useCallback(() => {
    let sub = null, alive = true;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted || !alive) return;
      const last = await Location.getLastKnownPositionAsync();
      if (last && alive) setPos(last.coords);
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 5 }, (p) => setPos(p.coords));
      if (!alive) sub.remove();
    })().catch(() => {});
    return () => { alive = false; sub?.remove(); };
  }, []));

  // Direction of travel: the phone's own heading when moving, else worked out from the last 8 m moved.
  useEffect(() => {
    if (!pos) return;
    const prev = lastMoved.current;
    if (!prev) { lastMoved.current = pos; return; }
    if (distanceM(prev.latitude, prev.longitude, pos.latitude, pos.longitude) < 8) return;
    const r = Math.PI / 180;
    const y = Math.sin((pos.longitude - prev.longitude) * r) * Math.cos(pos.latitude * r);
    const x = Math.cos(prev.latitude * r) * Math.sin(pos.latitude * r) - Math.sin(prev.latitude * r) * Math.cos(pos.latitude * r) * Math.cos((pos.longitude - prev.longitude) * r);
    setHeading(pos.heading != null && pos.heading >= 0 && (pos.speed ?? 0) > 1 ? pos.heading : ((Math.atan2(y, x) / r) + 360) % 360);
    lastMoved.current = pos;
  }, [pos]);

  useEffect(() => {
    if (ready && pos) web.current?.injectJavaScript(`window.setMe && window.setMe(${pos.latitude}, ${pos.longitude}, false, ${heading ?? 'null'}); true;`);
  }, [ready, pos, heading]);

  const onMessage = (e) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.ready) setReadyFor(html);
      if (m.open && /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.app\.goo\.gl\//.test(m.open)) Linking.openURL(m.open).catch(() => {});
    } catch { /* ignore */ }
  };

  return (
    <Screen scroll={false}>
      <Header title="Map" sub="Barangay Poblacion" />
      <StateView loading={loading && !data} error={!data ? error : null} onRetry={reload} />
      {html && (
        <>
          <View style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, minHeight: 300 }}>
            <WebView
              ref={web}
              originWhitelist={['*']}
              source={{ html, baseUrl: 'https://ecollect.app/' }}
              onMessage={onMessage}
              javaScriptEnabled
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(req) => req.url.startsWith('https://ecollect.app') || req.url === 'about:blank'}
              style={{ flex: 1, backgroundColor: colors.bg }}
            />
          </View>
          <Legend />
          <View style={{ flexDirection: 'row' }}>
            {pos ? <LinkButton icon="locate-outline" title="Show me on the map" onPress={() => web.current?.injectJavaScript(`window.setMe && window.setMe(${pos.latitude}, ${pos.longitude}, true, ${heading ?? 'null'}); true;`)} /> : null}
          </View>
          <Text style={[type.small, { marginBottom: 4 }]}>Zone areas (dashed) are approximate until the barangay confirms them. Tap a stop for directions.</Text>
        </>
      )}
    </Screen>
  );
}
