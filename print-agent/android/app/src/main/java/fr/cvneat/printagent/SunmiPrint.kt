package fr.cvneat.printagent

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.os.RemoteException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import woyou.aidlservice.jiuiv5.ICallback
import woyou.aidlservice.jiuiv5.IWoyouService
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

object SunmiPrint {
  private const val SERVICE_PACKAGE = "woyou.aidlservice.jiuiv5"
  private const val SERVICE_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService"

  fun isLikelySunmiDevice(): Boolean {
    val manufacturer = Build.MANUFACTURER.orEmpty().uppercase()
    val brand = Build.BRAND.orEmpty().uppercase()
    val model = Build.MODEL.orEmpty().uppercase()
    return manufacturer.contains("SUNMI") ||
      brand.contains("SUNMI") ||
      model.contains("V2_PRO") ||
      model.contains("V2 PRO") ||
      model.startsWith("V2")
  }

  fun isServiceAvailable(context: Context): Boolean {
    val intent = Intent().apply {
      setPackage(SERVICE_PACKAGE)
      action = SERVICE_ACTION
    }
    val pm = context.packageManager
    val resolved = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentServices(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentServices(intent, 0)
    }
    return resolved.isNotEmpty()
  }

  suspend fun printFormatted(context: Context, formattedText: String) {
    printPlain(context, ReceiptMarkup.toPlainText(formattedText))
  }

  suspend fun printPlain(context: Context, text: String) = withContext(Dispatchers.IO) {
    val appContext = context.applicationContext
    val serviceRef = AtomicReference<IWoyouService?>(null)
    val connected = CountDownLatch(1)
    val connection = object : ServiceConnection {
      override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
        serviceRef.set(IWoyouService.Stub.asInterface(service))
        connected.countDown()
      }

      override fun onServiceDisconnected(name: ComponentName?) {
        serviceRef.set(null)
      }
    }

    val intent = Intent().apply {
      setPackage(SERVICE_PACKAGE)
      action = SERVICE_ACTION
    }

    val bound = try {
      appContext.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    } catch (e: Throwable) {
      throw RuntimeException("Impossible de lier le service imprimante Sunmi: ${e.message}", e)
    }

    if (!bound) {
      throw RuntimeException("Service imprimante Sunmi introuvable (woyou.aidlservice.jiuiv5)")
    }

    try {
      if (!connected.await(8, TimeUnit.SECONDS)) {
        throw RuntimeException("Timeout connexion imprimante Sunmi")
      }
      val printer = serviceRef.get()
        ?: throw RuntimeException("Service Sunmi non connecté")

      val noop = object : ICallback.Stub() {
        override fun onRunResult(isSuccess: Boolean) {}
        override fun onReturnString(result: String?) {}
        override fun onRaiseException(code: Int, msg: String?) {}
      }

      try {
        printer.printerInit(noop)
      } catch (_: RemoteException) {
        // Certains firmwares n'exposent pas printerInit — on continue.
      }

      try {
        printer.setAlignment(0, noop) // left
      } catch (_: RemoteException) {
      }

      // printOriginalText conserve les espaces (alignement colonnes)
      try {
        printer.printOriginalText(text, noop)
      } catch (_: RemoteException) {
        printer.printText(text, noop)
      }

      try {
        printer.lineWrap(3, noop)
      } catch (_: RemoteException) {
      }

      try {
        printer.cutPaper(noop)
      } catch (_: RemoteException) {
        // V2 Pro : coupe automatique souvent absente / non critique
      }
    } finally {
      try {
        appContext.unbindService(connection)
      } catch (_: Throwable) {
      }
    }
  }
}
