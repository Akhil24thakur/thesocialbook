package com.thesocialbook.notificationreply

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ReplyReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val result = goAsync()
    val replyText =
      RemoteInput.getResultsFromIntent(intent)?.getCharSequence("reply_text")?.toString() ?: ""
    val convId = intent.getIntExtra("conversationId", 0)
    val prefs = context.getSharedPreferences("notification_reply", Context.MODE_PRIVATE)
    val token = prefs.getString("auth_token", null)
    val apiUrl = prefs.getString("api_url", null)
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (replyText.isBlank() || convId <= 0 || token.isNullOrEmpty() || apiUrl.isNullOrEmpty()) {
      nm.cancel(1000 + convId)
      result.finish()
      return
    }

    Thread {
      var ok = false
      try {
        val payload = JSONObject().put("body", replyText)
        val conn = URL("$apiUrl/api/conversations/$convId/messages").openConnection()
          as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer $token")
        OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
        ok = conn.responseCode in 200..299
        conn.disconnect()
      } catch (_: Exception) {
        ok = false
      }

      val statusText = if (ok) "\u2713 Sent" else "Reply failed - open the app"
      Handler(Looper.getMainLooper()).post {
        val updated = NotificationCompat.Builder(context, "default")
          .setSmallIcon(R.drawable.ic_notification)
          .setContentTitle("TheSocialBook")
          .setContentText(statusText)
          .setAutoCancel(true)
          .build()
        nm.notify(1000 + convId, updated)
        Handler(Looper.getMainLooper()).postDelayed({ nm.cancel(1000 + convId) }, 2500)
        result.finish()
      }
    }.start()
  }
}