package fr.cvneat.printagent

import android.content.Context

class Prefs(ctx: Context) {
  private val sp = ctx.getSharedPreferences("cvneat_print_agent", Context.MODE_PRIVATE)

  companion object {
    const val TYPE_SUNMI = "sunmi"
    const val TYPE_BLUETOOTH = "bluetooth"
    const val SUNMI_MARKER = "SUNMI_INNER"
  }

  fun getAccessToken(): String? = sp.getString("access_token", null)
  fun setAccessToken(token: String?) {
    sp.edit().putString("access_token", token).apply()
  }

  fun getPrinterMac(): String? = sp.getString("printer_mac", null)
  fun setPrinterMac(mac: String?) {
    sp.edit().putString("printer_mac", mac).apply()
  }

  fun getPrinterType(): String =
    sp.getString("printer_type", null)
      ?: if (getPrinterMac() == SUNMI_MARKER) TYPE_SUNMI else TYPE_BLUETOOTH

  fun setPrinterType(type: String) {
    sp.edit().putString("printer_type", type).apply()
  }

  fun selectSunmi() {
    sp.edit()
      .putString("printer_type", TYPE_SUNMI)
      .putString("printer_mac", SUNMI_MARKER)
      .apply()
  }

  fun selectBluetooth(mac: String) {
    sp.edit()
      .putString("printer_type", TYPE_BLUETOOTH)
      .putString("printer_mac", mac)
      .apply()
  }

  fun hasPrinterConfigured(): Boolean {
    return when (getPrinterType()) {
      TYPE_SUNMI -> true
      else -> !getPrinterMac().isNullOrBlank() && getPrinterMac() != SUNMI_MARKER
    }
  }

  fun printerLabel(): String {
    return when (getPrinterType()) {
      TYPE_SUNMI -> "Sunmi (imprimante intégrée)"
      else -> getPrinterMac() ?: "non configurée"
    }
  }

  fun clearAll() {
    sp.edit().clear().apply()
  }
}
