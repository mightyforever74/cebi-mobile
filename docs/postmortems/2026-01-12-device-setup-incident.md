# Post-Mortem: DeviceSetup & Task Offers Incident

**Date:** 2026-01-12  
**Environment:** Production  
**Status:** Resolved ✅  
**Severity:** Medium (user flow blocked, no data loss)

---

## Summary

A production incident caused drivers to be stuck in the **DeviceSetup flow** and intermittently receive empty or failing task lists.  
The issue was the result of **multiple small bugs across backend, mobile, and database layers**, which combined to fully block the main user flow.

All issues have been identified, fixed, and verified in production.

---

## Impact

- Drivers were redirected to **DeviceSetup** repeatedly
- `/api/task-offers?status=pending` returned **HTTP 500**
- Some users saw blank or broken screens
- No data loss
- Devices (ESP32) were online and publishing MQTT data correctly

**Affected users:** Limited (early production users)  
**Duration:** ~1 hour 15 minutes

---

## Timeline

- **12:45** – Issue observed during mobile testing (Gate → DeviceSetup loop)
- **12:55** – Backend `/api/task-offers` returning 500
- **13:05** – PostgreSQL syntax error identified in backend logs
- **13:10** – SQL alias bug found (`to` vs `tof`)
- **13:20** – Android ExoPlayer video asset error identified
- **13:30** – React Navigation error (`replace` vs `navigate`) identified
- **13:40** – API contract mismatch in `getVehicle()` found
- **13:50** – `setup_required` flag incorrectly set in database
- **14:00** – All fixes deployed and verified

---

## Root Cause Analysis

### 1. Backend 500 – `/api/task-offers`

**Cause:**  
SQL query used an invalid table alias (`to`) instead of the defined alias (`tof`).

```sql
-- Incorrect
ORDER BY to.created_at

-- Correct
ORDER BY tof.created_at
```
