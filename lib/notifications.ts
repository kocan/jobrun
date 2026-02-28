import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationType } from './types';

const PUSH_TOKEN_KEY = 'push_token';

/** Configure how notifications appear when the app is in the foreground. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Request permission and register for push notifications. Returns the Expo push token or null. */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

/** Retrieve the locally stored push token. */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/** Schedule a local notification for a payment received event. */
export async function notifyPaymentReceived(
  customerName: string,
  amount: number,
  invoiceId: string,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Payment Received',
      body: `${customerName} paid $${amount.toFixed(2)}`,
      data: { type: 'payment_received' as NotificationType, invoiceId },
    },
    trigger: null, // fire immediately
  });
}

/** Schedule a local notification for an estimate being accepted. */
export async function notifyEstimateAccepted(
  customerName: string,
  estimateId: string,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Estimate Accepted',
      body: `${customerName} accepted your estimate`,
      data: { type: 'estimate_accepted' as NotificationType, estimateId },
    },
    trigger: null,
  });
}

/** Schedule an appointment reminder notification for the day before. */
export async function scheduleAppointmentReminder(
  customerName: string,
  jobTitle: string,
  scheduledDate: string,
  jobId: string,
): Promise<string | null> {
  const appointmentDate = new Date(scheduledDate);
  const reminderDate = new Date(appointmentDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0); // 9 AM the day before

  if (reminderDate.getTime() <= Date.now()) {
    return null; // Don't schedule if reminder time has already passed
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Appointment Tomorrow',
      body: `${jobTitle} with ${customerName}`,
      data: { type: 'appointment_reminder' as NotificationType, jobId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
  });
}

/** Cancel a previously scheduled notification by its identifier. */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/** Cancel all scheduled notifications. */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
