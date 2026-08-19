package com.thesocialbook.notificationreply

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class ReplyMessagingService : FirebaseMessagingService() {

  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    val type = data["type"] ?: ""
    val title = data["title"] ?: "TheSocialBook"
    val body = data["body"] ?: ""
    val convId = data["conversationId"]?.toIntOrNull() ?: 0
    val postId = data["postId"]?.toIntOrNull() ?: 0
    val url = data["url"] ?: ""

    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(nm)

    val appIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      if (convId > 0) putExtra("conversationId", convId)
      if (postId > 0) putExtra("postId", postId)
      if (url.isNotEmpty()) putExtra("url", url)
    }
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      appIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = NotificationCompat.Builder(this, "default")
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)

    if (type == "message" && convId > 0) {
      val replyIntent = Intent(this, ReplyReceiver::class.java).apply {
        putExtra("conversationId", convId)
      }
      val replyPending = PendingIntent.getBroadcast(
        this,
        convId,
        replyIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val remoteInput = RemoteInput.Builder("reply_text").setLabel("Reply").build()
      val action = NotificationCompat.Action.Builder(
        R.drawable.ic_notification,
        "Reply",
        replyPending
      )
        .addRemoteInput(remoteInput)
        .build()
      builder.addAction(action)
    }

    val notifId = if (convId > 0) 1000 + convId else if (postId > 0) 2000 + postId else 9999
    nm.notify(notifId, builder.build())
  }

  private fun ensureChannel(nm: NotificationManager) {
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("default") == null) {
      val channel = NotificationChannel(
        "default",
        "Notifications",
        NotificationManager.IMPORTANCE_HIGH
      )
      channel.enableVibration(true)
      channel.vibrationPattern = longArrayOf(0, 250, 250, 250)
      nm.createNotificationChannel(channel)
    }
  }
}