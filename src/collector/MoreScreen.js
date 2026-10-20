// Collector app: the "More" tab (announcements, my history, account).
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui';
import { colors, radius, type } from '../theme';
import { Header } from './parts';
import { useCollectorServices } from './CollectorServices';

function Row({ icon, title, sub, badge, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 10, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={type.heading}>{title}</Text>
        {sub ? <Text style={type.small}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, marginRight: 6 }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={22} color={colors.faint} />
    </Pressable>
  );
}

export default function MoreScreen({ navigation }) {
  const { unread, pushNote, retryPush } = useCollectorServices();
  return (
    <Screen>
      <Header title="More" />
      <Row icon="megaphone-outline" title="Announcements" sub="From your barangay" badge={unread || null} onPress={() => navigation.navigate('Announcements')} />
      <Row icon="time-outline" title="My history" sub="Stops, emergencies and shifts, last 14 days" onPress={() => navigation.navigate('History')} />
      <Row icon="person-circle-outline" title="Account" sub="Truck, password, log out" onPress={() => navigation.navigate('Account')} />
      <View style={{ flexDirection: 'row', backgroundColor: pushNote ? colors.amberLight : colors.doneLight, borderRadius: radius.md, padding: 12, marginTop: 6 }}>
        <Ionicons name={pushNote ? 'notifications-off-outline' : 'notifications-outline'} size={20} color={pushNote ? colors.amber : colors.done} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text }}>
            {pushNote || 'Notifications are on: new or changed emergency pickups, stop time changes and announcements.'}
          </Text>
          {pushNote ? <Pressable onPress={retryPush} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Try again</Text></Pressable> : null}
        </View>
      </View>
    </Screen>
  );
}
