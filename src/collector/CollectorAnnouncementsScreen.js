// Collector app: announcements from the barangay (read-only).
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { getAnnouncements } from '../data/collector';
import { useApi } from '../hooks';
import { Card, Screen, StateView } from '../components/ui';
import { type } from '../theme';
import { fmtDateTime } from '../utils/schedule';
import { useCollectorServices } from './CollectorServices';

export default function CollectorAnnouncementsScreen() {
  const { data, error, loading, refreshing, reload, pull } = useApi(getAnnouncements);
  const { markRead } = useCollectorServices();
  useEffect(() => {
    if (data?.length) markRead(Math.max(...data.map((a) => a.announcement_id)));
  }, [data, markRead]);
  return (
    <Screen refreshing={refreshing} onRefresh={pull} style={{ paddingTop: 12 }}>
      <StateView loading={loading} error={error} onRetry={reload}
        empty={data && data.length === 0} emptyTitle="No announcements" emptyText="Announcements from your barangay appear here." />
      {(data ?? []).map((a) => (
        <Card key={a.announcement_id}>
          <Text style={type.heading}>{a.title}</Text>
          <Text style={[type.small, { marginTop: 2, marginBottom: 8 }]}>
            {fmtDateTime(a.published_timestamp)}{a.expiry_date ? ` · until ${a.expiry_date}` : ''}
          </Text>
          <Text style={type.body}>{a.content}</Text>
        </Card>
      ))}
    </Screen>
  );
}
