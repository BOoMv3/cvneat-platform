package fr.cvneat.printagent

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.ListView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PrinterSetupActivity : AppCompatActivity() {
  private lateinit var prefs: Prefs

  private val REQ_BT = 101

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    prefs = Prefs(this)
    setContentView(R.layout.activity_printer_setup)

    val listView = findViewById<ListView>(R.id.list)
    val status = findViewById<TextView>(R.id.status)
    val title = findViewById<TextView>(R.id.title)
    val testBtn = findViewById<Button>(R.id.testPrint)
    val sunmiBtn = findViewById<Button>(R.id.useSunmi)
    val continueBtn = findViewById<Button>(R.id.continueBtn)

    val sunmiAvailable = SunmiPrint.isServiceAvailable(this) || SunmiPrint.isLikelySunmiDevice()
    if (sunmiAvailable) {
      title.text = "Imprimante Sunmi / Bluetooth"
      sunmiBtn.visibility = View.VISIBLE
      sunmiBtn.text = "Utiliser l’imprimante intégrée Sunmi"
      if (!prefs.hasPrinterConfigured()) {
        prefs.selectSunmi()
        status.text = "Sunmi sélectionnée automatiquement (imprimante intégrée)"
      }
    } else {
      title.text = "Choisir l’imprimante Bluetooth (pairée)"
      sunmiBtn.visibility = View.GONE
    }

    if (prefs.hasPrinterConfigured()) {
      status.text = "Actuelle: ${prefs.printerLabel()}"
    }

    sunmiBtn.setOnClickListener {
      prefs.selectSunmi()
      status.text = "Imprimante sélectionnée: Sunmi (intégrée)"
    }

    continueBtn.setOnClickListener {
      if (!prefs.hasPrinterConfigured()) {
        status.text = "Choisis d’abord une imprimante"
        return@setOnClickListener
      }
      startActivity(Intent(this, StatusActivity::class.java))
      finish()
    }

    ensureBluetoothPermissions()

    val devices = try {
      BluetoothPrint.listPairedDevices()
    } catch (_: Throwable) {
      emptyList()
    }
    val labels = devices.map { d -> "${d.name ?: "Appareil"}\n${d.address}" }
    val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, labels)
    listView.adapter = adapter

    listView.setOnItemClickListener { _, _, position, _ ->
      val dev = devices[position]
      prefs.selectBluetooth(dev.address)
      status.text = "Imprimante sélectionnée: ${dev.name} (${dev.address})"
    }

    testBtn.setOnClickListener {
      if (!prefs.hasPrinterConfigured()) {
        status.text = "Choisis d’abord une imprimante"
        return@setOnClickListener
      }
      status.text = "Test impression..."
      CoroutineScope(Dispatchers.Main).launch {
        try {
          val sample = "[C]<b>TEST CVNEAT</b>\n[L]Impression OK\n[L]Sunmi / Bluetooth\n\n\n"
          when (prefs.getPrinterType()) {
            Prefs.TYPE_SUNMI -> SunmiPrint.printFormatted(this@PrinterSetupActivity, sample)
            else -> BluetoothPrint.print(prefs.getPrinterMac()!!, sample)
          }
          status.text = "Test OK — ${prefs.printerLabel()}"
        } catch (e: Throwable) {
          status.text = "Erreur impression: ${e.message}"
        }
      }
    }
  }

  private fun ensureBluetoothPermissions() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val needConnect = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
    val needScan = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED
    if (needConnect || needScan) {
      ActivityCompat.requestPermissions(
        this,
        arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN),
        REQ_BT
      )
    }
  }
}
