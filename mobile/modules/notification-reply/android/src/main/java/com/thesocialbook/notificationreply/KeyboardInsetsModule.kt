package com.thesocialbook.notificationreply

import android.content.Context
import android.graphics.Rect
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowInsets
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KeyboardInsetsModule : Module() {
  private var attached = false
  private var lastHeightDp = 0

  private fun context(): Context =
    appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("KeyboardInsets")
    Events("onKeyboardHeight")

    AsyncFunction("attach") {
      if (attached) return@AsyncFunction null
      attached = true
      val activity = appContext.currentActivity ?: return@AsyncFunction null
      activity.runOnUiThread {
        val root = activity.window.decorView
        if (Build.VERSION.SDK_INT >= 30) {
          root.setOnApplyWindowInsetsListener { v, insets ->
            val imePx = insets.getInsets(WindowInsets.Type.ime()).bottom
            publish(v, imePx)
            insets
          }
        }
        val observer = object : ViewTreeObserver.OnGlobalLayoutListener {
          override fun onGlobalLayout() {
            val frame = Rect()
            root.getWindowVisibleDisplayFrame(frame)
            val kbPx = root.height - frame.bottom
            if (kbPx > 0) publish(root, kbPx)
          }
        }
        root.viewTreeObserver.addOnGlobalLayoutListener(observer)
      }
    }
  }

  private fun publish(v: View, px: Int) {
    val dp = (px / v.resources.displayMetrics.density).toInt()
    val reported = if (dp > 80) dp else 0
    if (reported != lastHeightDp) {
      lastHeightDp = reported
      sendEvent("onKeyboardHeight", mapOf("height" to reported))
    }
  }
}