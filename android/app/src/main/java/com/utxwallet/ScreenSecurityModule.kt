package com.utxwallet

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes window FLAG_SECURE to JavaScript.
 *
 * When enabled, the OS prevents:
 *  - Screenshots (both user and system-level)
 *  - Recording the screen
 *  - Showing app content in the recent-apps switcher
 */
class ScreenSecurityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenSecurity"

    @ReactMethod
    fun enable() {
        val activity = reactContext.currentActivity
        activity?.runOnUiThread {
            activity.window?.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE,
            )
        }
    }

    @ReactMethod
    fun disable() {
        val activity = reactContext.currentActivity
        activity?.runOnUiThread {
            activity.window?.clearFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
            )
        }
    }
}
