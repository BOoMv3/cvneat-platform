package fr.cvneat.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  // Default channel for FCM notifications (Android 8+).
  // IMPORTANT: channel id must match AndroidManifest meta-data.
  private static final String DEFAULT_CHANNEL_ID = "cvneat_orders";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    createDefaultNotificationChannel();
  }

  private void createDefaultNotificationChannel() {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

      NotificationManager manager = getSystemService(NotificationManager.class);
      if (manager == null) return;

      // If already exists, do nothing.
      NotificationChannel existing = manager.getNotificationChannel(DEFAULT_CHANNEL_ID);
      if (existing != null) return;

      NotificationChannel channel =
          new NotificationChannel(
              DEFAULT_CHANNEL_ID,
              "Commandes CVN'EAT",
              NotificationManager.IMPORTANCE_HIGH);
      channel.setDescription("Notifications des commandes et statuts (livreurs/restaurants).");
      channel.enableVibration(true);
      channel.setShowBadge(false); // avoid badge confusion on Android launchers

      manager.createNotificationChannel(channel);
    } catch (Exception ignored) {
      // Avoid crashing app on OEM-specific NotificationManager issues.
    }
  }
}
