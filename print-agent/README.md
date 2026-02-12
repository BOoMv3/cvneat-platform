# CVNEAT Print Agent (Android)

This is a small Android app that sits near the Bluetooth thermal printer and prints CVNEAT receipts automatically.

## Why this exists

iOS Safari cannot reliably print raw ESC/POS over Bluetooth to receipt printers.  
So restaurants can keep using the partner dashboard on iPhone/iPad, while an Android device handles Bluetooth printing.

## How it works

- On login, the app obtains a Supabase access token (email/password).
- It polls CVNEAT for unread notifications of type `print_receipt`:
  - `GET https://www.cvneat.fr/api/partner/notifications?unreadOnly=1&type=print_receipt&limit=5`
- For each job, it prints `notification.data.text` to the paired Bluetooth printer (ESC/POS).
- After a successful print, it marks the notification as read:
  - `PATCH https://www.cvneat.fr/api/partner/notifications` with `{ "notificationId": "..." }`

## Setup

1. Pair your printer in Android settings (Bluetooth). The printer should appear as paired (ex: `TP85 V AFB9`).
2. Open `print-agent/android/` in Android Studio.
3. Build + install on the dedicated Android device.
4. In the app:
   - Login with the partner restaurant account.
   - Select the paired printer.
   - Leave the app open (kiosk/always-on recommended).

## Test printing (no fake order)

From an admin session, call:

- `POST /api/admin/restaurants/enqueue-print-test` with `{ "restaurantId": "<id>" }`

The Android agent should fetch the job and print a test receipt.

