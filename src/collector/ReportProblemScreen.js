// Collector app: report a problem from the field. It appears on the Barangay Admin's dashboard.
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { REPORT_TYPES, getDay, getMyFieldReports, sendFieldReport } from '../data/collector';
import { useApi } from '../hooks';
import { Button, Card, Chip, ErrorBanner, Field, Screen, StateView } from '../components/ui';
import { colors, radius, type } from '../theme';
import { fmtDateTime } from '../utils/schedule';
import { Header, SectionTitle } from './parts';

const STATUS_STYLE = {
  Open: { fg: colors.amber, bg: colors.amberLight, label: 'Sent' },
  Acknowledged: { fg: colors.blue, bg: colors.blueLight, label: 'Seen by the barangay' },
  Resolved: { fg: colors.done, bg: colors.doneLight, label: 'Resolved' },
};

async function load() {
  const [mine, day] = await Promise.all([getMyFieldReports(), getDay().catch(() => null)]);
  return { mine, stops: day?.stops ?? [] };
}

export default function ReportProblemScreen() {
  const { data, error, loading, refreshing, reload, pull } = useApi(load);
  const [kind, setKind] = useState(null);
  const [stopId, setStopId] = useState(null);
  const [text, setText] = useState('');
  const [withLocation, setWithLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const send = async () => {
    if (!kind) return setFormError('Choose what the problem is.');
    if (kind === 'Other' && !text.trim()) return setFormError('Describe the problem.');
    setBusy(true); setFormError('');
    try {
      let coords = null;
      if (withLocation) {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          coords = (await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
          ]).catch(() => null))?.coords ?? (await Location.getLastKnownPositionAsync().catch(() => null))?.coords ?? null;
        }
      }
      const r = await sendFieldReport({ type: kind, description: text.trim(), pointId: stopId, latitude: coords?.latitude, longitude: coords?.longitude });
      setKind(null); setStopId(null); setText('');
      Alert.alert(r.queued ? 'Saved on the phone' : 'Report sent', r.queued
        ? 'No signal right now. The report will be sent by itself when the signal is back.'
        : 'Your Barangay Admin will see it on their dashboard.');
      reload();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={pull}>
      <Header title="Report a problem" sub="Sent to your Barangay Admin" />
      <Card>
        <Text style={[type.label, { marginBottom: 8 }]}>What happened?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {REPORT_TYPES.map((t) => <Chip key={t} label={t} selected={kind === t} onPress={() => setKind(t)} />)}
        </View>
        {(data?.stops ?? []).length > 0 && (
          <>
            <Text style={[type.label, { marginTop: 10, marginBottom: 8 }]}>At which stop? (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {data.stops.map((s) => <Chip key={s.id} label={s.name} selected={stopId === s.id} onPress={() => setStopId(stopId === s.id ? null : s.id)} />)}
            </View>
          </>
        )}
        <View style={{ marginTop: 10 }}>
          <Field label="Details" value={text} onChangeText={setText} multiline maxLength={1000}
            placeholder="For example: road works on Zamora St., truck cannot pass" />
        </View>
        <Pressable onPress={() => setWithLocation(!withLocation)} accessibilityRole="checkbox" accessibilityState={{ checked: withLocation }}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name={withLocation ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
          <Text style={[type.body, { marginLeft: 8, flex: 1 }]}>Include my current location</Text>
        </Pressable>
        <ErrorBanner message={formError} />
        <Button title="Send report" onPress={send} loading={busy} style={{ minHeight: 54 }} />
      </Card>

      <SectionTitle>My recent reports</SectionTitle>
      <StateView loading={loading} error={error} onRetry={reload}
        empty={data && data.mine.length === 0} emptyTitle="No reports yet" emptyText="Reports you send appear here with their status." />
      {data?.mine.map((r) => {
        const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.Open;
        return (
          <Card key={r.field_report_id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={[type.heading, { flex: 1, paddingRight: 8 }]}>{r.report_type}</Text>
              <View style={{ backgroundColor: st.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: st.fg, fontWeight: '800', fontSize: 13 }}>{st.label}</Text>
              </View>
            </View>
            <Text style={[type.small, { marginTop: 2 }]}>{fmtDateTime(r.created_at)}{r.collection_point?.name ? ` · ${r.collection_point.name}` : ''}</Text>
            {r.description ? <Text style={[type.body, { marginTop: 6 }]}>{r.description}</Text> : null}
          </Card>
        );
      })}
    </Screen>
  );
}
