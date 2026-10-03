import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { NotificationService } from './NotificationService';

const GEOFENCE_TASK_NAME = 'GEOFENCE_EVENT_TASK';

// Define the background task (this module must be imported at app start-up, see App.js)
TaskManager.defineTask(GEOFENCE_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.log('[Geofence] Task error:', error.message);
    return;
  }
  const { eventType, region } = data || {};
  if (!region) return;

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log('[Geofence] You entered region:', region.identifier);
    NotificationService.sendLocal(
      'Cultural Event Nearby! 🎊',
      `You are near ${region.identifier}. Tap to see what's happening.`,
      { type: 'geofence_enter', regionId: region.identifier }
    );
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log('[Geofence] You left region:', region.identifier);
  }
});

class GeofenceServiceClass {
  /** @returns {Promise<boolean>} true when background geofencing is running */
  async startGeofencing(regions) {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.log('[Geofence] Foreground permission denied');
        return false;
      }
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.log('[Geofence] Background permission denied - geofencing needs "Always" location access');
        return false;
      }

      const formattedRegions = regions.map((r) => ({
        identifier: r.title,
        latitude: r.coords.latitude,
        longitude: r.coords.longitude,
        radius: r.radius || 200, // 200 meters default
        notifyOnEnter: true,
        notifyOnExit: true,
      }));
      if (formattedRegions.length === 0) return false;

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, formattedRegions);
      console.log('[Geofence] Started tracking', formattedRegions.length, 'regions');
      return true;
    } catch (e) {
      console.log('[Geofence] Start error:', e.message);
      return false;
    }
  }

  async stopGeofencing() {
    try {
      const hasTask = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      if (hasTask) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        console.log('[Geofence] Stopped');
      }
    } catch (e) {
      console.log('[Geofence] Stop error:', e.message);
    }
  }
}

export const GeofenceService = new GeofenceServiceClass();
