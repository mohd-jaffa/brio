// The native capability layer (plan §139.17.2): the only place that knows
// whether the app is the Android app. Screens import from here and nothing
// else; ESLint refuses @capacitor/* anywhere outside this folder.
export { goBack, type BackStep } from "./back";
export { NativeSetup } from "./NativeSetup";
export { hasPlugins, isAndroidApp } from "./platform";
export { saveFile, share, type ShareOutcome } from "./share";
