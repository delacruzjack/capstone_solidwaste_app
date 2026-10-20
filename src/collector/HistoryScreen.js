// Collector app: my last 14 days — truck stops, emergency pickups and shifts.
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistory } from '../data/collector';
import { useApi } from '../hooks';
import { Card, Screen, StateView } from '../components/ui';
import { colors, type } from '../theme';
import { fmtTime } from '../utils/schedule';
import { loadText } from './sheets';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayTitle = (iso, day) => { const [, m, d] = iso.split('-').map(Number); return `${day}, ${MONTHS[m - 1]} ${d}`; };
const clock = (ts) => { if (!ts) return ''; const d = new Date(new Date(ts).getTime() + 8 * 3600000); return fmtTime(`${d.getUTCHours()}:${d.getUTCMinutes()}:00`); };
const hours = (a, b) => { const m = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };

function Line({ icon, color, title, sub }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 7 }}>
      <Ionicons name={icon} size={20} color={color} style={{ marginRight: 10, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{title}</Text>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { data, error, loading, refreshing, reload, pull } = useApi(() => getHistory(14));
  return (
    <Screen refreshing={refreshing} onRefresh={pull} style={{ paddingTop: 12 }}>
      <StateView loading={loading} error={error} onRetry={reload}
        empty={data && data.length === 0} emptyTitle="Nothing yet" emptyText="Your stops, emergency pickups and shifts from the last 14 days appear here." />
      {(data ?? []).map((d) => {
        const done = d.stops.filter((s) => s.outcome === 'done').length;
        return (
          <Card key={d.date}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <Text style={type.heading}>{dayTitle(d.date, d.day)}</Text>
              {d.stops.length ? <Text style={type.small}>{done} of {d.stops.length} stops done</Text> : null}
            </View>
            {d.shifts.map((s, i) => (
              <Line key={`sh${i}`} icon="time-outline" color={colors.primary}
                title={`Shift ${clock(s.start)} – ${s.end ? clock(s.end) : 'still on'}`}
                sub={s.end ? `${hours(s.start, s.end)}${s.auto ? ' · not ended in the app (closed at the last GPS reading)' : ''}` : ''} />
            ))}
            {d.stops.map((s, i) => (
              <Line key={`st${i}`} icon={s.outcome === 'done' ? 'checkmark-circle' : 'close-circle'} color={s.outcome === 'done' ? colors.done : colors.danger}
                title={s.name}
                sub={s.outcome === 'done'
                  ? `Done ${clock(s.at)}${s.load ? ` · ${loadText(s.load)}` : ''}`
                  : `Couldn’t collect: ${s.reason}${s.note ? ` (${s.note})` : ''}`} />
            ))}
            {d.emergencies.map((e, i) => (
              <Line key={`em${i}`} icon="alert-circle-outline" color={e.status === 'Completed' ? colors.done : colors.amber}
                title={`Emergency: ${e.location}`} sub={`${e.status}${e.at ? ` ${clock(e.at)}` : ''} · ${e.reason}`} />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
