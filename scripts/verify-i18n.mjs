#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const locales = ['en', 'tr', 'ku', 'nl', 'it', 'bg', 'es'];
const baseDir = path.resolve('src', 'locales');

const expected = {
  welcome: [
    'driver',
    'goodMorning',
    'goodAfternoon',
    'goodEvening',
    'goodNight',
    'subtitle',
    'tasksReady',
    'vehicleActive',
    'tapToContinue',
  ],
  offerDetail: [
    'loading',
    'error',
    'loadFailed',
    'notFound',
    'acceptTask',
    'acceptConfirm',
    'cancel',
    'accept',
    'success',
    'acceptSuccess',
    'ok',
    'acceptFailed',
    'rejected',
    'rejectSuccess',
    'operationFailed',
    'reject',
    'expired',
    'minutesRemaining',
    'hoursMinutesRemaining',
    'timeRemaining',
    'taskDetail',
    'route',
    'origin',
    'destination',
    'vehicle',
    'schedule',
    'scheduledStart',
    'scheduledEnd',
    'waypoints',
    'point',
    'navigation',
    'noDestination',
    'startNavigation',
    'rejectReason',
    'rejectReasonHint',
    'rejectReasonPlaceholder',
    'statuses.accepted',
    'statuses.rejected',
    'statuses.expired',
    'priorities.high',
    'priorities.urgent',
    'priorities.low',
    'priorities.normal',
  ],
  deviceAssignment: [
    'title',
    'error',
    'loadFailed',
    'noVehicle',
    'qrValid',
    'device',
    'expiresIn',
    'hours',
    'cancel',
    'assignToVehicle',
    'invalidQR',
    'qrExpired',
    'success',
    'deviceAssigned',
    'assignFailed',
    'enterSerial',
    'notFound',
    'deviceNotFound',
    'assign',
    'status',
    'cannotAssign',
    'vehicleId',
    'notSelected',
    'vehicleRequired',
    'qrScan',
    'serial',
    'list',
    'hint',
    'requestingCamera',
    'cameraPermissionDenied',
    'enableCameraPermission',
    'openSettings',
    'close',
    'searchBySerial',
    'serialPlaceholder',
    'search',
    'noResultsYet',
    'availableDevices',
    'noDevicesAvailable',
  ],
};

function getNested(obj, dottedKey) {
  return dottedKey.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

const results = {};
for (const loc of locales) {
  const file = path.join(baseDir, `${loc}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  const missing = [];

  for (const section of Object.keys(expected)) {
    if (!json[section] || typeof json[section] !== 'object') {
      missing.push(`${section}.* (section missing)`);
      continue;
    }
    for (const key of expected[section]) {
      const val = getNested(json[section], key);
      if (val === undefined) {
        missing.push(`${section}.${key}`);
      }
    }
  }

  results[loc] = missing;
}

const hasAnyMissing = Object.values(results).some(arr => arr.length > 0);
for (const loc of locales) {
  const miss = results[loc];
  if (miss.length === 0) {
    console.log(`[${loc}] OK — all keys present.`);
  } else {
    console.log(`[${loc}] Missing keys (${miss.length}):`);
    miss.forEach(k => console.log(`  - ${k}`));
  }
}

if (hasAnyMissing) {
  process.exitCode = 1;
  console.log('\n❌ Some locales have missing keys.');
} else {
  console.log('\n✅ All locales verified.');
}
