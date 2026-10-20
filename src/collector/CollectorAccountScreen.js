// Collector app: my account, change password, log out.
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { changePassword, getCollector, unregisterPushToken } from '../data/collector';
import { useAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { Button, Card, ErrorBanner, Field, Screen, StateView } from '../components/ui';
import { type } from '../theme';
import { useLocationShare } from './LocationShare';
import { GpsPill } from './parts';
import { clearOffline, subscribeOutbox } from './offline';
import { clearArrivals } from './arrival';
import { forgetPush } from './notify';

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={type.small}>{label}</Text>
      <Text style={[type.body, { flexShrink: 1, textAlign: 'right', marginLeft: 12, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

export default function CollectorAccountScreen() {
  const { signOut, email } = useAuth();
  const share = useLocationShare();
  const { data: me, error, loading, reload } = useApi(getCollector);
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwError, setPwError] = useState('');
  const [busy, setBusy] = useState(false);

  const savePassword = async () => {
    if (!pw.current || !pw.next) return setPwError('Enter your current and new password.');
    if (pw.next !== pw.again) return setPwError('The new passwords do not match.');
    setBusy(true); setPwError('');
    try {
      await changePassword(email, pw.current, pw.next);
      setPw({ current: '', next: '', again: '' });
      Alert.alert('Password changed', 'Use the new password next time you log in.');
    } catch (e) {
      setPwError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const [pending, setPending] = useState(0);
  useEffect(() => subscribeOutbox((s) => setPending(s.pending)), []);

  const confirmLogout = () =>
    Alert.alert('Log out?', [
      pending ? `${pending} ${pending === 1 ? 'tap has' : 'taps have'} not been sent yet (no signal) and will be lost.` : '',
      share.sharing ? 'Location sharing will stop and the truck will disappear from the map.' : 'You’ll need to log in again.',
    ].filter(Boolean).join(' '), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        await share.stop();
        await forgetPush(unregisterPushToken);
        await clearOffline();
        await clearArrivals();
        await signOut();
      } },
    ]);

  return (
    <Screen style={{ paddingTop: 12 }}>
      <View style={{ alignItems: 'flex-end', marginBottom: 8 }}><GpsPill /></View>
      <StateView loading={loading} error={error} onRetry={reload} />
      {me && (
        <Card>
          <Text style={type.heading}>{`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim()}</Text>
          <Text style={[type.small, { marginBottom: 8 }]}>{me.email} · Garbage collector</Text>
          <Row label="Truck" value={me.truck?.plate_number || 'Not assigned'} />
          <Row label="Home zone" value={me.route?.zone_name || 'Not set'} />
        </Card>
      )}
      <Text style={[type.small, { marginBottom: 16 }]}>To change your truck, zone or schedule, contact your Barangay Admin.</Text>

      <Card>
        <Text style={[type.heading, { marginBottom: 10 }]}>Change password</Text>
        <Field label="Current password" value={pw.current} onChangeText={(v) => setPw({ ...pw, current: v })} secureTextEntry autoCapitalize="none" />
        <Field label="New password (at least 8 characters)" value={pw.next} onChangeText={(v) => setPw({ ...pw, next: v })} secureTextEntry autoCapitalize="none" />
        <Field label="New password again" value={pw.again} onChangeText={(v) => setPw({ ...pw, again: v })} secureTextEntry autoCapitalize="none" />
        <ErrorBanner message={pwError} />
        <Button title="Change password" onPress={savePassword} loading={busy} />
      </Card>

      <Button title="Log out" variant="ghost" onPress={confirmLogout} />
    </Screen>
  );
}
