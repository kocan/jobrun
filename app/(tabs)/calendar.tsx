import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { useJobs } from '../../contexts/JobContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { Job, JobStatus } from '../../lib/types';
import {
  getLocalDateString,
  getWeekStart,
  getWeekDays,
  formatWeekRange,
  formatTime12,
  groupJobsByDate,
  getJobsInRange,
  timeToMinutes,
  DAY_NAMES,
} from '../../lib/dateUtils';

const STATUS_COLORS: Record<JobStatus, string> = {
  scheduled: '#3B82F6',
  'in-progress': '#F59E0B',
  completed: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  completed: 'Done',
  cancelled: 'Cancelled',
};

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

type ViewMode = 'week' | 'day';

export default function CalendarScreen() {
  const router = useRouter();
  const { jobs, loading, refreshJobs } = useJobs();
  const { customers } = useCustomers();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  const today = getLocalDateString();

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const weekJobs = useMemo(
    () => getJobsInRange(jobs, getLocalDateString(weekStart), getLocalDateString(weekEnd)),
    [jobs, weekStart, weekEnd]
  );

  const jobsByDate = useMemo(() => groupJobsByDate(weekJobs), [weekJobs]);

  const selectedDayJobs = useMemo(() => {
    const dayJobs = jobsByDate[selectedDate] || [];
    return dayJobs.sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime);
    });
  }, [jobsByDate, selectedDate]);

  const customerMap = useMemo(() => {
    const map: Record<string, string> = {};
    customers.forEach((c) => (map[c.id] = `${c.firstName} ${c.lastName}`));
    return map;
  }, [customers]);

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7 * dir);
    setCurrentDate(d);
  };

  const navigateDay = (dir: number) => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + dir);
    setSelectedDate(getLocalDateString(d));
    setCurrentDate(d);
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(getLocalDateString(now));
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
  };

  const handleJobPress = (job: Job) => {
    router.push(`/job/${job.id}`);
  };

  const handleAddJob = (date?: string) => {
    // Navigate to job creation - for now push to a new job route
    // The date pre-fill would be handled by query params
    router.push(`/job/new${date ? `?date=${date}` : ''}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* View mode toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'week' && styles.toggleActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>Week</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'day' && styles.toggleActive]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>Day</Text>
        </Pressable>
      </View>

      {/* Navigation header */}
      <View style={styles.navRow}>
        <Pressable onPress={() => (viewMode === 'week' ? navigateWeek(-1) : navigateDay(-1))} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Pressable onPress={goToday}>
          <Text style={styles.navTitle}>
            {viewMode === 'week'
              ? formatWeekRange(weekStart)
              : formatDayHeader(selectedDate)}
          </Text>
        </Pressable>
        <Pressable onPress={() => (viewMode === 'week' ? navigateWeek(1) : navigateDay(1))} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {selectedDate !== today && (
        <Pressable onPress={goToday} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      )}

      {viewMode === 'week' ? (
        <ScrollView
          style={styles.flex}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshJobs} />}
        >
          {/* Week day headers */}
          <View style={styles.weekRow}>
            {weekDays.map((d, i) => {
              const dateStr = getLocalDateString(d);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const jobCount = (jobsByDate[dateStr] || []).length;
              return (
                <Pressable
                  key={i}
                  style={[styles.dayCol, isSelected && styles.dayColSelected]}
                  onPress={() => handleDayPress(dateStr)}
                >
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{DAY_NAMES[i]}</Text>
                  <View style={[styles.dayCircle, isToday && styles.dayCircleToday, isSelected && styles.dayCircleSelected]}>
                    <Text style={[styles.dayNum, (isToday || isSelected) && styles.dayNumHighlight]}>
                      {d.getDate()}
                    </Text>
                  </View>
                  {jobCount > 0 && (
                    <View style={styles.jobDot}>
                      <Text style={styles.jobDotText}>{jobCount}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Selected day's jobs */}
          <View style={styles.dayJobsList}>
            <Text style={styles.dayJobsHeader}>
              {formatDayHeader(selectedDate)} · {selectedDayJobs.length} job{selectedDayJobs.length !== 1 ? 's' : ''}
            </Text>
            {selectedDayJobs.length === 0 ? (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayIcon}>📅</Text>
                <Text style={styles.emptyDayTitle}>No jobs scheduled</Text>
                <Text style={styles.emptyDaySubtitle}>This day is free — tap + to add a job.</Text>
              </View>
            ) : (
              selectedDayJobs.map((job) => (
                <JobCard key={job.id} job={job} customerName={customerMap[job.customerId]} onPress={handleJobPress} />
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        /* Day view - timeline */
        <ScrollView
          style={styles.flex}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshJobs} />}
        >
          <View style={styles.timeline}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </Text>
                <View style={styles.timeSlotLine} />
              </View>
            ))}
            {/* Job blocks */}
            {selectedDayJobs.map((job) => {
              if (!job.scheduledTime) return null;
              const mins = timeToMinutes(job.scheduledTime);
              const top = (mins - START_HOUR * 60) * (HOUR_HEIGHT / 60);
              const height = Math.max((job.estimatedDuration || 60) * (HOUR_HEIGHT / 60), 30);
              const color = STATUS_COLORS[job.status];
              return (
                <Pressable
                  key={job.id}
                  style={[styles.timeBlock, { top, height, borderLeftColor: color, backgroundColor: color + '18' }]}
                  onPress={() => handleJobPress(job)}
                >
                  <Text style={styles.timeBlockTime}>
                    {formatTime12(job.scheduledTime)}
                  </Text>
                  <Text style={styles.timeBlockTitle} numberOfLines={1}>
                    {customerMap[job.customerId] || 'Unknown'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: color }]}>
                    <Text style={styles.statusBadgeText}>{STATUS_LABELS[job.status]}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => handleAddJob(selectedDate)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function JobCard({ job, customerName, onPress }: { job: Job; customerName?: string; onPress: (j: Job) => void }) {
  const color = STATUS_COLORS[job.status];
  return (
    <Pressable style={[styles.jobCard, { borderLeftColor: color }]} onPress={() => onPress(job)}>
      <View style={styles.jobCardHeader}>
        <Text style={styles.jobCardTime}>
          {job.scheduledTime ? formatTime12(job.scheduledTime) : 'No time'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: color }]}>
          <Text style={styles.statusBadgeText}>{STATUS_LABELS[job.status]}</Text>
        </View>
      </View>
      <Text style={styles.jobCardCustomer} numberOfLines={1}>
        {customerName || 'Unknown Customer'}
      </Text>
      {job.total > 0 && <Text style={styles.jobCardAmount}>${job.total.toFixed(2)}</Text>}
    </Pressable>
  );
}

function formatDayHeader(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, gap: 4 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  toggleActive: { backgroundColor: '#EA580C' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#666' },
  toggleTextActive: { color: '#fff' },

  // Nav
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 12 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 28, color: '#EA580C', fontWeight: '300' },
  navTitle: { fontSize: 16, fontWeight: '600', color: '#111' },

  todayBtn: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FFF7ED', marginBottom: 4 },
  todayBtnText: { fontSize: 13, color: '#EA580C', fontWeight: '600' },

  // Week row
  weekRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
  dayColSelected: { backgroundColor: '#FFF7ED' },
  dayName: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4 },
  dayNameToday: { color: '#EA580C' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleToday: { backgroundColor: '#EA580C' },
  dayCircleSelected: { borderWidth: 2, borderColor: '#EA580C' },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#333' },
  dayNumHighlight: { color: '#fff' },
  jobDot: { marginTop: 2, backgroundColor: '#EA580C', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  jobDotText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // Day jobs list (week view expanded)
  dayJobsList: { padding: 16 },
  dayJobsHeader: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 24 },
  emptyDay: { alignItems: 'center', paddingVertical: 32 },
  emptyDayIcon: { fontSize: 36, marginBottom: 8 },
  emptyDayTitle: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 4 },
  emptyDaySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },

  // Job card
  jobCard: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4 },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  jobCardTime: { fontSize: 13, fontWeight: '600', color: '#555' },
  jobCardCustomer: { fontSize: 15, fontWeight: '600', color: '#111' },
  jobCardAmount: { fontSize: 13, color: '#666', marginTop: 2 },

  // Status badge
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  // Timeline (day view)
  timeline: { position: 'relative', paddingLeft: 56, minHeight: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT },
  timeSlot: { height: HOUR_HEIGHT, flexDirection: 'row', alignItems: 'flex-start' },
  timeLabel: { position: 'absolute', left: -52, width: 48, fontSize: 11, color: '#999', textAlign: 'right', top: -6 },
  timeSlotLine: { flex: 1, borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 0 },
  timeBlock: { position: 'absolute', left: 60, right: 16, borderLeftWidth: 4, borderRadius: 6, padding: 6, overflow: 'hidden' },
  timeBlockTime: { fontSize: 11, fontWeight: '600', color: '#555' },
  timeBlockTitle: { fontSize: 13, fontWeight: '600', color: '#111' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
});
