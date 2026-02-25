import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { useJobs } from '../../contexts/JobContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useInvoices } from '../../contexts/InvoiceContext';
import { Job, JobStatus } from '../../lib/types';
import { getLocalDateString, getTomorrowDateString, getWeekStart, computeStats } from '../../lib/dateUtils';
import { theme } from '../../lib/theme';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

const STATUS_COLORS: Record<JobStatus, string> = {
  scheduled: theme.colors.status.scheduled,
  'in-progress': theme.colors.status.inProgress,
  completed: theme.colors.status.completed,
  cancelled: theme.colors.gray400,
};

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(time?: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatEndTime(time?: string, durationMin?: number): string {
  if (!time || !durationMin) return '';
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + durationMin;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  const ampm = endH >= 12 ? 'PM' : 'AM';
  const hour = endH % 12 || 12;
  return `${hour}:${endM.toString().padStart(2, '0')} ${ampm}`;
}

export default function TodayScreen() {
  const router = useRouter();
  const { jobs, loading, refreshJobs, updateJob } = useJobs();
  const { customers } = useCustomers();
  const [refreshing, setRefreshing] = useState(false);
  const [tomorrowExpanded, setTomorrowExpanded] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { invoices } = useInvoices();

  const today = getLocalDateString();
  const tomorrow = getTomorrowDateString();
  const customerMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const customer of customers) {
      map[customer.id] = `${customer.firstName} ${customer.lastName}`.trim();
    }
    return map;
  }, [customers]);

  const todayJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.scheduledDate === today)
        .sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '')),
    [jobs, today]
  );

  const tomorrowJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.scheduledDate === tomorrow)
        .sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '')),
    [jobs, tomorrow]
  );

  const stats = useMemo(() => computeStats(todayJobs), [todayJobs]);

  const dashboard = useMemo(() => {
    const now = new Date();
    const thisWeekStart = getLocalDateString(getWeekStart(now));
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekStart = getLocalDateString(getWeekStart(lastWeekDate));
    const lastWeekEnd = getLocalDateString(new Date(getWeekStart(lastWeekDate).getTime() + 6 * 86400000));

    // Revenue this week from paid invoices
    const thisWeekRevenue = invoices
      .filter((i) => i.status === 'paid' && i.paidAt && i.paidAt.slice(0, 10) >= thisWeekStart && i.paidAt.slice(0, 10) <= today)
      .reduce((sum, i) => sum + i.total, 0);

    const lastWeekRevenue = invoices
      .filter((i) => i.status === 'paid' && i.paidAt && i.paidAt.slice(0, 10) >= lastWeekStart && i.paidAt.slice(0, 10) <= lastWeekEnd)
      .reduce((sum, i) => sum + i.total, 0);

    const trend = lastWeekRevenue > 0
      ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
      : thisWeekRevenue > 0 ? 100 : 0;

    // Outstanding invoices (sent, viewed, overdue)
    const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue');
    const outstandingTotal = outstanding.reduce((sum, i) => sum + i.total, 0);

    return { thisWeekRevenue, trend, outstandingCount: outstanding.length, outstandingTotal };
  }, [invoices, today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshJobs();
    } catch {
      setRefreshError('Unable to refresh jobs right now.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshJobs]);

  const handleQuickAction = useCallback(
    async (job: Job) => {
      if (job.status === 'scheduled') {
        await updateJob(job.id, { status: 'in-progress' });
      } else if (job.status === 'in-progress') {
        await updateJob(job.id, { status: 'completed' });
      }
    },
    [updateJob]
  );

  const renderJobCard = (job: Job) => {
    const customerName = customerMap[job.customerId] || 'Unknown Customer';
    const address = job.address;
    const timeStr = formatTime(job.scheduledTime);
    const endStr = formatEndTime(job.scheduledTime, job.estimatedDuration);
    const timeRange = endStr ? `${timeStr} — ${endStr}` : timeStr;

    const canAct = job.status === 'scheduled' || job.status === 'in-progress';
    const actionLabel = job.status === 'scheduled' ? 'Start Job' : 'Complete Job';

    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
        key={job.id}
        style={styles.card}
        onPress={() => router.push(`/job/${job.id}`)}
      >
        <View style={styles.cardHeader}>
          {timeRange ? <Text style={styles.cardTime}>{timeRange}</Text> : null}
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[job.status] }]}>
            <Text style={styles.badgeText}>{STATUS_LABELS[job.status]}</Text>
          </View>
        </View>
        <Text style={styles.cardCustomer}>{customerName}</Text>
        {address ? <Text style={styles.cardAddress}>{address}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardAmount}>${job.total.toFixed(2)}</Text>
          {canAct && (
            <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
              style={[styles.actionBtn, { backgroundColor: STATUS_COLORS[job.status === 'scheduled' ? 'in-progress' : 'completed'] }]}
              onPress={() => handleQuickAction(job)}
            >
              <Text style={styles.actionBtnText}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const renderTomorrowSection = () => {
    if (tomorrowJobs.length === 0) return null;
    const preview = tomorrowExpanded ? tomorrowJobs : tomorrowJobs.slice(0, 3);
    return (
      <View style={styles.tomorrowSection}>
        <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
          style={styles.tomorrowHeader}
          onPress={() => setTomorrowExpanded(!tomorrowExpanded)}
        >
          <Text style={styles.tomorrowTitle}>
            Tomorrow · {tomorrowJobs.length} job{tomorrowJobs.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.chevron}>{tomorrowExpanded ? '▲' : '▼'}</Text>
        </Pressable>
        {preview.map((job) => (
          <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
            key={job.id}
            style={styles.tomorrowCard}
            onPress={() => router.push(`/job/${job.id}`)}
          >
            <Text style={styles.tomorrowTime}>{formatTime(job.scheduledTime)}</Text>
            <Text style={styles.tomorrowName} numberOfLines={1}>{customerMap[job.customerId] || 'Unknown'}</Text>
            <Text style={styles.tomorrowAmount}>${job.total.toFixed(2)}</Text>
          </Pressable>
        ))}
        {!tomorrowExpanded && tomorrowJobs.length > 3 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Show more tomorrow jobs" onPress={() => setTomorrowExpanded(true)}>
            <Text style={styles.showMore}>+{tomorrowJobs.length - 3} more</Text>
          </Pressable>
        )}
      </View>
    );
  };

  if (loading && jobs.length === 0) {
    return <LoadingState message="Loading today’s jobs..." accessibilityLabel="Loading today's jobs" />;
  }

  const trendColor = dashboard.trend > 0 ? '#10B981' : dashboard.trend < 0 ? '#EF4444' : theme.colors.gray400;
  const trendLabel = dashboard.trend > 0 ? `+${dashboard.trend}%` : dashboard.trend < 0 ? `${dashboard.trend}%` : '—';

  const header = (
    <>
      <Text style={styles.dateHeader}>{formatDateHeader(today)}</Text>
      {/* Today's quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Jobs Today</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>${stats.revenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Today Rev.</Text>
        </View>
      </View>
      {/* Weekly dashboard */}
      <View style={styles.dashboardRow}>
        <View style={styles.dashCard}>
          <Text style={styles.dashValue}>${dashboard.thisWeekRevenue.toFixed(0)}</Text>
          <Text style={styles.dashLabel}>This Week</Text>
          <Text style={[styles.dashTrend, { color: trendColor }]}>{trendLabel} vs last</Text>
        </View>
        <View style={styles.dashCard}>
          <Text style={styles.dashValue}>{dashboard.outstandingCount}</Text>
          <Text style={styles.dashLabel}>Outstanding</Text>
          <Text style={styles.dashSub}>${dashboard.outstandingTotal.toFixed(0)} owed</Text>
        </View>
      </View>
    </>
  );

  const footer = (
    <>
      {renderTomorrowSection()}
      <View style={{ height: 80 }} />
    </>
  );

  return (
    <View style={styles.container}>
      {todayJobs.length === 0 ? (
        <View style={styles.centered}>
          {header}
          {refreshError ? (
            <ErrorState
              message={refreshError}
              retryLabel="Retry refresh"
              onRetry={onRefresh}
            />
          ) : (
            <EmptyState
              icon="📭"
              title="No jobs scheduled for today"
              subtitle="Your day is wide open — schedule a job to get started."
              ctaLabel="+ Schedule a Job"
              onPressCta={() => router.push(`/job/new?scheduledDate=${today}`)}
            />
          )}
          {renderTomorrowSection()}
        </View>
      ) : (
        <FlatList
          data={todayJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderJobCard(item)}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        />
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Activate action"
        style={styles.fab}
        onPress={() => router.push(`/job/new?scheduledDate=${today}`)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  list: { padding: 16 },
  dateHeader: { fontSize: 26, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTime: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: theme.colors.white, fontSize: 11, fontWeight: '600' },
  cardCustomer: { fontSize: 17, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  cardAddress: { fontSize: 13, color: theme.colors.gray400, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  actionBtnText: { color: theme.colors.white, fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabText: { color: theme.colors.white, fontSize: 28, fontWeight: '300', marginTop: -2 },
  tomorrowSection: { marginTop: 20 },
  tomorrowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tomorrowTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.gray700 },
  chevron: { fontSize: 14, color: theme.colors.gray400 },
  tomorrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  tomorrowTime: { fontSize: 13, color: theme.colors.gray400, width: 70 },
  tomorrowName: { flex: 1, fontSize: 15, color: theme.colors.gray700 },
  tomorrowAmount: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  showMore: { textAlign: 'center', color: theme.colors.primary, fontSize: 14, fontWeight: '500', marginTop: 4 },

  // Dashboard
  dashboardRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dashCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dashValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  dashLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  dashTrend: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  dashSub: { fontSize: 12, color: theme.colors.gray400, marginTop: 4 },
});
