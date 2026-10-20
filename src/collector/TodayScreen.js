// Collector app: today's shift, truck stops, emergency pickups and GPS sharing.
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDay, markOther, setEmergencyStatus, shiftAction, stopAction } from '../data/collector';
import { useApi, useNow } from '../hooks';
import { Button, Card, ErrorBanner, Screen, StateView } from '../components/ui';
import { colors, radius, type } from '../theme';
import { fmtRange, fmtTime } from '../utils/schedule';
import { useLocationShare } from './LocationShare';
import { Header, LinkButton, SectionTitle, StateTag, ZoneChips, openInMaps } from './parts';
import { clearFailed, subscribeOutbox } from './offline';
import { endStandby, standbyLeft, startStandby, subscribeArrivals, ARRIVE_METERS } from './arrival';
import { scheduleFirstStopReminder } from './notify';
import { LoadSheet, MissedSheet, loadText } from './sheets';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso, day) => { const [, m, d] = String(iso).split('-').map(Number); return `${day}, ${MONTHS[m - 1]} ${d}`; };
/** Philippine clock time of a timestamp ("5:12 PM"). */
const clock = (ts) => { if (!ts) return ''; const d = new Date(new Date(ts).getTime() + 8 * 3600000); return fmtTime(`${d.getUTCHours()}:${d.getUTCMinutes()}:00`); };
const mmss = (sec) => `${Math.floor(Math.abs(sec) / 60)}:${String(Math.abs(sec) % 60).padStart(2, '0')}`;

function useStore(subscribe, initial) {
  const [v, setV] = useState(initial);
  useEffect(() => subscribe(setV), [subscribe]);
  return v;
}

/** No signal / taps waiting to be sent / taps the server refused. */
function SyncBar({ day }) {
  const box = useStore(subscribeOutbox, { pending: 0, sending: false, failed: [] });
  if (!day?.offline && !box.pending && !box.failed.length) return null;
  return (
    <>
      {(day?.offline || box.pending > 0) && (
        <View style={{ flexDirection: 'row', backgroundColor: colors.amberLight, borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
          <Ionicons name={box.sending ? 'cloud-upload-outline' : 'cloud-offline-outline'} size={22} color={colors.amber} style={{ marginRight: 10 }} />
          <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.text }}>
            {day?.offline ? 'No signal. Showing today’s work saved on this phone. ' : ''}
            {box.pending ? `${box.pending} ${box.pending === 1 ? 'tap is' : 'taps are'} saved and will be sent ${box.sending ? 'now…' : 'when the signal is back.'}` : ''}
          </Text>
        </View>
      )}
      {box.failed.length > 0 && (
        <View style={{ backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontWeight: '800', color: colors.danger, marginBottom: 4 }}>Not saved by the server</Text>
          {box.failed.map((f, i) => <Text key={i} style={[type.small, { color: colors.text }]}>{f.label}: {f.message}</Text>)}
          <LinkButton icon="checkmark" title="OK" color={colors.danger} onPress={clearFailed} />
        </View>
      )}
    </>
  );
}

function ShiftCard({ day, busy, onShift }) {
  const on = Boolean(day?.shift);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
      marginBottom: 12, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
      <Ionicons name={on ? 'time' : 'time-outline'} size={26} color={on ? colors.primary : colors.muted} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{on ? 'On shift' : 'Not on shift'}</Text>
        <Text style={type.small}>{on ? `Since ${clock(day.shift.started_at)}${day.shift.pending ? ' (saved, sending…)' : ''}` : 'Start your shift when you begin work.'}</Text>
      </View>
      <Pressable onPress={() => onShift(on ? 'end' : 'start')} disabled={busy} accessibilityRole="button"
        style={({ pressed }) => ({ backgroundColor: on ? colors.surface : colors.primary, borderWidth: on ? 1.5 : 0, borderColor: colors.primary,
          borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, opacity: pressed || busy ? 0.7 : 1 })}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: on ? colors.primary : colors.onPrimary }}>{on ? 'End shift' : 'Start shift'}</Text>
      </Pressable>
    </View>
  );
}

function GpsCard({ day }) {
  const share = useLocationShare();
  const on = share.sharing;
  return (
    <View style={{ backgroundColor: on ? colors.primary : colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 20,
      borderWidth: on ? 0 : 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name={on ? 'navigate-circle' : 'navigate-circle-outline'} size={26} color={on ? '#fff' : colors.muted} />
        <Text style={{ fontSize: 19, fontWeight: '800', marginLeft: 8, color: on ? '#fff' : colors.text }}>
          {on ? 'Sharing the truck\'s location' : 'Location sharing is off'}
        </Text>
      </View>
      <Text style={{ fontSize: 15, lineHeight: 21, color: on ? '#dcefe3' : colors.muted, marginBottom: 14 }}>
        {on
          ? `${share.lastSentAt ? `Last sent ${clock(share.lastSentAt)}. ` : 'Getting the first GPS reading… '}`
            + (share.mode === 'background' ? 'Keeps going when the phone is locked.' : '')
            + (share.stopAt ? ` Stops by itself at ${clock(share.stopAt)}.` : '')
          : `Turn this on when you start the route so residents and the barangay can see the truck. The app also tells you when you reach a stop (within ${ARRIVE_METERS} m).`}
      </Text>
      {on && share.error ? <View style={{ marginBottom: 12 }}><ErrorBanner message={share.error} /></View> : null}
      {share.warning ? (
        <View style={{ flexDirection: 'row', backgroundColor: on ? 'rgba(255,255,255,0.14)' : colors.amberLight, borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
          <Ionicons name="information-circle-outline" size={20} color={on ? '#fff' : colors.amber} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: on ? '#fff' : colors.text }}>{share.warning}</Text>
        </View>
      ) : null}
      <Pressable onPress={on ? share.stop : () => share.start(day)} disabled={share.busy} accessibilityRole="button"
        style={({ pressed }) => ({ backgroundColor: on ? '#fff' : colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', opacity: pressed || share.busy ? 0.8 : 1 })}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: on ? colors.primaryDark : '#fff' }}>
          {share.busy ? 'Starting…' : on ? 'Stop sharing' : 'Start sharing'}
        </Text>
      </Pressable>
    </View>
  );
}

/** Arrival and standby countdown for one stop. */
function Standby({ stop, arrival, now, onStart }) {
  const finished = stop.state === 'done' || stop.state === 'missed';
  if (finished) return null;
  if (!arrival) {
    return <LinkButton icon="hourglass-outline" title={stop.standby ? `I’m here: start the ${stop.standby}-min standby timer` : 'I’m here: start standby'} onPress={onStart} />;
  }
  const left = standbyLeft(arrival, now);
  const over = left !== null && left <= 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: over ? colors.amberLight : colors.blueLight, borderRadius: radius.md,
      padding: 12, marginTop: 10 }} accessibilityLiveRegion="polite">
      <Ionicons name={over ? 'alarm-outline' : 'hourglass-outline'} size={24} color={over ? colors.amber : colors.blue} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: over ? colors.amber : colors.blue }}>
          {left === null ? `Arrived ${clock(arrival.at)}` : over ? 'Standby time is over' : `Standing by · ${mmss(left)} left`}
        </Text>
        <Text style={type.small}>
          {arrival.auto ? `Arrived ${clock(arrival.at)} (GPS).` : `Started ${clock(arrival.at)}.`}{over ? ' Tap Done, or Couldn’t collect if residents did not come.' : ''}
        </Text>
      </View>
    </View>
  );
}

function StopCard({ stop, highlight, busy, arrival, now, onDone, onMissed, onUndo, onStandby }) {
  const done = stop.state === 'done';
  const missed = stop.state === 'missed';
  const finished = done || missed;
  return (
    <Card style={[highlight ? { borderColor: colors.primary, borderWidth: 2 } : null, missed ? { borderColor: colors.danger } : null]}>
      {highlight ? <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13, marginBottom: 6, letterSpacing: 0.5 }}>NEXT STOP</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontSize: highlight ? 22 : 18, fontWeight: '800', color: finished ? colors.faint : colors.text }}>{fmtRange(stop.start, stop.end)}</Text>
          <Text style={{ fontSize: highlight ? 19 : 17, fontWeight: '700', color: finished ? colors.faint : colors.text, marginTop: 2 }}>{stop.name}</Text>
          {stop.landmark ? <Text style={[type.small, { marginTop: 2 }]}>{stop.landmark}</Text> : null}
        </View>
        <StateTag state={stop.state} />
      </View>
      <ZoneChips zones={stop.zones} />
      {done ? (
        <Text style={[type.small, { marginTop: 2 }]}>Done at {clock(stop.done_at)}.{stop.load ? ` ${loadText(stop.load)}.` : ''}</Text>
      ) : missed ? (
        <Text style={[type.small, { marginTop: 2, color: colors.danger }]}>
          {stop.missed_reason}{stop.note ? `: ${stop.note}` : ''}. Sent to the Barangay Admin at {clock(stop.missed_at)}.
        </Text>
      ) : (
        <Text style={[type.small, { marginTop: 2 }]}>
          {stop.standby ? `Stand by ${stop.standby} min while residents bring their garbage.` : 'Stand by while residents bring their garbage.'}
        </Text>
      )}
      {stop.pending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.amber} />
          <Text style={{ color: colors.amber, fontWeight: '700', marginLeft: 6 }}>Saved on the phone, waiting to send</Text>
        </View>
      ) : null}
      <Standby stop={stop} arrival={arrival} now={now} onStart={() => onStandby(stop)} />
      <LinkButton icon="navigate-outline" title="Open in Google Maps" onPress={() => openInMaps(stop)} />
      {finished ? (
        <Button title="Undo" variant="ghost" loading={busy} onPress={() => onUndo(stop)} />
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Button title="Done at this stop" loading={busy} onPress={() => onDone(stop)} style={{ flex: 1.4, minHeight: 54, marginRight: 8 }} />
          <Button title="Couldn’t collect" variant="ghost" disabled={busy} onPress={() => onMissed(stop)}
            style={{ flex: 1, minHeight: 54, borderColor: colors.danger }} />
        </View>
      )}
    </Card>
  );
}

function EmergencyCard({ em, busy, onStatus }) {
  const done = em.status === 'Completed';
  return (
    <Card style={{ borderLeftWidth: 5, borderLeftColor: done ? colors.done : colors.danger }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>EMERGENCY PICKUP</Text>
        <Text style={{ fontWeight: '800', fontSize: 13, color: done ? colors.done : em.overdue ? colors.danger : colors.amber }}>
          {em.status}{em.overdue && !done ? ' · overdue' : ''}{em.pending ? ' · saved' : ''}
        </Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 }}>{em.end ? fmtRange(em.start, em.end) : `From ${fmtTime(em.start)}`}</Text>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 }}>{em.location}</Text>
      <Text style={[type.small, { marginTop: 2 }]}>{em.zone || 'No zone'} · {em.reason}</Text>
      {em.notes ? <Text style={[type.small, { marginTop: 4 }]}>{em.notes}</Text> : null}
      {em.lat != null ? <LinkButton icon="navigate-outline" title="Open in Google Maps" onPress={() => openInMaps(em)} /> : <View style={{ height: 10 }} />}
      {!done ? (
        <Button title={em.status === 'In progress' ? 'Mark completed' : 'On the way'} loading={busy}
          onPress={() => onStatus(em, em.status === 'In progress' ? 'Completed' : 'In progress')} style={{ minHeight: 52 }} />
      ) : (
        <Button title="Undo" variant="ghost" loading={busy} onPress={() => onStatus(em, 'In progress')} />
      )}
    </Card>
  );
}

export default function TodayScreen() {
  const { data: day, error, loading, refreshing, reload, pull, setData } = useApi(getDay, { pollMs: 60000 });
  const share = useLocationShare();
  const arrivals = useStore(subscribeArrivals, { date: null, list: {} });
  const [busyKey, setBusyKey] = useState(null);
  const [loadFor, setLoadFor] = useState(null);
  const [missFor, setMissFor] = useState(null);
  const myArrivals = arrivals.date === day?.date ? arrivals.list : {};
  const timing = (day?.stops ?? []).some((s) => myArrivals[s.id] && s.state !== 'done' && s.state !== 'missed');
  const now = useNow(1000, timing);

  useEffect(() => { if (day && !day.offline) scheduleFirstStopReminder(day); }, [day]);

  /** Runs an action; shows the result (from the server, or saved on the phone). */
  const run = async (key, fn) => {
    setBusyKey(key);
    try {
      const r = await fn();
      if (r?.day) setData(r.queued ? { ...r.day, offline: day?.offline } : r.day);
      else await reload();
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
    } finally {
      setBusyKey(null);
    }
  };
  const notYet = (stop, go) => {
    if (stop.state !== 'upcoming') return go();
    return Alert.alert('It is not time yet', `${stop.name} starts at ${fmtTime(stop.start)}. Continue anyway?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: go }]);
  };
  const onDone = (stop) => notYet(stop, () => setLoadFor(stop));
  const onMissed = (stop) => notYet(stop, () => setMissFor(stop));
  const saveDone = (level) => {
    const stop = loadFor; setLoadFor(null);
    run(`s${stop.id}`, () => stopAction(stop, 'done', { load: level }));
    endStandby(stop.id);
  };
  const saveMissed = (reason, note) => {
    const stop = missFor; setMissFor(null);
    run(`s${stop.id}`, () => stopAction(stop, 'missed', { reason, note }));
    endStandby(stop.id);
  };
  const onUndo = (stop) => Alert.alert('Undo this stop?', `${stop.name} will show as not done.${stop.state === 'missed' ? ' The report to the Barangay Admin is withdrawn if they have not seen it yet.' : ''}`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Undo', onPress: () => { run(`s${stop.id}`, () => stopAction(stop, 'undo')); endStandby(stop.id, { forget: true }); } }]);
  const onStandby = (stop) => startStandby(stop, day.date);
  const onStatus = (em, status) => run(`e${em.id}`, () => setEmergencyStatus(em, status));
  const onOther = (o) => run(`o${o.schedule_id}`, () => markOther(o.schedule_id, !o.done_at, day.date));
  const onShift = (action) => {
    if (action === 'end') {
      return Alert.alert('End your shift?', share.sharing ? 'Location sharing keeps running until you stop it.' : 'Your working hours are recorded for the barangay.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End shift', onPress: () => run('shift', () => shiftAction('end')) },
        ...(share.sharing ? [{ text: 'End shift and stop sharing', onPress: () => { run('shift', () => shiftAction('end')); share.stop(); } }] : []),
      ]);
    }
    run('shift', () => shiftAction('start'));
    if (!share.sharing) {
      Alert.alert('Shift started', 'Start sharing the truck’s location too?', [
        { text: 'Not now', style: 'cancel' }, { text: 'Start sharing', onPress: () => share.start(day) },
      ]);
    }
    return undefined;
  };

  const stops = day?.stops ?? [];
  const next = stops.find((s) => s.state !== 'done' && s.state !== 'missed');
  const doneCount = stops.filter((s) => s.state === 'done').length;
  const missedCount = stops.filter((s) => s.state === 'missed').length;
  const nothing = day && !stops.length && !(day.other ?? []).length && !(day.emergencies ?? []).length;

  return (
    <Screen refreshing={refreshing} onRefresh={pull}>
      <Header sub={day ? fmtDay(day.date, day.day) : ' '} title={day?.me?.first_name ? `Hi, ${day.me.first_name}` : 'Today'} />
      <SyncBar day={day} />
      {day ? <ShiftCard day={day} busy={busyKey === 'shift'} onShift={onShift} /> : null}
      <GpsCard day={day} />
      <StateView loading={loading} error={error} onRetry={reload} />

      {(day?.emergencies ?? []).length > 0 && (
        <>
          <SectionTitle>Emergency pickups</SectionTitle>
          {day.emergencies.map((em) => <EmergencyCard key={em.id} em={em} busy={busyKey === `e${em.id}`} onStatus={onStatus} />)}
        </>
      )}

      {stops.length > 0 && (
        <>
          <SectionTitle right={`${doneCount} of ${stops.length} done${missedCount ? ` · ${missedCount} not collected` : ''}`}>Truck stops today</SectionTitle>
          <View style={{ flexDirection: 'row', height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
            <View style={{ width: `${(doneCount / stops.length) * 100}%`, height: 8, backgroundColor: colors.done }} />
            <View style={{ width: `${(missedCount / stops.length) * 100}%`, height: 8, backgroundColor: colors.danger }} />
          </View>
          {stops.map((s) => (
            <StopCard key={s.id} stop={s} highlight={next && s.id === next.id} busy={busyKey === `s${s.id}`}
              arrival={myArrivals[s.id]} now={now} onDone={onDone} onMissed={onMissed} onUndo={onUndo} onStandby={onStandby} />
          ))}
        </>
      )}

      {(day?.other ?? []).length > 0 && (
        <>
          <SectionTitle>Other pickups</SectionTitle>
          {day.other.map((o) => (
            <Card key={o.schedule_id}>
              <Text style={type.heading}>{o.zone}</Text>
              <Text style={[type.small, { marginTop: 2 }]}>{o.category} · {fmtRange(o.start, o.end)}</Text>
              <Button title={o.done_at ? 'Undo' : 'Mark as collected'} variant={o.done_at ? 'ghost' : 'primary'} loading={busyKey === `o${o.schedule_id}`}
                onPress={() => onOther(o)} style={{ marginTop: 12 }} />
            </Card>
          ))}
        </>
      )}

      {nothing && (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ionicons name="cafe-outline" size={30} color={colors.faint} />
          <Text style={[type.heading, { marginTop: 8 }]}>No collection for you today</Text>
          <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>
            {day.day === 'Sunday' ? 'There is no collection on Sunday.' : 'If you drive the truck today, ask your Barangay Admin to set you as the truck crew.'} Pull down to check again.
          </Text>
        </Card>
      )}

      <LoadSheet stop={loadFor} visible={Boolean(loadFor)} onClose={() => setLoadFor(null)} onPick={saveDone} />
      <MissedSheet stop={missFor} reasons={day?.missed_reasons ?? ['Blocked road', 'Truck breakdown', 'Truck full', 'Residents not ready', 'Other']}
        visible={Boolean(missFor)} onClose={() => setMissFor(null)} onSend={saveMissed} />
    </Screen>
  );
}
