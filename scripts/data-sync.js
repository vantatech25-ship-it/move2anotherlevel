/**
 * MOVE Sync Manager
 * Orchestrates data synchronization between KHOI API and MOVE app
 * Handles polling, caching, events, and offline support
 */

import khoi from './khoi-client.js';

// Configuration
export const MOVE_SYNC_CONFIG = {
  intervals: {
    readiness: 5 * 60 * 1000,           // 5 minutes
    heartRate: 1 * 60 * 1000,            // 1 minute (critical)
    hrv: 10 * 60 * 1000,                 // 10 minutes
    sleep: 60 * 60 * 1000,               // 1 hour (updates once per day)
    activity: 15 * 60 * 1000,            // 15 minutes
    stress: 5 * 60 * 1000,               // 5 minutes
    recovery: 10 * 60 * 1000,            // 10 minutes
    workouts: 30 * 60 * 1000,            // 30 minutes
    nutrition: 30 * 60 * 1000,           // 30 minutes
    metabolicState: 15 * 60 * 1000,      // 15 minutes
    fastingState: 10 * 60 * 1000,        // 10 minutes
    recommendations: 60 * 60 * 1000,     // 1 hour
  },
  
  enabledMetrics: {
    readiness: true,
    heartRate: true,
    hrv: true,
    sleep: true,
    activity: true,
    stress: true,
    recovery: true,
    workouts: true,
    nutrition: true,
    metabolicState: true,
    fastingState: true,
    recommendations: true,
  },
  
  retryAttempts: 3,
  retryDelay: 1000,
  maxNetworkTimeout: 15000,
};

// Sync Manager State
class SyncManager {
  constructor(config = {}) {
    this.config = { ...MOVE_SYNC_CONFIG, ...config };
    this.timers = {};
    this.lastSyncTime = {};
    this.failedMetrics = [];
    this.isPaused = false;
    this.isOnline = navigator.onLine;
    this.eventListeners = {};
    this.lastData = {};
    
    // Initialize online/offline listeners
    this._initializeConnectivityListeners();
  }
  
  /**
   * Initialize all sync timers
   */
  async initialize() {
    console.log('🔄 MOVE Sync Manager: Initializing...');
    
    try {
      // Check connectivity first
      const isConnected = await khoi.checkConnectivity();
      
      if (!isConnected) {
        console.warn('⚠️ KHOI API unreachable - offline mode');
        this.emit('sync-error', {
          metricType: 'all',
          error: 'KHOI API unreachable'
        });
        return false;
      }
      
      // Start polling for each enabled metric
      this._startPolling();
      
      this.emit('initialized', {
        timestamp: new Date(),
        config: this.config
      });
      
      console.log('✅ MOVE Sync Manager: Initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ MOVE Sync Manager: Initialization failed', error);
      this.emit('initialization-error', { error });
      return false;
    }
  }
  
  /**
   * Start polling all enabled metrics
   */
  _startPolling() {
    Object.entries(this.config.enabledMetrics).forEach(([metric, enabled]) => {
      if (enabled) {
        this._startMetricPolling(metric);
      }
    });
  }
  
  /**
   * Start polling a specific metric
   */
  _startMetricPolling(metric) {
    const interval = this.config.intervals[metric];
    
    if (!interval) {
      console.warn(`⚠️ No interval configured for: ${metric}`);
      return;
    }
    
    // Clear existing timer if any
    if (this.timers[metric]) {
      clearInterval(this.timers[metric]);
    }
    
    // Fetch immediately
    this._syncMetric(metric);
    
    // Then set up periodic polling
    this.timers[metric] = setInterval(() => {
      if (!this.isPaused && this.isOnline) {
        this._syncMetric(metric);
      }
    }, interval);
    
    console.log(`📡 Polling ${metric} every ${interval / 1000}s`);
  }
  
  /**
   * Sync a single metric from KHOI
   */
  async _syncMetric(metric) {
    if (this.isPaused || !this.isOnline) return;
    
    try {
      let data = null;
      
      // Map metrics to khoi client methods
      switch (metric) {
        case 'readiness':
          data = await khoi.getReadiness();
          break;
        case 'heartRate':
          data = await khoi.getHeartRate();
          break;
        case 'hrv':
          data = await khoi.getHRV();
          break;
        case 'sleep':
          data = await khoi.getSleep();
          break;
        case 'activity':
          data = await khoi.getActivity();
          break;
        case 'stress':
          data = await khoi.getStress();
          break;
        case 'recovery':
          data = await khoi.getRecovery();
          break;
        case 'workouts':
          data = await khoi.getWorkouts(5); // Last 5
          break;
        case 'nutrition':
          data = await khoi.getNutrition();
          break;
        case 'metabolicState':
          data = await khoi.getMetabolicState();
          break;
        case 'fastingState':
          data = await khoi.getFastingState();
          break;
        case 'recommendations':
          data = await khoi.getDailyInsights();
          break;
      }
      
      if (data) {
        this.lastData[metric] = data;
        this.lastSyncTime[metric] = new Date();
        
        // Remove from failed list if it was there
        this.failedMetrics = this.failedMetrics.filter(m => m !== metric);
        
        // Emit event
        this.emit(this._metricEventName(metric), {
          data,
          timestamp: this.lastSyncTime[metric],
          metric
        });
      }
      
    } catch (error) {
      console.error(`❌ Sync failed for ${metric}:`, error.message);
      
      // Add to failed list
      if (!this.failedMetrics.includes(metric)) {
        this.failedMetrics.push(metric);
      }
      
      // Emit error event
      this.emit('sync-error', {
        metricType: metric,
        error: error.message,
        timestamp: new Date()
      });
    }
  }
  
  /**
   * Refresh all metrics immediately
   */
  async refreshAll() {
    console.log('🔄 Refreshing all metrics...');
    khoi.clearAllCache();
    
    const metrics = Object.keys(this.config.enabledMetrics)
      .filter(m => this.config.enabledMetrics[m]);
    
    await Promise.allSettled(
      metrics.map(metric => this._syncMetric(metric))
    );
    
    console.log('✅ All metrics refreshed');
    this.emit('refresh-complete', { timestamp: new Date() });
  }
  
  /**
   * Pause syncing (e.g., when offline)
   */
  pause() {
    this.isPaused = true;
    console.log('⏸️ Sync paused');
    this.emit('paused', { timestamp: new Date() });
  }
  
  /**
   * Resume syncing
   */
  resume() {
    this.isPaused = false;
    console.log('▶️ Sync resumed');
    
    // Refresh all metrics when resuming
    this._startPolling();
    
    this.emit('resumed', { timestamp: new Date() });
  }
  
  /**
   * Stop syncing completely
   */
  stop() {
    Object.values(this.timers).forEach(timer => clearInterval(timer));
    this.timers = {};
    console.log('⛔ Sync stopped');
    this.emit('stopped', { timestamp: new Date() });
  }
  
  /**
   * Get current sync state
   */
  getState() {
    return {
      isPaused: this.isPaused,
      isOnline: this.isOnline,
      lastSyncTime: { ...this.lastSyncTime },
      failedMetrics: [...this.failedMetrics],
      activeTimers: Object.keys(this.timers).length,
      enabledMetrics: this.config.enabledMetrics,
    };
  }
  
  /**
   * Get failed metrics
   */
  getFailedMetrics() {
    return [...this.failedMetrics];
  }
  
  /**
   * Get last synced data for metric
   */
  getLastData(metric) {
    return this.lastData[metric] || null;
  }
  
  /**
   * Initialize connectivity listeners
   */
  _initializeConnectivityListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Network online');
      this.emit('connectivity-online', { timestamp: new Date() });
      
      if (!this.isPaused) {
        this.resume();
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📡 Network offline');
      this.emit('connectivity-offline', { timestamp: new Date() });
      this.pause();
    });
  }
  
  /**
   * Event system
   */
  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }
  
  emit(eventName, data) {
    if (!this.eventListeners[eventName]) return;
    
    this.eventListeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }
  
  /**
   * Convert metric name to event name
   */
  _metricEventName(metric) {
    const map = {
      readiness: 'readiness',
      heartRate: 'heart-rate',
      hrv: 'hrv',
      sleep: 'sleep',
      activity: 'activity',
      stress: 'stress',
      recovery: 'recovery',
      workouts: 'workouts',
      nutrition: 'nutrition',
      metabolicState: 'metabolic-state',
      fastingState: 'fasting-state',
      recommendations: 'recommendations',
    };
    return map[metric] || metric;
  }
}

// Global sync manager instance
const syncManager = new SyncManager();

/**
 * Initialize and start MOVE sync
 */
export async function initializeMoveSync(customConfig = {}) {
  // Merge config
  if (customConfig.intervals) {
    Object.assign(MOVE_SYNC_CONFIG.intervals, customConfig.intervals);
  }
  
  if (customConfig.enabledMetrics) {
    Object.assign(MOVE_SYNC_CONFIG.enabledMetrics, customConfig.enabledMetrics);
  }
  
  // Re-create with new config
  const newConfig = { ...MOVE_SYNC_CONFIG, ...customConfig };
  
  // Update sync manager config
  syncManager.config = newConfig;
  
  // Initialize
  return await syncManager.initialize();
}

/**
 * Usage Examples
 */

// Example 1: Basic initialization
// await initializeMoveSync();

// Example 2: Custom configuration
// await initializeMoveSync({
//   intervals: {
//     readiness: 30 * 1000,  // 30 seconds for testing
//     heartRate: 10 * 1000,
//   },
//   enabledMetrics: {
//     readiness: true,
//     heartRate: true,
//     sleep: false,  // Don't sync sleep
//   }
// });

// Example 3: Listen to updates
// syncManager.on('readiness', ({ data, timestamp }) => {
//   console.log('Readiness updated:', data.readiness_score);
// });

// Example 4: Manual refresh
// await syncManager.refreshAll();

// Example 5: Control syncing
// syncManager.pause();
// syncManager.resume();
// syncManager.stop();

// Example 6: Check state
// console.log(syncManager.getState());
// console.log(syncManager.getFailedMetrics());

export default syncManager;
