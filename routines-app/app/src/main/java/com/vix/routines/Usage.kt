package com.vix.routines

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.provider.Settings
import java.time.LocalDate
import java.time.ZoneId

data class AppInfo(val packageName: String, val label: String)

/** Reads how long you spent in each app, using Android's "Usage access". */
object Usage {
    fun hasAccess(context: Context): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java)
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        } else {
            @Suppress("DEPRECATION")
            ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun openSettings(context: Context) {
        context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun startOf(date: LocalDate) = date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

    /** Home screen and system apps whose "time" isn't really app use. */
    private fun ignored(context: Context): Set<String> {
        val home = context.packageManager
            .queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)
            .map { it.activityInfo.packageName }
        return (home + context.packageName + "com.android.systemui").toSet()
    }

    /** Time in the foreground per app on [date], in milliseconds, longest first. */
    fun forDay(context: Context, date: LocalDate = LocalDate.now()): Map<String, Long> {
        if (!hasAccess(context)) return emptyMap()
        val start = startOf(date)
        val end = minOf(startOf(date.plusDays(1)), System.currentTimeMillis())
        if (end <= start) return emptyMap()
        val usm = context.getSystemService(UsageStatsManager::class.java)
        val events = usm.queryEvents(start, end)
        val totals = HashMap<String, Long>()
        val skip = ignored(context)
        var current: String? = null
        var since = 0L
        fun close(at: Long) {
            val pkg = current ?: return
            if (pkg !in skip) totals[pkg] = (totals[pkg] ?: 0L) + (at - since).coerceAtLeast(0)
            current = null
        }
        val e = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            when (e.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    if (current != e.packageName) {
                        close(e.timeStamp)
                        current = e.packageName
                        since = e.timeStamp
                    }
                }
                UsageEvents.Event.ACTIVITY_PAUSED -> if (current == e.packageName) close(e.timeStamp)
                UsageEvents.Event.SCREEN_NON_INTERACTIVE, UsageEvents.Event.DEVICE_SHUTDOWN -> close(e.timeStamp)
            }
        }
        close(end)
        return totals.filterValues { it >= 1000 }.toList().sortedByDescending { it.second }.toMap()
    }

    fun minutesIn(usage: Map<String, Long>, apps: Set<String>) = apps.sumOf { usage[it] ?: 0L } / 60_000

    // ---------- app names and icons ----------

    private val labels = HashMap<String, String>()

    fun label(context: Context, pkg: String): String = labels.getOrPut(pkg) {
        try {
            val pm = context.packageManager
            pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            pkg.substringAfterLast('.')
        }
    }

    fun icon(context: Context, pkg: String): Drawable? = try {
        context.packageManager.getApplicationIcon(pkg)
    } catch (e: PackageManager.NameNotFoundException) {
        null
    }

    /** Every app with a home screen icon, sorted by name. */
    fun launchableApps(context: Context): List<AppInfo> {
        val pm = context.packageManager
        return pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            .map { it.activityInfo.packageName }
            .filter { it != context.packageName }
            .distinct()
            .map { AppInfo(it, label(context, it)) }
            .sortedBy { it.label.lowercase() }
    }
}
