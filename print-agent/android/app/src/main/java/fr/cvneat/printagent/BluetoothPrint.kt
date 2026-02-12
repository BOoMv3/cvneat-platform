package fr.cvneat.printagent

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import com.dantsu.escposprinter.EscPosPrinter
import com.dantsu.escposprinter.connection.bluetooth.BluetoothConnection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object BluetoothPrint {
  fun listPairedDevices(): List<BluetoothDevice> {
    val adapter = BluetoothAdapter.getDefaultAdapter() ?: return emptyList()
    return adapter.bondedDevices?.toList() ?: emptyList()
  }

  suspend fun print(macAddress: String, formattedText: String) {
    return withContext(Dispatchers.IO) {
      val adapter = BluetoothAdapter.getDefaultAdapter() ?: throw RuntimeException("Bluetooth non disponible")
      val device = adapter.getRemoteDevice(macAddress) ?: throw RuntimeException("Imprimante introuvable")

      val connection = BluetoothConnection(device)
      try {
        connection.connect()
        // Common receipt printer: 203 dpi, 58mm -> ~32 chars; adjust if needed.
        val printer = EscPosPrinter(connection, 203, 48f, 32)
        printer.printFormattedText(formattedText)
      } finally {
        try { connection.disconnect() } catch (_: Throwable) {}
      }
    }
  }
}

