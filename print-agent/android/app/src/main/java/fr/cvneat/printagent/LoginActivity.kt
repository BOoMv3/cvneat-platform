package fr.cvneat.printagent

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class LoginActivity : AppCompatActivity() {
  private lateinit var prefs: Prefs

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    prefs = Prefs(this)

    // If already logged in, go directly
    val token = prefs.getAccessToken()
    if (!token.isNullOrBlank()) {
      startActivity(Intent(this, StatusActivity::class.java))
      finish()
      return
    }

    setContentView(R.layout.activity_login)

    val email = findViewById<EditText>(R.id.email)
    val password = findViewById<EditText>(R.id.password)
    val loginBtn = findViewById<Button>(R.id.loginBtn)
    val status = findViewById<TextView>(R.id.status)

    loginBtn.setOnClickListener {
      val e = email.text?.toString()?.trim() ?: ""
      val p = password.text?.toString() ?: ""
      if (e.isBlank() || p.isBlank()) {
        status.text = "Email / mot de passe requis"
        return@setOnClickListener
      }
      status.text = "Connexion..."
      loginBtn.isEnabled = false

      CoroutineScope(Dispatchers.Main).launch {
        try {
          val accessToken = SupabaseAuth.login(e, p)
          prefs.setAccessToken(accessToken)
          withContext(Dispatchers.Main) {
            startActivity(Intent(this@LoginActivity, StatusActivity::class.java))
            finish()
          }
        } catch (ex: Throwable) {
          status.text = ex.message ?: "Erreur connexion"
        } finally {
          loginBtn.isEnabled = true
        }
      }
    }
  }
}

