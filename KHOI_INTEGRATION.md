# KHOI API Integration Guide

Complete reference for integrating KHOI biometric API into MOVE Elite 3.0 ecosystem.

**Status:** ✅ Production Ready
**Last Updated:** May 2026
**Version:** 3.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [API Methods Reference](#api-methods-reference)
4. [Per-Hub Integration](#per-hub-integration)
5. [Event System](#event-system)
6. [Configuration](#configuration)
7. [Error Handling](#error-handling)
8. [Performance Tips](#performance-tips)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Setup

```bash
# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Edit .env with your KHOI credentials
VITE_KHOI_API_URL=https://api.khoi.com/api/v1
VITE_KHOI_API_KEY=your_key_here
VITE_KHOI_USER_ID=your_id_here
```

### 2. Basic Usage

```javascript
import khoi from './scripts/khoi-client.js';
import { initializeMoveSync } from './scripts/data-sync.js';

// Start syncing
await initializeMoveSync();

// Or get data manually
const readiness = await khoi.getReadiness();
console.log('Today readiness:', readiness);
```

### 3. Deploy

```bash
git add .
git commit -m "Add KHOI integration"
git push origin main

# Add env vars to Vercel Dashboard and redeploy
```

---

## Architecture

### File Structure

```
move2anotherlevel/
├── scripts/
│   ├── main.js                 # Main app logic + KHOI init
│   ├── khoi-client.js          # KHOI API wrapper (50+ methods)
│   ├── data-sync.js            # Sync orchestration (polling, events)
│   └── ar_hologram.js          # Existing hologram code
├── styles/
│   └── main.css                # Existing styles
├── index.html                  # App markup
├── vercel.json                 # Deployment config
├── .env.example                # Setup template
└── .env                        # ⚠️ Your credentials (gitignored)
```

### Data Flow

```
KHOI API
    ↓
khoi-client.js (cache layer)
    ↓
data-sync.js (polling + events)
    ↓
main.js (event listeners)
    ↓
UI Components (update DOM)
```

### Caching Strategy

- **Cache TTL:** 5 minutes
- **Critical metrics:** Heart rate refreshes every 1 minute (bypasses cache)
- **Non-critical:** Sleep, nutrition refresh every 30 minutes
- **Manual refresh:** Use `syncManager.refreshAll()`

---

## API Methods Reference

### Authentication

```javascript
// Authenticate with API key
await khoi.authenticate();

// Check connectivity
const isConnected = await khoi.checkConnectivity();

// Get user profile
const profile = await khoi.getUserProfile();
```

### Readiness & Wellness

```javascript
// Main readiness score (composite: HRV + Sleep + Activity)
const readiness = await khoi.getReadiness(date);
// Returns: { readiness_score, status, hrv_score, sleep_score, activity_score }

// Heart rate variability (stress indicator)
const hrv = await khoi.getHRV(timeframe);
// Params: '24h', '7d', '30d'
// Returns: { hrv, unit: 'ms', status }

// Current heart rate
const hr = await khoi.getHeartRate();
// Returns: { bpm, status }

// Blood oxygen
const spo2 = await khoi.getSpO2();
// Returns: { spo2, unit: '%' }

// VO2 Max (cardiovascular fitness)
const vo2 = await khoi.getVO2Max();
// Returns: { vo2_max, unit: 'ml/kg/min', category }

// Activity score
const activity = await khoi.getActivity(date);
// Returns: { steps, calories, active_minutes }

// Sleep data
const sleep = await khoi.getSleep();
// Returns: { duration, quality, deep_sleep, light_sleep, rem_sleep }
```

### Stress & Recovery

```javascript
// Current stress level
const stress = await khoi.getStress();
// Returns: { level, cortisol_index, trend }

// Recovery status
const recovery = await khoi.getRecovery();
// Returns: { recovery_index, status, rhr }

// Training load
const load = await khoi.getTrainingLoad();
// Returns: { load, rhr, recovery_index }

// Neural resilience
const resilience = await khoi.getNeuralResilience(timeframe);
// Returns: { resilience_score, trend }
```

### Workouts

```javascript
// Get recent workouts
const workouts = await khoi.getWorkouts(limit, offset);
// Returns: { workouts: [...], total }

// Get specific workout
const workout = await khoi.getWorkout(workoutId);

// Get swim workouts
const swims = await khoi.getSwimWorkouts(limit);
// Returns: { workouts: [{ duration, laps, swolf, avg_hr, ... }] }

// Get run workouts
const runs = await khoi.getRunWorkouts(limit);
// Returns: { workouts: [{ distance, pace, cadence, elevation, hr_zones, ... }] }

// Log a workout
await khoi.logWorkout({
  type: 'swim',
  duration: 3600,
  laps: 12,
  swolf: 38,
  avg_hr: 142,
  calories: 450
});
```

### Nutrition & Metabolism

```javascript
// Daily nutrition data
const nutrition = await khoi.getNutrition(date);
// Returns: { calories, protein, carbs, fat, micronutrients }

// Metabolic state
const metabolic = await khoi.getMetabolicState();
// Returns: { state: 'fed'|'fasting'|'ketogenic', flexibility }

// Current fasting window
const fasting = await khoi.getFastingState();
// Returns: { fasting_hours, state, next_eating_window }

// Supplement recommendations
const supplements = await khoi.getSupplementRecommendations();
// Returns: { recommendations: [{ name, dosage, timing, reason }] }
```

### Recommendations

```javascript
// Personalized workout recommendation
const workout = await khoi.getWorkoutRecommendations();
// Returns: { recommended_type, intensity, duration, reason }

// Optimal focus windows for today
const focus = await khoi.getFocusWindows();
// Returns: { windows: [{ start, end, quality }] }

// Daily insights
const insights = await khoi.getDailyInsights();
// Returns: { insights: [...] }
```

### Devices & Wearables

```javascript
// Get connected devices
const devices = await khoi.getDevices();
// Returns: { devices: [{ id, type, name, last_sync, ... }] }

// Connect a device
await khoi.connectDevice('oura_ring', {
  auth_token: 'xxx',
  device_id: 'xxx'
});
```

### Utilities

```javascript
// Calculate MOVE INDEX (0-100)
const score = khoi.calculateMoveIndex(readiness);
// Uses: HRV (30%) + Sleep (30%) + Activity (40%)

// Get readiness label
const label = khoi.getReadinessStatus(score);
// Returns: 'ELITE', 'GOOD', 'FAIR', or 'LOW'

// Clear cache
khoi.clearCache('readiness');
khoi.clearAllCache();

// Refresh all metrics
const allData = await khoi.refreshAllMetrics();
```

---

## Per-Hub Integration

### READINESS Hub (Primary Integration)

```javascript
import syncManager from './scripts/data-sync.js';
import khoi from './scripts/khoi-client.js';

// Listen for readiness updates
syncManager.on('readiness', ({ data }) => {
  if (!data) return;
  
  // Update MOVE INDEX (main score)
  const moveIndex = khoi.calculateMoveIndex(data);
  const el = document.getElementById('readiness-val');
  if (el) {
    el.textContent = moveIndex;
    el.style.animation = 'pulse 0.5s ease-out';
  }
  
  // Update status label
  const statusEl = document.querySelector('.readiness-label');
  if (statusEl) {
    const status = khoi.getReadinessStatus(moveIndex);
    statusEl.textContent = status;
    statusEl.style.color = getStatusColor(status);
  }
  
  // Update circular rings with actual values
  updateRing('hrv', data.hrv_score);
  updateRing('sleep', data.sleep_score);
  updateRing('activity', data.activity_score);
  
  console.log(`📊 Readiness updated: ${moveIndex} (${status})`);
});

function updateRing(ringName, score) {
  const ring = document.getElementById(`ring-${ringName}`);
  if (!ring) return;
  
  const circumference = { hrv: 282.7, sleep: 232.5, activity: 182.2 }[ringName];
  const offset = circumference - (score * circumference);
  ring.style.strokeDashoffset = offset;
}

function getStatusColor(status) {
  const colors = {
    ELITE: '#00ff00',
    GOOD: '#0071e3',
    FAIR: '#ffd60a',
    LOW: '#ff0033'
  };
  return colors[status] || '#fff';
}
```

**Update Frequency:** Every 5 minutes
**Fallback:** Uses mock data if KHOI unreachable

---

### FUEL Hub (Nutrition Integration)

```javascript
// Listen for nutrition updates
syncManager.on('nutrition', ({ data }) => {
  if (!data) return;
  
  // Update macros
  document.getElementById('val-protein').textContent = 
    Math.round(data.protein);
  document.getElementById('val-carbs').textContent = 
    Math.round(data.carbs);
  document.getElementById('val-fat').textContent = 
    Math.round(data.fat);
  
  // Update total calories
  const caloriesEl = document.querySelector('[data-calories]');
  if (caloriesEl) {
    caloriesEl.textContent = `${Math.round(data.calories)} KCAL`;
  }
  
  // Update macro rings (visual)
  updateMacroRings(data);
});

// Listen for metabolic state
syncManager.on('metabolic-state', ({ data }) => {
  const state = document.querySelector('[data-metabolic-state]');
  if (state) {
    state.textContent = data.state.toUpperCase();
    state.style.color = data.state === 'ketogenic' ? '#00ff00' : '#0071e3';
  }
});

// Listen for fasting window
syncManager.on('fasting-state', ({ data }) => {
  const timeEl = document.querySelector('.protocol-time');
  if (timeEl) {
    timeEl.textContent = formatFastingTime(data.fasting_hours);
  }
});

function updateMacroRings(nutrition) {
  const total = nutrition.protein + nutrition.carbs + nutrition.fat;
  const proteinPct = (nutrition.protein / total) * 100;
  const carbsPct = (nutrition.carbs / total) * 100;
  const fatPct = (nutrition.fat / total) * 100;
  
  // Update CSS or SVG circles with percentages
  document.documentElement.style.setProperty(
    '--protein-pct', `${proteinPct}`
  );
}

function formatFastingTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}
```

**Update Frequency:** Every 30 minutes
**Real-time:** Fasting window every 10 minutes

---

### NEURAL Hub (Stress & Recovery)

```javascript
// Listen for stress updates
syncManager.on('stress', ({ data }) => {
  const scoreEl = document.getElementById('neural-coherence-val');
  if (scoreEl) {
    // Map cortisol to coherence (inverse relationship)
    const coherence = Math.round((1 - data.cortisol_index) * 100);
    scoreEl.textContent = coherence;
    
    // Update visual indicator
    updateCoherenceIndicator(coherence);
  }
});

// Listen for recovery status
syncManager.on('recovery', ({ data }) => {
  const recoveryEl = document.querySelector('[data-recovery-status]');
  if (recoveryEl) {
    recoveryEl.textContent = data.status.toUpperCase();
    recoveryEl.style.opacity = data.recovery_index / 100;
  }
});

function updateCoherenceIndicator(score) {
  const indicator = document.querySelector('.neural-label');
  if (indicator) {
    if (score >= 80) indicator.textContent = 'OPTIMAL';
    else if (score >= 60) indicator.textContent = 'GOOD';
    else if (score >= 40) indicator.textContent = 'FAIR';
    else indicator.textContent = 'STRESSED';
  }
}
```

**Update Frequency:** Every 5 minutes for stress, 10 minutes for recovery

---

### TRAINING Hub (Workouts Integration)

```javascript
import khoi from './scripts/khoi-client.js';

// Fetch and display recent workouts
async function loadRecentWorkouts() {
  const workouts = await khoi.getWorkouts(5);
  
  if (workouts.workouts.length === 0) return;
  
  const recentWorkout = workouts.workouts[0];
  
  if (recentWorkout.type === 'swim') {
    displaySwimWorkout(recentWorkout);
  } else if (recentWorkout.type === 'run') {
    displayRunWorkout(recentWorkout);
  }
}

function displaySwimWorkout(workout) {
  document.getElementById('swim-laps').textContent = workout.laps;
  document.getElementById('swim-swolf').textContent = 
    Math.round(workout.swolf);
  document.getElementById('swim-time').textContent = 
    formatDuration(workout.duration);
  
  document.querySelector('[data-recent-swim]').innerHTML = `
    <span>${workout.laps} laps</span>
    <span>${workout.swolf} SWOLF</span>
    <span>Avg HR: ${Math.round(workout.avg_hr)} BPM</span>
  `;
}

function displayRunWorkout(workout) {
  document.getElementById('run-speed').textContent = 
    (workout.distance / (workout.duration / 3600)).toFixed(1);
  document.getElementById('run-cadence').textContent = 
    Math.round(workout.cadence);
  document.getElementById('run-ele-gain').textContent = 
    `+${Math.round(workout.elevation)}m`;
}

// Log completed workout
async function saveWorkout(workoutData) {
  try {
    const result = await khoi.logWorkout({
      type: 'swim',
      duration: workoutData.timeInSeconds,
      laps: workoutData.laps,
      swolf: workoutData.swolf,
      avg_hr: workoutData.avgHeartRate,
      calories: workoutData.caloriesBurned
    });
    
    console.log('✅ Workout saved to KHOI:', result);
  } catch (error) {
    console.error('❌ Failed to save workout:', error);
  }
}

// Listen for recommendations
syncManager.on('workout-recommendations', ({ data }) => {
  const recommendedType = document.querySelector('[data-recommended-workout]');
  if (recommendedType) {
    recommendedType.textContent = `${data.recommended_type} • ${data.intensity}`;
  }
});
```

**Update Frequency:** Workouts every 30 minutes, recommendations hourly

---

### IDENTITY Hub (Device Sync)

```javascript
// Update device sync status
async function updateDeviceSync() {
  const devices = await khoi.getDevices();
  
  const khoiSyncEl = document.querySelector('[data-khoi-sync]');
  if (khoiSyncEl) {
    if (devices.devices.length > 0) {
      khoiSyncEl.classList.add('linked');
      khoiSyncEl.querySelector('.sync-status').textContent = 'LINKED';
    } else {
      khoiSyncEl.classList.remove('linked');
      khoiSyncEl.querySelector('.sync-status').textContent = 'CONNECTING...';
    }
  }
  
  // List all connected devices
  const devicesList = document.querySelector('[data-devices-list]');
  if (devicesList) {
    devicesList.innerHTML = devices.devices
      .map(device => `
        <div class="device-item">
          <span>${device.type}</span>
          <span class="sync-time">Last sync: ${formatTime(device.last_sync)}</span>
        </div>
      `)
      .join('');
  }
}
```

---

## Event System

### Listening to Updates

```javascript
import syncManager from './scripts/data-sync.js';

// Readiness score updates
syncManager.on('readiness', ({ data, timestamp }) => {
  console.log('New readiness:', data.readiness_score);
});

// Heart rate (real-time)
syncManager.on('heart-rate', ({ data }) => {
  console.log('Current BPM:', data.bpm);
});

// HRV (stress marker)
syncManager.on('hrv', ({ data }) => {
  console.log('HRV:', data.hrv, data.unit);
});

// Sleep data
syncManager.on('sleep', ({ data }) => {
  console.log('Last night:', data.duration, 'minutes');
});

// Activity rings
syncManager.on('activity', ({ data }) => {
  console.log('Steps:', data.steps);
});

// Stress level
syncManager.on('stress', ({ data }) => {
  console.log('Stress:', data.level);
});

// Recovery
syncManager.on('recovery', ({ data }) => {
  console.log('Recovery index:', data.recovery_index);
});

// Workouts
syncManager.on('workouts', ({ data }) => {
  console.log('Recent workouts:', data.workouts.length);
});

// Nutrition
syncManager.on('nutrition', ({ data }) => {
  console.log('Today calories:', data.calories);
});

// Error handling
syncManager.on('sync-error', ({ metricType, error }) => {
  console.error(`Failed to sync ${metricType}:`, error);
});

// Connectivity
syncManager.on('connectivity-online', () => {
  console.log('Back online!');
});

syncManager.on('connectivity-offline', () => {
  console.log('Network offline');
});

// Sync lifecycle
syncManager.on('initialized', () => {
  console.log('Sync started');
});

syncManager.on('paused', () => {
  console.log('Sync paused');
});

syncManager.on('resumed', () => {
  console.log('Sync resumed');
});

syncManager.on('stopped', () => {
  console.log('Sync stopped');
});
```

### Event Names

```
readiness, heart-rate, hrv, sleep, activity, stress, recovery, 
workouts, nutrition, recommendations, metabolic-state, fasting-state,
sync-error, connectivity-online, connectivity-offline, 
initialized, paused, resumed, stopped
```

---

## Configuration

### Custom Sync Intervals

```javascript
import { initializeMoveSync, MOVE_SYNC_CONFIG } from './scripts/data-sync.js';

// Faster syncing for testing
await initializeMoveSync({
  intervals: {
    readiness: 30 * 1000,      // 30 seconds instead of 5 minutes
    heartRate: 10 * 1000,      // 10 seconds instead of 1 minute
    stress: 30 * 1000,         // 30 seconds
    ...MOVE_SYNC_CONFIG.intervals
  },
  enabledMetrics: {
    readiness: true,
    heartRate: true,
    stress: true,
    // disable others for testing
    sleep: false,
    activity: false,
    recovery: false
  }
});
```

### Control Syncing

```javascript
import syncManager from './scripts/data-sync.js';

// Pause all syncing
syncManager.pause();

// Resume syncing
syncManager.resume();

// Force full refresh
await syncManager.refreshAll();

// Stop completely
syncManager.stop();

// Get current state
const state = syncManager.getState();
console.log('Syncing:', !state.isPaused);
console.log('Last sync times:', state.lastSyncTime);
console.log('Failed metrics:', state.failedMetrics);
```

---

## Error Handling

### Graceful Degradation

```javascript
// All methods have fallback data
// If KHOI is unreachable, app uses mock data

try {
  const readiness = await khoi.getReadiness();
  if (!readiness) {
    console.warn('Using mock readiness data');
    // App automatically shows cached/mock data
  }
} catch (error) {
  console.error('KHOI error:', error);
  // UI shows last known values or defaults
}
```

### Retry Logic

- Automatic retry: 3 attempts with exponential backoff
- Configurable: `retryAttempts`, `retryDelay`
- Failed metrics added to `syncManager.getFailedMetrics()`

### Debugging

```javascript
// Enable detailed logging
localStorage.debug = 'khoi:*';

// Check sync health
console.log(syncManager.getFailedMetrics());

// Verify API connectivity
const isConnected = await khoi.checkConnectivity();
console.log('KHOI Connected:', isConnected);

// Check config
console.log(khoi.getConfig());
```

---

## Performance Tips

### Caching Strategy

```javascript
import khoi from './scripts/khoi-client.js';

// Within 5 minutes = cached (no API call)
await khoi.getReadiness(); // API call
await khoi.getReadiness(); // CACHED (returns immediately)

// Force bypass cache
khoi.clearCache('readiness');
await khoi.getReadiness(); // API call again
```

### Optimize Polling

```javascript
// Don't sync everything in development
await initializeMoveSync({
  enabledMetrics: {
    readiness: true,
    heartRate: true,
    // only sync what you're testing
    hrv: false,
    sleep: false,
    activity: false
  }
});
```

### Batch Operations

```javascript
// Get multiple metrics at once
const [readiness, sleep, activity] = await Promise.all([
  khoi.getReadiness(),
  khoi.getSleep(),
  khoi.getActivity()
]);
```

---

## Security

### Never Expose API Key

```javascript
// ❌ DON'T DO THIS
const key = 'abc123xyz';
fetch('http://localhost:3000/save-key?key=' + key);

// ✅ DO THIS
// Keep key in .env (gitignored)
// Server handles it securely
```

### Environment Variables

```env
# .env (GITIGNORED)
VITE_KHOI_API_KEY=xxx

# .env.example (SAFE - shared)
VITE_KHOI_API_KEY=paste_your_key_here
```

### Data Privacy

- User health data is sensitive
- Store only what's necessary locally
- Clear cache regularly
- Consider data retention policies

---

## Troubleshooting

### Issue: Metrics Not Updating

**Symptoms:** Values stuck at same number, no new data

**Solutions:**
1. Check DevTools Console for errors
2. Verify .env file exists and has correct values
3. Verify `khoi-client.js` and `data-sync.js` are imported
4. Check Network tab - look for requests to `api.khoi.com`
5. Run: `syncManager.refreshAll()`

### Issue: "API Key Not Configured"

**Symptoms:** Console error about missing API key

**Solutions:**
1. Create `.env` file in project root
2. Add `VITE_KHOI_API_KEY=your_key`
3. Restart dev server: `npm run dev`
4. Verify restart: check Console for sync initialization message

### Issue: KHOI Requests Failing

**Symptoms:** Network tab shows 401 or 403 errors

**Solutions:**
1. Verify API key is correct
2. Check API URL is exactly: `https://api.khoi.com/api/v1`
3. Try in Postman with same key
4. Check KHOI dashboard for API key expiry

### Issue: Vercel Shows Mock Data

**Symptoms:** App works locally but shows defaults on Vercel

**Solutions:**
1. Add environment variables to Vercel:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add `VITE_KHOI_API_KEY`, `VITE_KHOI_API_URL`, `VITE_KHOI_USER_ID`
   - Select `Production`, `Preview`, `Development`
2. Redeploy after adding variables
3. Check Vercel logs: `vercel logs`

### Issue: Offline - No Sync

**Symptoms:** Network offline, no errors, just no updates

**This is expected behavior.**
- App pauses sync automatically when offline
- Uses cached data from last sync
- Resumes automatically when online

### Issue: High API Usage / Rate Limiting

**Solutions:**
1. Increase sync intervals (make them longer)
2. Disable non-critical metrics
3. Use manual refresh instead of auto-polling

---

## Support

- KHOI API Docs: https://docs.khoi.com
- MOVE Project: https://github.com/vantatech25-ship-it/move2anotherlevel
- Report Issues: Create GitHub issue in repository

---

**Happy coding! 🚀**
