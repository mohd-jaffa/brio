// The native capability layer (plan §139.17.2): the only place that knows
// what the app runs in. Screens import from here and nothing else.
export { saveFile, share, type ShareOutcome } from "./share";
