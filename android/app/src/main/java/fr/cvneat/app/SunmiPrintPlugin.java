package fr.cvneat.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import woyou.aidlservice.jiuiv5.ICallback;
import woyou.aidlservice.jiuiv5.IWoyouService;

/**
 * Impression tickets via imprimante intégrée Sunmi (V2 Pro, etc.).
 * Exposé côté JS: Capacitor.Plugins.SunmiPrint
 */
@CapacitorPlugin(name = "SunmiPrint")
public class SunmiPrintPlugin extends Plugin {
  private static final String TAG = "SunmiPrint";
  private static final String SERVICE_PACKAGE = "woyou.aidlservice.jiuiv5";
  private static final String SERVICE_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService";

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject ret = new JSObject();
    boolean available = isSunmiServiceAvailable(getContext()) || isLikelySunmiDevice();
    ret.put("available", available);
    ret.put("manufacturer", Build.MANUFACTURER);
    ret.put("model", Build.MODEL);
    call.resolve(ret);
  }

  @PluginMethod
  public void printText(PluginCall call) {
    String text = call.getString("text");
    if (text == null || text.trim().isEmpty()) {
      call.reject("text requis");
      return;
    }

    final String payload = text.endsWith("\n") ? text + "\n\n" : text + "\n\n\n";

    new Thread(() -> {
      try {
        printOnSunmi(getContext().getApplicationContext(), payload);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
      } catch (Exception e) {
        Log.e(TAG, "printText failed", e);
        call.reject(e.getMessage() != null ? e.getMessage() : "Erreur impression Sunmi");
      }
    }).start();
  }

  private static boolean isLikelySunmiDevice() {
    String manufacturer = safeUpper(Build.MANUFACTURER);
    String brand = safeUpper(Build.BRAND);
    String model = safeUpper(Build.MODEL);
    return manufacturer.contains("SUNMI")
        || brand.contains("SUNMI")
        || model.contains("V2_PRO")
        || model.contains("V2 PRO")
        || model.startsWith("V2");
  }

  private static String safeUpper(String v) {
    return v == null ? "" : v.toUpperCase();
  }

  private static boolean isSunmiServiceAvailable(Context context) {
    Intent intent = new Intent();
    intent.setPackage(SERVICE_PACKAGE);
    intent.setAction(SERVICE_ACTION);
    PackageManager pm = context.getPackageManager();
    List<?> resolved;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      resolved = pm.queryIntentServices(intent, PackageManager.ResolveInfoFlags.of(0));
    } else {
      resolved = pm.queryIntentServices(intent, 0);
    }
    return resolved != null && !resolved.isEmpty();
  }

  private static void printOnSunmi(Context appContext, String text) throws Exception {
    final AtomicReference<IWoyouService> serviceRef = new AtomicReference<>();
    final CountDownLatch connected = new CountDownLatch(1);

    ServiceConnection connection = new ServiceConnection() {
      @Override
      public void onServiceConnected(ComponentName name, IBinder service) {
        serviceRef.set(IWoyouService.Stub.asInterface(service));
        connected.countDown();
      }

      @Override
      public void onServiceDisconnected(ComponentName name) {
        serviceRef.set(null);
      }
    };

    Intent intent = new Intent();
    intent.setPackage(SERVICE_PACKAGE);
    intent.setAction(SERVICE_ACTION);

    boolean bound;
    try {
      bound = appContext.bindService(intent, connection, Context.BIND_AUTO_CREATE);
    } catch (Exception e) {
      throw new Exception("Impossible de lier le service Sunmi: " + e.getMessage(), e);
    }

    if (!bound) {
      throw new Exception("Service imprimante Sunmi introuvable");
    }

    try {
      if (!connected.await(8, TimeUnit.SECONDS)) {
        throw new Exception("Timeout connexion imprimante Sunmi");
      }
      IWoyouService printer = serviceRef.get();
      if (printer == null) {
        throw new Exception("Service Sunmi non connecté");
      }

      ICallback noop = new ICallback.Stub() {
        @Override
        public void onRunResult(boolean isSuccess) {}

        @Override
        public void onReturnString(String result) {}

        @Override
        public void onRaiseException(int code, String msg) {}
      };

      try {
        printer.printerInit(noop);
      } catch (RemoteException ignored) {
      }

      try {
        printer.setAlignment(0, noop);
      } catch (RemoteException ignored) {
      }

      try {
        printer.printOriginalText(text, noop);
      } catch (RemoteException e) {
        printer.printText(text, noop);
      }

      try {
        printer.lineWrap(3, noop);
      } catch (RemoteException ignored) {
      }

      try {
        printer.cutPaper(noop);
      } catch (RemoteException ignored) {
      }
    } finally {
      try {
        appContext.unbindService(connection);
      } catch (Exception ignored) {
      }
    }
  }
}
