import { UI_TEXT } from "./messages";

/**
 * Brio's privacy policy (plan §139.17.5, R8.10; the user, 2026-09-28: "write
 * privacy policy yourself"). Google Play asks every app that makes accounts
 * for one, at an address anyone can open: `/privacy`, drawn from this.
 *
 * It says only what the app does. Change it with the app: a new kind of data
 * kept, a new service that sees it, a new permission — and move `updated`.
 * Kept apart from messages.ts, which every screen loads, because only the
 * policy's page reads it.
 */

const app = UI_TEXT.appName;
const maker = UI_TEXT.settings.maker;

export interface PrivacySection {
  /** The section's anchor: `/privacy#delete` is the web link to deleting an account. */
  id: string;
  heading: string;
  paragraphs?: readonly string[];
  points?: readonly string[];
  /** Paragraphs after the points. */
  after?: readonly string[];
  /** What the page adds at the end: the way to delete the account, or the address to write to. */
  action?: "deleteAccount" | "contact";
}

export const PRIVACY_POLICY = {
  /** The day this text last changed, as a day key. */
  updated: "2026-09-29",
  intro: [
    `${app} helps you run a home business: your orders, customers, products, stock, expenses and bills. This policy says what ${app} keeps, why it keeps it, who can see it, and how you delete it.`,
    `It covers ${app} on the web, installed from the browser, and the Android app.`,
  ],
  sections: [
    {
      id: "who",
      heading: "Who is responsible",
      paragraphs: [
        `${app} is made and run by ${maker} (“we”, “us”). We are responsible for your account, and for keeping everything you put into ${app} safe.`,
        `The details you record about your own customers are yours. You collect them and decide what to keep; ${app} stores them for you and uses them for nothing else. If a customer asks what you hold about them, you can show it, change it or delete it in ${app}.`,
      ],
    },
    {
      id: "what",
      heading: "What we keep",
      points: [
        "Your account: your name, the mobile number you sign in with, your email address, the profile picture you chose, and your password — kept only as a one-way hash, which no one can read back, not even us.",
        "Your business: its name, catch phrase, city, address, phone number and logo.",
        "What you record: customers (names, phone numbers, addresses and notes), products and stock, orders with their items, charges and discounts, payments (the amount, the method and any reference you type), and expenses.",
        "A history of the changes made in your business — who changed what, and when — and notifications about orders that are due.",
        "Records our server makes as it runs: when a request came, its reference number, and what went wrong, so faults can be found and fixed. They never hold your password.",
        "If you turn on order reminders in a browser: the address that browser’s push service gives us to reach it, and the keys that lock what we send, kept until you sign out there or the address stops working. The Android app keeps its reminders on the phone itself.",
      ],
      after: [
        `On your device, ${app} keeps a cookie that keeps you signed in, and a few things in the browser’s storage: your theme, the date ranges you last looked at, and an order you are part way through.`,
        `We do not read your location, your contacts or your files, apart from a logo you choose to upload. There are no adverts, no advertising IDs, and no analytics or tracking tools. We never see card or bank details: ${app} records that a payment was made, not how to make one.`,
      ],
    },
    {
      id: "why",
      heading: "Why we keep it",
      points: [
        `To run ${app} for you: to sign you in, show your business, work out totals, make bills, and tell you of orders that are due.`,
        "To send the emails your account needs: confirming your email address, and a new password when you ask for one.",
        `To keep ${app} secure and working, and to put faults right.`,
      ],
      after: [
        "We keep it because you asked us to, by making an account, and use it only for these. We do not sell it, rent it, or use it for advertising or to profile you.",
      ],
    },
    {
      id: "who-sees",
      heading: "Who can see it",
      points: [
        "You, when you are signed in. Each business is kept apart from every other: no one signed in to another business can see yours.",
        `The people who run ${app}, only when it is needed to keep it working or to answer you. Our developer console shows accounts and the history of changes, to us and no one else.`,
        `The services that run ${app} for us: Supabase, which holds the database, the sign-in and the logo; Cloudflare, which carries the app to you; and Google’s Gmail, which sends ${app}’s emails. They handle your data only to provide their service to us.`,
        "If you turn on order reminders in a browser, that browser’s own push service — Google’s for Chrome, Apple’s for Safari, Mozilla’s for Firefox — carries each one to you. What it carries is locked so that only your browser can read it.",
        "Anyone the law requires us to tell, and only what it requires.",
      ],
      after: [`A bill you share or download goes wherever you send it. ${app} does not keep a copy.`],
    },
    {
      id: "keep",
      heading: "How it is kept, and for how long",
      points: [
        "Everything travels encrypted (HTTPS). Passwords are hashed. The sign-in cookie cannot be read by the page’s scripts, and the database checks which business a row belongs to before anyone sees it.",
        "We keep your data for as long as your account exists.",
        `When you delete your account, it is deleted from ${app} at once. Copies in our backups are gone within 30 days. The server’s records are kept only as long as they help us find faults.`,
      ],
    },
    {
      id: "choices",
      heading: "Your choices and rights",
      points: [
        "See and correct: your name, number and email are in Settings, your business’s details in Business details, and everything you record on its own screen.",
        "Reminders: turn them off at any time in your phone’s or your browser’s settings for the app.",
        "Delete: delete your account and everything in it, at any time (below).",
        "Ask: write to us to ask what we hold about you, to correct it, to delete it, or to complain. We reply within 30 days.",
      ],
      after: [
        "In India, the Digital Personal Data Protection Act, 2023 gives you these rights, and the right to complain to the Data Protection Board of India if we do not put a grievance right.",
      ],
    },
    {
      id: "delete",
      heading: "Deleting your account",
      paragraphs: [
        `In ${app}, on the web or in the app, open Settings and choose Delete account. Type your sign-in number and email address, and your password twice, then confirm once more. Your account and your business, with every order, customer, product, expense and record in it, are deleted straight away. It cannot be undone.`,
        "If you cannot sign in, write to us from the email address on the account, with its sign-in number, and we will delete it within 30 days.",
      ],
      action: "deleteAccount",
    },
    {
      id: "children",
      heading: "Children",
      paragraphs: [
        `${app} is for running a business, and not meant for anyone under 18. We do not knowingly keep a child’s data; if you think we do, write to us and we will delete it.`,
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      paragraphs: [
        `If this policy changes, the date at the top changes with it. If a change affects what we keep or who sees it, we tell you in ${app} or by email before it takes effect.`,
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      paragraphs: [`${app} is made by ${maker}. For anything about your data or this policy, write to us.`],
      action: "contact",
    },
  ] satisfies readonly PrivacySection[],
} as const;
