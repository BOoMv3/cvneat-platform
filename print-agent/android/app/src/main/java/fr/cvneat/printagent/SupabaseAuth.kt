package fr.cvneat.printagent

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object SupabaseAuth {
  private val http = OkHttpClient()
  private val json = "application/json; charset=utf-8".toMediaType()

  suspend fun login(email: String, password: String): String {
    return withContext(Dispatchers.IO) {
      val url = "${AppConfig.SUPABASE_URL}/auth/v1/token?grant_type=password"
      val bodyJson = JSONObject()
        .put("email", email)
        .put("password", password)
        .toString()
      val req = Request.Builder()
        .url(url)
        .post(bodyJson.toRequestBody(json))
        .addHeader("apikey", AppConfig.SUPABASE_ANON_KEY)
        .addHeader("Authorization", "Bearer ${AppConfig.SUPABASE_ANON_KEY}")
        .addHeader("Content-Type", "application/json")
        .build()

      http.newCall(req).execute().use { res ->
        val txt = res.body?.string() ?: ""
        if (!res.isSuccessful) {
          throw RuntimeException("Login failed (HTTP ${res.code}): $txt")
        }
        val obj = JSONObject(txt)
        obj.getString("access_token")
      }
    }
  }
}

