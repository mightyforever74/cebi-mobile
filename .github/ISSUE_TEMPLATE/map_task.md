---

name: Map Task

about: Harita geliştirme işi (Paket A / B / C / D)

title: "Map: <kısa başlık>"

labels: \["map", "feature"]

assignees: \[]

---



\## 🎯 Goal

(Bu işin net hedefi – 1 cümle)



\## 📦 Package

\- \[ ] Paket A – Pro Marker System

\- \[ ] Paket B – Vehicle Track

\- \[ ] Paket C – Geofence Layer + Editor

\- \[ ] Paket D – Violations → Alerts



\## ✅ Acceptance Criteria

\- \[ ] (madde madde net kriterler)



\## 🗂️ Files / Areas

\- \[ ] src/screens/admin/FleetMapScreen.js

\- \[ ] src/components/map/VehicleMarker.js

\- \[ ] src/components/map/VehicleInfoSheet.js

\- \[ ] (diğer)



\## 🧪 Test Plan

\- \[ ] Manuel test adımları

\- \[ ] Edge-case senaryoları



\## 🔗 Backend / DB Contract

\- `/api/vehicles`: plate\_no, latitude, longitude, heading, last\_location\_time

\- Track: time, latitude, longitude, speed, heading, accuracy

\- Alerts: is\_resolved



