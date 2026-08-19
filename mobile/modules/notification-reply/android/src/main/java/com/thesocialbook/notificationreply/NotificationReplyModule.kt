package com.thesocialbook.notificationreply

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationReplyModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun prefs(): android.content.SharedPreferences =
    context.getSharedPreferences("notification_reply", Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("NotificationReply")

    AsyncFunction("setAuth") { token: String ->
      prefs().edit().putString("auth_token", token).apply()
    }

    AsyncFunction("setApiUrl") { url: String ->
      prefs().edit().putString("api_url", url).apply()
    }

    AsyncFunction("getInitialNotification") { ->
      val activity = appContext.currentActivity ?: return@AsyncFunction null
      val intent = activity.intent ?: return@AsyncFunction null
      val data = mutableMapOf<String, Any>()
      val convId = intent.getIntExtra("conversationId", 0)
      if (convId > 0) data["conversationId"] = convId
      val postId = intent.getIntExtra("postId", 0)
      if (postId > 0) data["postId"] = postId
      val url = intent.getStringExtra("url")
      if (!url.isNullOrEmpty()) data["url"] = url
      if (data.isEmpty()) return@AsyncFunction null
      intent.removeExtra("conversationId")
      intent.removeExtra("postId")
      intent.removeExtra("url")
      return@AsyncFunction data
    }
  }
}