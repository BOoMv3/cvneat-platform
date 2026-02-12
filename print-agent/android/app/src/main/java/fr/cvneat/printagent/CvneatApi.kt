package fr.cvneat.printagent

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

data class PrintJob(
  val notificationId: String,
  val text: String
)

object CvneatApi {
  private val http = OkHttpClient()
  private val json = "application/json; charset=utf-8".toMediaType()

  suspend fun fetchPrintJobs(token: String): List<PrintJob> {
    return withContext(Dispatchers.IO) {
      val url = "${AppConfig.CVNEAT_BASE_URL}/api/partner/notifications?unreadOnly=1&type=print_receipt&limit=5"
      val req = Request.Builder()
        .url(url)
        .get()
        .addHeader("Authorization", "Bearer $token")
        .addHeader("Accept", "application/json")
        .build()

      http.newCall(req).execute().use { res ->
        val txt = res.body?.string() ?: "[]"
        if (!res.isSuccessful) {
          throw RuntimeException("fetchPrintJobs failed (HTTP ${res.code}): $txt")
        }
        val arr = JSONArray(txt)
        val jobs = ArrayList<PrintJob>()
        for (i in 0 until arr.length()) {
          val o = arr.getJSONObject(i)
          val id = o.optString("id")
          val data = o.optJSONObject("data")
          val text = data?.optString("text") ?: ""
          if (id.isNotBlank() && text.isNotBlank()) {
            jobs.add(PrintJob(id, text))
          }
        }
        jobs
      }
    }
  }

  suspend fun markPrinted(token: String, notificationId: String) {
    return withContext(Dispatchers.IO) {
      val url = "${AppConfig.CVNEAT_BASE_URL}/api/partner/notifications"
      val body = JSONObject().put("notificationId", notificationId).toString()
      val req = Request.Builder()
        .url(url)
        .patch(body.toRequestBody(json))
        .addHeader("Authorization", "Bearer $token")
        .addHeader("Content-Type", "application/json")
        .addHeader("Accept", "application/json")
        .build()

      http.newCall(req).execute().use { res ->
        val txt = res.body?.string() ?: ""
        if (!res.isSuccessful) {
          throw RuntimeException("markPrinted failed (HTTP ${res.code}): $txt")
        }
      }
    }
  }
}

