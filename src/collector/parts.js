// Small building blocks shared by the collector screens.
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, status as STATUS, type } from '../theme';
import { useLocationShare } from './LocationShare';

/** Live / Off pill shown on every collector screen. */
export function GpsPill() {
  const share = useLocationShare();
  const on = share?.sharing;
  const problem = on && share?.error;
  const fg = problem ? colors.amber : on ? colors.done : colors.danger;
  const bg = problem ? colors.amberLight : on ? colors.doneLight : colors.dangerLight;
  return (
    <View accessibilityRole="text" accessibilityLabel={on ? 'Location sharing is on' : 'Location sharing is off'}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: fg, marginRight: 7 }} />
      <Text style={{ color: fg, fontWeight: '800', fontSize: 14 }}>{problem ? 'GPS: retrying' : on ? 'GPS: Live' : 'GPS: Off'}</Text>
    </View>
  );
}

/** Screen title with the GPS pill on the right. */
export function Header({ title, sub }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
        <Text style={type.title}>{title}</Text>
      </View>
      <GpsPill />
    </View>
  );
}

export function StateTag({ state }) {
  const s = STATUS[state] ?? STATUS.upcoming;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color: s.fg, fontWeight: '800', fontSize: 13 }}>{s.label}</Text>
    </View>
  );
}

export function ZoneChips({ zones }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {zones.map((z) => {
        const name = typeof z === 'string' ? z : z.name;
        const done = typeof z === 'object' && z.done;
        return (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: done ? colors.done : colors.border,
            backgroundColor: done ? colors.doneLight : colors.surface2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 }}>
            {done ? <Ionicons name="checkmark" size={14} color={colors.done} style={{ marginRight: 3 }} /> : null}
            <Text style={{ fontSize: 14, fontWeight: '600', color: done ? colors.done : colors.text }}>{name}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Opens the stop's exact Google Maps link (Street View) or its coordinates. */
export function openInMaps(stop) {
  const url = stop?.maps_url || (stop?.lat != null ? `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}` : null);
  if (url) Linking.openURL(url).catch(() => {});
}

export function LinkButton({ icon, title, onPress, color = colors.primary }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color, fontWeight: '700', fontSize: 15, marginLeft: 6 }}>{title}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 10 }}>
      <Text style={type.heading}>{children}</Text>
      {right ? <Text style={type.small}>{right}</Text> : null}
    </View>
  );
}
