package fr.cvneat.printagent

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class StatusActivity : AppCompatActivity() {
  private lateinit var prefs: Prefs
  private var loopJob: Job? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    prefs = Prefs(this)
    setContentView(R.layout.activity_status)

    val info = findViewById<TextView>(R.id.info)
    val log = findViewById<TextView>(R.id.log)
    val changePrinter = findViewById<Button>(R.id.changePrinter)
    val logout = findViewById<Button>(R.id.logout)

    changePrinter.setOnClickListener {
      startActivity(Intent(this, PrinterSetupActivity::class.java))
    }

    logout.setOnClickListener {
      prefs.clearAll()
      startActivity(Intent(this, LoginActivity::class.java))
      finish()
    }

    val token = prefs.getAccessToken()
    if (token.isNullOrBlank()) {
      startActivity(Intent(this, LoginActivity::class.java))
      finish()
      return
    }

    val printerMac = prefs.getPrinterMac()
    info.text = "Imprimante: ${printerMac ?: "non configurée"}\nAPI: ${AppConfig.CVNEAT_BASE_URL}"

    appendLog(log, "Démarrage polling...")
  }

  override fun onStart() {
    super.onStart()
    startLoop()
  }

  override fun onStop() {
    super.onStop()
    loopJob?.cancel()
    loopJob = null
  }

  private fun startLoop() {
    val token = prefs.getAccessToken() ?: return
    val log = findViewById<TextView>(R.id.log)

    if (loopJob != null) return

    loopJob = CoroutineScope(Dispatchers.Main).launch {
      var idleDelayMs = 20000L
      while (true) {
        try {
          val printerMac = prefs.getPrinterMac()
          if (printerMac.isNullOrBlank()) {
            appendLog(log, "Imprimante non configurée. Ouvre 'Changer d’imprimante'.")
            delay(10000)
            continue
          }

          val jobs = CvneatApi.fetchPrintJobs(token)
          if (jobs.isEmpty()) {
            delay(idleDelayMs)
            idleDelayMs = minOf(idleDelayMs + 5000L, 60000L)
            continue
          }

          idleDelayMs = 20000L
          for (job in jobs) {
            appendLog(log, "Impression job ${job.notificationId} ...")
            BluetoothPrint.print(printerMac, job.text)
            CvneatApi.markPrinted(token, job.notificationId)
            appendLog(log, "OK job ${job.notificationId}")
          }

          // Continue immediately to drain queue
          delay(250)
        } catch (e: Throwable) {
          appendLog(log, "Erreur: ${e.message}")
          delay(30000)
        }
      }
    }
  }

  private fun appendLog(tv: TextView, msg: String) {
    val current = tv.text?.toString() ?: ""
    val next = (current + "\n" + msg).trim()
    tv.text = if (next.length > 8000) next.takeLast(8000) else next
  }
}

