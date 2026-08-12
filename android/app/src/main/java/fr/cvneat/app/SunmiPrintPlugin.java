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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import woyou.aidlservice.jiuiv5.ICallback;
import woyou.aidlservice.jiuiv5.IWoyouService;

/**
 * Impression tickets via imprimante intégrée Sunmi (V2 Pro, etc.).
 * Exposé côté JS: Capacitor.Plugins.SunmiPrint / nativePromise('SunmiPrint', ...)
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
        ret.put("note", "Commande envoyée à l'imprimante. Vérifie le papier thermique.");
        call.resolve(ret);
      } catch (Exception e) {
        Log.e(TAG, "printText failed", e);
        call.reject(e.getMessage() != null ? e.getMessage() : "Erreur impression Sunmi");
      }
    }, "sunmi-print").start();
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
      throw new Exception("Service imprimante Sunmi introuvable (InnerPrinter)");
    }

    try {
      if (!connected.await(8, TimeUnit.SECONDS)) {
        throw new Exception("Timeout connexion imprimante Sunmi");
      }
      IWoyouService printer = serviceRef.get();
      if (printer == null) {
        throw new Exception("Service Sunmi non connecté");
      }

      final CountDownLatch printDone = new CountDownLatch(1);
      final AtomicBoolean printOk = new AtomicBoolean(true);
      final AtomicReference<String> printErr = new AtomicReference<>(null);

      ICallback callback = new ICallback.Stub() {
        @Override
        public void onRunResult(boolean isSuccess) {
          printOk.set(isSuccess);
          if (!isSuccess) {
            printErr.compareAndSet(null, "Impression Sunmi refusée (papier / capot / erreur)");
          }
          printDone.countDown();
        }

        @Override
        public void onReturnString(String result) {
          Log.d(TAG, "onReturnString: " + result);
        }

        @Override
        public void onRaiseException(int code, String msg) {
          Log.e(TAG, "onRaiseException code=" + code + " msg=" + msg);
          printOk.set(false);
          printErr.set("Erreur imprimante (" + code + "): " + (msg != null ? msg : ""));
          printDone.countDown();
        }
      };

      try {
        printer.printerInit(callback);
      } catch (RemoteException ignored) {
      }

      // Petite pause après init (firmware V2 Pro)
      try {
        Thread.sleep(200);
      } catch (InterruptedException ignored) {
        Thread.currentThread().interrupt();
      }

      try {
        printer.setAlignment(0, callback);
      } catch (RemoteException ignored) {
      }

      try {
        printer.setFontSize(24, callback);
      } catch (RemoteException ignored) {
      }

      // Réinitialiser le latch pour l'impression texte
      // (printerInit peut déjà avoir déclenché onRunResult)
      final CountDownLatch textDone = new CountDownLatch(1);
      final AtomicBoolean textOk = new AtomicBoolean(true);
      final AtomicReference<String> textErr = new AtomicReference<>(null);

      ICallback textCb = new ICallback.Stub() {
        @Override
        public void onRunResult(boolean isSuccess) {
          textOk.set(isSuccess);
          if (!isSuccess) {
            textErr.compareAndSet(null, "Impression refusée — vérifie le papier thermique et le capot.");
          }
          textDone.countDown();
        }

        @Override
        public void onReturnString(String result) {}

        @Override
        public void onRaiseException(int code, String msg) {
          textOk.set(false);
          textErr.set("Erreur imprimante (" + code + "): " + (msg != null ? msg : "sans message"));
          textDone.countDown();
        }
      };

      try {
        printer.printOriginalText(text, textCb);
      } catch (RemoteException e) {
        printer.printText(text, textCb);
      }

      // Attendre le callback (sinon unbind trop tôt = rien n'imprime)
      if (!textDone.await(10, TimeUnit.SECONDS)) {
        Log.w(TAG, "Pas de callback print — on continue quand même (certains firmwares)");
      } else if (!textOk.get()) {
        throw new Exception(textErr.get() != null ? textErr.get() : "Impression Sunmi échouée");
      }

      try {
        printer.lineWrap(4, textCb);
      } catch (RemoteException ignored) {
      }

      // Laisser le buffer sortir avant unbind
      try {
        Thread.sleep(800);
      } catch (InterruptedException ignored) {
        Thread.currentThread().interrupt();
      }

      try {
        printer.cutPaper(callback);
      } catch (RemoteException ignored) {
      }

      try {
        Thread.sleep(300);
      } catch (InterruptedException ignored) {
        Thread.currentThread().interrupt();
      }
    } finally {
      try {
        appContext.unbindService(connection);
      } catch (Exception ignored) {
      }
    }
  }
}
