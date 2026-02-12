package fr.cvneat.printagent

import android.content.Context

class Prefs(ctx: Context) {
  private val sp = ctx.getSharedPreferences("cvneat_print_agent", Context.MODE_PRIVATE)

  fun getAccessToken(): String? = sp.getString("access_token", null)
  fun setAccessToken(token: String?) {
    sp.edit().putString("access_token", token).apply()
  }

  fun getPrinterMac(): String? = sp.getString("printer_mac", null)
  fun setPrinterMac(mac: String?) {
    sp.edit().putString("printer_mac", mac).apply()
  }

  fun clearAll() {
    sp.edit().clear().apply()
  }
}

