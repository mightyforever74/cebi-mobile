// CRITICAL: These must be imported FIRST for Reanimated to work
import "react-native-gesture-handler";
import "react-native-reanimated";

// Buffer and process polyfills (your existing setup)
import { Buffer } from "buffer";
import process from "process";
global.Buffer = Buffer;
global.process = process;

// Expo registration
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
