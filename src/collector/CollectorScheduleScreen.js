// Collector app: the week's truck stops (same layout as the website's week view).
import React from 'react';
import { Text, View } from 'react-native';
import { useApi } from '../hooks';
import { getWeek } from '../data/collector';
import { Card, Screen, StateView } from '../components/ui';
import { colors, type } from '../theme';
import { fmtRange } from '../utils/schedule';
import { Header, ZoneChips } from './parts';

const TODAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

export default function CollectorScheduleScreen() {
  const { data, error, loading, refreshing, reload, pull } = useApi(getWeek);

  return (
    <Screen refreshing={refreshing} onRefresh={pull}>
      <Header title="This week" sub="Your truck stops each day" />
      <StateView
        loading={loading} error={error} onRetry={reload}
        empty={data && !data.assigned}
        emptyTitle="No schedule yet"
        emptyText="Your Barangay Admin hasn’t set you as the truck crew yet."
      />
      {data?.assigned && data.days.map((d) => (
        <Card key={d.day}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: d.stops.length ? 6 : 0 }}>
            <Text style={type.heading}>{d.day}</Text>
            {d.day === TODAY ? <Text style={[type.small, { fontWeight: '700' }]}>Today</Text> : null}
          </View>
          {!d.stops.length && <Text style={type.small}>{d.day === 'Sunday' ? 'No collection on Sunday' : 'No truck stops'}</Text>}
          {d.stops.map((s, i) => (
            <View key={s.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{fmtRange(s.start, s.end)}</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 1 }}>{s.name}</Text>
              <Text style={type.small}>{s.standby ? `${s.standby} min standby` : ''}{s.landmark ? `${s.standby ? ' · ' : ''}${s.landmark}` : ''}</Text>
              <ZoneChips zones={s.zones} />
            </View>
          ))}
        </Card>
      ))}
      {data?.assigned && data.dropOff.length > 0 && (
        <Text style={[type.small, { marginTop: 4 }]}>{data.dropOff.join(', ')}: no truck stop. Residents bring their garbage directly to the designated place.</Text>
      )}
    </Screen>
  );
}
