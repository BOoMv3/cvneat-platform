#!/usr/bin/env node
/**
 * Patch iOS AppDelegate.swift to forward APNs callbacks to Capacitor.
 *
 * Why:
 * - Capacitor PushNotifications JS can call register(), but without forwarding
 *   didRegister/didFail callbacks via NotificationCenter, the JS side may never
 *   receive a token (no "registration" event).
 *
 * Note:
 * - The ios/ folder is gitignored in this repo, so we patch it at build time.
 * - This script is idempotent (safe to run multiple times).
 */

const fs = require('fs');
const path = require('path');

const appDelegatePath = path.join(process.cwd(), 'ios', 'App', 'App', 'AppDelegate.swift');

function fail(msg) {
  console.error(`❌ [patch-ios-apns] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(appDelegatePath)) {
  fail(`Fichier introuvable: ${appDelegatePath}. Lance d'abord "npx cap sync ios" / "npm run build:ios".`);
}

let content = fs.readFileSync(appDelegatePath, 'utf8');

const hasApnsCallbacks =
  content.includes('capacitorDidRegisterForRemoteNotifications') ||
  content.includes('didRegisterForRemoteNotificationsWithDeviceToken');

const hasBadgeReset =
  content.includes('applicationIconBadgeNumber = 0') ||
  content.includes('applicationDidBecomeActive');

if (hasApnsCallbacks && hasBadgeReset) {
  console.log('ℹ️ [patch-ios-apns] AppDelegate.swift semble déjà patché (OK).');
  process.exit(0);
}

const apnsInjection = `

    // MARK: - APNs (Push Notifications)
    //
    // Capacitor PushNotifications plugin relies on these AppDelegate callbacks being forwarded
    // via NotificationCenter. Without them, JS can call register() but never receives a token.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        let preview = String(tokenString.prefix(12)) + "…"
        print("✅ [APNs] didRegisterForRemoteNotificationsWithDeviceToken: \\(preview)")

        NotificationCenter.default.post(
            name: Notification.Name.capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ [APNs] didFailToRegisterForRemoteNotificationsWithError: \\(error.localizedDescription)")

        NotificationCenter.default.post(
            name: Notification.Name.capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }
`;

const badgeInjection = `

    // MARK: - Badge reset
    //
    // Évite un badge iOS "fantôme" (ex: 1) qui reste affiché même sans notifications.
    func applicationDidBecomeActive(_ application: UIApplication) {
        application.applicationIconBadgeNumber = 0
    }
`;

const injection = `${hasApnsCallbacks ? '' : apnsInjection}${hasBadgeReset ? '' : badgeInjection}`;

// Inject after didFinishLaunchingWithOptions block (best effort).
const anchor = 'return true';
const idx = content.indexOf(anchor);
if (idx === -1) fail('Impossible de trouver le point d\'injection (return true).');

// Find end of didFinishLaunching function by locating the next "}\n" after the "return true"
// This is a heuristic but works for the default Capacitor template.
const afterReturn = content.indexOf('}', idx);
if (afterReturn === -1) fail('Impossible de trouver la fin de didFinishLaunchingWithOptions.');

content = content.slice(0, afterReturn + 1) + injection + content.slice(afterReturn + 1);

fs.writeFileSync(appDelegatePath, content, 'utf8');
console.log('✅ [patch-ios-apns] AppDelegate.swift patché (APNs callbacks).');


