import type { StaticImageData } from "next/image";

/**
 * The launch splash (the user, 2026-09-28: "small branded splash + loader …
 * for returning user launching the app"). It shows when Brio is opened as an
 * app — installed from the browser, or the Android app — once per launch,
 * never in a browser tab and never on a reload within the same launch. Its
 * bar moves as the launch really goes: the page read, the fonts in, the art
 * drawn, and the app ready (`LaunchReady`). It stays at least `min` ms, so it
 * can be read, and never more than `max`.
 */
export const LAUNCH = {
  /** The splash element; its bar is `${id}-bar`, its track `${id}-track`. */
  id: "launch-splash",
  /** Set in this launch's session storage once it has shown. */
  key: "brio_launched",
  /** The Android app adds this to its user agent (capacitor.config.ts). */
  agent: "BrioAndroid",
  min: 900,
  max: 8000,
  /** How long it takes to fade (globals.css, `html[data-launch="leaving"]`). */
  fade: 300,
  /** What each step of the launch is worth; they add up to one. */
  steps: { page: 0.3, fonts: 0.15, art: 0.2, app: 0.35 },
} as const;

/** What `LaunchReady` calls once the app has come to life (`window.__brioLaunch`). */
export interface LaunchControl {
  ready: () => void;
}

declare global {
  interface Window {
    __brioLaunch?: LaunchControl;
  }
}

/** A static image's address: an object from Next's loader, a plain path in tests. */
export function assetUrl(image: StaticImageData | string): string {
  return typeof image === "string" ? image : image.src;
}

/**
 * Runs in <head> before the first paint, as the theme's does (BUG-15). If this
 * is an app's launch, it marks <html data-launch="on"> — which shows the
 * splash (globals.css) — starts the art and the wordmark loading, and moves
 * the bar: it eases toward what has happened, a little beyond while it waits,
 * and never past a step not yet reached. When every step is done it fills to
 * the end, fades (data-launch="leaving") and is gone. It is a string: it cannot import.
 */
export function launchBootScript(art: { portrait: string; landscape: string; wordmark: string }): string {
  const config = JSON.stringify({ ...LAUNCH, ...art });
  return `(function(c){var d=document,r=d.documentElement,w=window;try{
var n=w.navigator,app=(w.matchMedia&&w.matchMedia("(display-mode: standalone)").matches)||n.standalone===true||n.userAgent.indexOf(c.agent)>=0;
if(!app)return;
try{if(w.sessionStorage.getItem(c.key))return;w.sessionStorage.setItem(c.key,"1");}catch(e){}
r.setAttribute("data-launch","on");
var start=Date.now(),target=0,shown=0,reached={},ending=false;
function reach(s){if(reached[s])return;reached[s]=1;target+=c.steps[s];}
function end(){if(ending)return;ending=true;r.setAttribute("data-launch","leaving");setTimeout(function(){r.removeAttribute("data-launch");},c.fade);}
function frame(){var done=target>0.999&&Date.now()-start>=c.min;
shown+=((done?1:Math.min(target+0.04,0.97))-shown)*0.12;if(done&&shown>0.99)shown=1;
var bar=d.getElementById(c.id+"-bar"),track=d.getElementById(c.id+"-track");
if(bar)bar.style.transform="scaleX("+shown.toFixed(3)+")";
if(track)track.setAttribute("aria-valuenow",String(Math.round(shown*100)));
if(shown===1||Date.now()-start>c.max)return end();
w.requestAnimationFrame(frame);}
var art=new Image();art.onload=art.onerror=function(){reach("art");};
art.src=w.matchMedia&&w.matchMedia("(orientation: landscape)").matches?c.landscape:c.portrait;
new Image().src=c.wordmark;
w.__brioLaunch={ready:function(){reach("app");}};
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",function(){reach("page");});else reach("page");
if(d.fonts&&d.fonts.ready)d.fonts.ready.then(function(){reach("fonts");},function(){reach("fonts");});else reach("fonts");
w.requestAnimationFrame(frame);
}catch(e){r.removeAttribute("data-launch");}})(${config});`;
}

/**
 * Runs `then` once the launch splash has gone — at once when there is none —
 * and hands back what stops waiting. Something that must stand in the top
 * layer, over the splash's `z-index`, waits for it (the welcome, plan
 * §139.11.20), so a launch still shows its splash first.
 */
export function afterLaunch(then: () => void): () => void {
  const root = document.documentElement;
  if (!root.hasAttribute("data-launch")) {
    then();
    return () => undefined;
  }
  const watch = new MutationObserver(() => {
    if (root.hasAttribute("data-launch")) return;
    watch.disconnect();
    then();
  });
  watch.observe(root, { attributes: true, attributeFilter: ["data-launch"] });
  return () => watch.disconnect();
}
