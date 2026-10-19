// CRITICAL: These must be imported FIRST for Reanimated to work
import "react-native-gesture-handler";
import "react-native-reanimated";

// ADR-CE-02 §4.2: arka plan GPS task'i component agaci disinda,
// mumkun oldugunca erken tanimlanmali (TaskManager.defineTask side-effect
// import'u); aksi halde native taraf uygulama arka planda/kapaliyken
// tetiklenen guncellemelerde bu task'i bulamaz.
import "./src/services/backgroundLocationTask";

// Buffer and process polyfills (your existing setup)
import { Buffer } from "buffer";
import process from "process";
global.Buffer = Buffer;
global.process = process;

// Expo registration
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
