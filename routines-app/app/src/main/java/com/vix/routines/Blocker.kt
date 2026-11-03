package com.vix.routines

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import kotlinx.coroutines.launch

object Blocker {
    const val EXTRA_PKG = "pkg"
    const val GRACE_MINUTES = 5L

    fun isEnabled(context: Context): Boolean {
        val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(context, BlockerService::class.java).flattenToString()
        return enabled.split(':').any { it.equals(me, ignoreCase = true) }
    }

    fun openSettings(context: Context) {
        context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Why [pkg] should be blocked right now, or null if it's allowed. */
    fun reason(context: Context, pkg: String): String? {
        val data = Store.get(context)
        if (!data.settings.blockingOn) return null
        val rule = data.blocks.firstOrNull { it.packageName == pkg } ?: return null
        if ((data.unlocked[pkg] ?: 0L) > System.currentTimeMillis()) return null
        if (rule.untilDone) {
            val pending = data.pending()
            if (pending.isNotEmpty()) return "Finish today's routines first:\n" + pending.joinToString("\n") { "• ${it.title}" }
        }
        if (rule.dailyLimit > 0) {
            val used = (Usage.forDay(context)[pkg] ?: 0L) / 60_000
            if (used >= rule.dailyLimit) return "You've used your ${rule.dailyLimit} minutes for today."
        }
        return null
    }

    fun allowFor(context: Context, pkg: String, minutes: Long) {
        Store.update(context) {
            val now = System.currentTimeMillis()
            it.copy(unlocked = it.unlocked.filterValues { until -> until > now } + (pkg to now + minutes * 60_000))
        }
    }
}

/** Watches which app is on screen and covers blocked ones. */
class BlockerService : AccessibilityService() {
    private val handler = Handler(Looper.getMainLooper())
    private var current: String? = null
    private var lastBlock = 0L

    /** Checks again every minute, so a time limit kicks in while you're still scrolling. */
    private val recheck = object : Runnable {
        override fun run() {
            current?.let(::check)
            handler.postDelayed(this, 60_000)
        }
    }

    override fun onServiceConnected() {
        handler.postDelayed(recheck, 60_000)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName || pkg == "com.android.systemui") return
        current = pkg
        check(pkg)
    }

    private fun check(pkg: String) {
        if (Store.get(this).blocks.none { it.packageName == pkg }) return
        val now = System.currentTimeMillis()
        if (now - lastBlock < 1500) return
        if (Blocker.reason(this, pkg) == null) return
        lastBlock = now
        performGlobalAction(GLOBAL_ACTION_HOME)
        startActivity(Intent(this, BlockActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(Blocker.EXTRA_PKG, pkg))
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        handler.removeCallbacks(recheck)
        super.onDestroy()
    }
}

/** The screen you see instead of a blocked app. */
class BlockActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pkg = intent.getStringExtra(Blocker.EXTRA_PKG) ?: return finish()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = goHome()
        })
        setContent { MaterialTheme(colorScheme = appColors()) { BlockScreen(pkg) } }
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    @Composable
    private fun BlockScreen(pkg: String) {
        val ctx = LocalContext.current
        val scope = rememberCoroutineScope()
        var reason by remember { mutableStateOf(Blocker.reason(ctx, pkg)) }
        var checking by remember { mutableStateOf(false) }
        val name = remember { Usage.label(ctx, pkg) }
        val icon = remember { Usage.icon(ctx, pkg)?.toBitmap(160, 160)?.asImageBitmap() }

        Surface(Modifier.fillMaxSize()) {
            Column(
                Modifier.fillMaxSize().systemBarsPadding().padding(28.dp),
                verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                icon?.let { Image(it, null, Modifier.size(72.dp)) }
                Spacer(Modifier.height(20.dp))
                if (reason == null) {
                    Text("$name is open again", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = {
                        ctx.packageManager.getLaunchIntentForPackage(pkg)?.let { startActivity(it) }
                        finish()
                    }) { Text("Open $name") }
                } else {
                    Text("$name is blocked", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(12.dp))
                    Text(reason!!, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(28.dp))
                    Button(onClick = {
                        startActivity(Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        finish()
                    }, Modifier.fillMaxWidth()) { Text("Open my routines") }
                    OutlinedButton(enabled = !checking, onClick = {
                        checking = true
                        scope.launch {
                            AutoCheck.run(ctx)
                            reason = Blocker.reason(ctx, pkg)
                            checking = false
                        }
                    }, modifier = Modifier.fillMaxWidth()) { Text(if (checking) "Checking..." else "I've done them, check again") }
                    TextButton(onClick = {
                        Blocker.allowFor(ctx, pkg, Blocker.GRACE_MINUTES)
                        ctx.packageManager.getLaunchIntentForPackage(pkg)?.let { startActivity(it) }
                        finish()
                    }) { Text("Let me in for ${Blocker.GRACE_MINUTES} minutes") }
                    TextButton(onClick = ::goHome) { Text("Go back") }
                }
            }
        }
    }
}
