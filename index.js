// index.js
import { Buffer } from "buffer";
import process from "process";
global.Buffer = Buffer;
global.process = process;

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
