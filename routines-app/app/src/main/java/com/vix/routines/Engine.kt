package com.vix.routines

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

class RoutinesApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Store.init(this)
        Notifier.createChannel(this)
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "auto-check", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<AutoCheckWorker>(15, TimeUnit.MINUTES).build(),
        )
    }
}

/** Every 15 minutes: tick off routines that your app use or Gmail show are done. */
class AutoCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        AutoCheck.run(applicationContext)
        return Result.success()
    }
}

object AutoCheck {
    private val lock = Mutex()

    suspend fun run(context: Context) = lock.withLock {
        val todo = Store.get(context).pending().filter { it.isAuto }
        if (todo.isEmpty()) return@withLock
        val usage = if (todo.any { it.usesAppTime }) Usage.forDay(context) else emptyMap()
        val sent = if (todo.any { it.usesEmails }) Gmail.sentToday(context) else null
        val done = todo.mapNotNull { r ->
            val why = mutableListOf<String>()
            if (r.usesAppTime) {
                val minutes = Usage.minutesIn(usage, r.autoApps)
                if (minutes < r.autoMinutes) return@mapNotNull null
                why += "$minutes min in ${r.autoApps.joinToString { Usage.label(context, it) }}"
            }
            if (r.usesEmails) {
                if (sent == null || sent < r.autoEmails) return@mapNotNull null
                why += "$sent emails sent"
            }
            r to why.joinToString(", ")
        }
        if (done.isEmpty()) return@withLock
        val location = Locator.current(context)
        done.forEach { (r, why) -> Actions.markDone(context, r.id, location, "Ticked automatically: $why") }
    }
}

fun Context.has(permission: String) =
    ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

fun Context.hasLocation() = has(Manifest.permission.ACCESS_FINE_LOCATION)

fun Context.hasBackgroundLocation() =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || has(Manifest.permission.ACCESS_BACKGROUND_LOCATION)

fun Context.hasNotifications() =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || has(Manifest.permission.POST_NOTIFICATIONS)

object Locator {
    /** Where the phone is now, or null if location is off or not allowed. */
    @SuppressLint("MissingPermission")
    suspend fun current(context: Context, timeoutMs: Long = 6000): Location? {
        if (!context.hasLocation()) return null
        val client = LocationServices.getFusedLocationProviderClient(context)
        return try {
            val cts = CancellationTokenSource()
            withTimeoutOrNull(timeoutMs) {
                client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token).await()
            }.also { if (it == null) cts.cancel() } ?: client.lastLocation.await()
        } catch (e: Exception) {
            null
        }
    }
}

object Actions {
    fun markDone(context: Context, routineId: String, location: Location?, note: String? = null) {
        val today = LocalDate.now()
        Store.update(context) { d ->
            val r = d.routine(routineId) ?: return@update d
            if (d.isDone(routineId, today)) return@update d
            d.copy(completions = d.completions + Completion(
                routineId = r.id, title = r.title, date = today.toString(),
                time = System.currentTimeMillis(), lat = location?.latitude, lng = location?.longitude, note = note,
            ))
        }
        Notifier.cancel(context, routineId)
        Scheduler.cancelSnooze(context, routineId)
    }

    fun undo(context: Context, routineId: String) {
        val today = LocalDate.now().toString()
        Store.update(context) { d ->
            d.copy(completions = d.completions.filterNot { it.routineId == routineId && it.date == today })
        }
        Scheduler.scheduleDeadline(context, Store.get(context).routine(routineId))
    }

    fun saveRoutine(context: Context, routine: Routine) {
        Store.update(context) { d ->
            val exists = d.routines.any { it.id == routine.id }
            d.copy(routines = if (exists) d.routines.map { if (it.id == routine.id) routine else it } else d.routines + routine)
        }
        Scheduler.scheduleDeadline(context, routine)
        Scheduler.registerGeofences(context)
    }

    fun deleteRoutine(context: Context, routineId: String) {
        Scheduler.cancelAlarms(context, routineId)
        Notifier.cancel(context, routineId)
        Store.update(context) { d -> d.copy(routines = d.routines.filterNot { it.id == routineId }) }
        Scheduler.registerGeofences(context)
    }

    fun savePlace(context: Context, place: Place) {
        Store.update(context) { d ->
            val exists = d.places.any { it.id == place.id }
            d.copy(places = if (exists) d.places.map { if (it.id == place.id) place else it } else d.places + place)
        }
        Scheduler.registerGeofences(context)
    }

    fun deletePlace(context: Context, placeId: String) {
        Store.update(context) { d ->
            d.copy(
                places = d.places.filterNot { it.id == placeId },
                routines = d.routines.map {
                    if (it.placeId == placeId) it.copy(placeId = null, onArrive = false, onLeave = false) else it
                },
            )
        }
        Scheduler.registerGeofences(context)
    }
}

object Notifier {
    private const val CHANNEL = "reminders"

    fun createChannel(context: Context) {
        val channel = NotificationChannel(CHANNEL, "Routine reminders", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Reminders for routines you haven't done yet"
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun notificationId(routineId: String) = routineId.hashCode()

    @SuppressLint("MissingPermission")
    fun remind(context: Context, routine: Routine, message: String) {
        if (!context.hasNotifications()) return
        fun action(kind: String) = PendingIntent.getBroadcast(
            context, 0,
            Intent(context, ActionReceiver::class.java)
                .setAction(kind)
                .setData(Uri.parse("routine://$kind/${routine.id}"))
                .putExtra(EXTRA_ID, routine.id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notify)
            .setContentTitle(routine.title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(open)
            .setAutoCancel(true)
            .addAction(0, "Mark done", action(ActionReceiver.DONE))
            .addAction(0, "Remind me in 30 min", action(ActionReceiver.SNOOZE))
            .build()
        NotificationManagerCompat.from(context).notify(notificationId(routine.id), n)
    }

    @SuppressLint("MissingPermission")
    fun summary(context: Context, title: String, body: String) {
        if (!context.hasNotifications()) return
        val open = PendingIntent.getActivity(
            context, 1, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notify)
            .setContentTitle(title)
            .setContentText(body.lineSequence().first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(SUMMARY_ID, n)
    }

    private const val SUMMARY_ID = 7_000_001

    fun cancel(context: Context, routineId: String) =
        NotificationManagerCompat.from(context).cancel(notificationId(routineId))
}

const val EXTRA_ID = "routine_id"

object Scheduler {
    private const val DEADLINE = "deadline"
    private const val SNOOZE = "snooze"
    const val SUMMARY = "summary"
    const val SNOOZE_MINUTES = 30L

    fun refreshAll(context: Context) {
        Store.get(context).routines.forEach { scheduleDeadline(context, it) }
        scheduleSummary(context)
        registerGeofences(context)
    }

    fun scheduleSummary(context: Context) {
        val at = Store.get(context).settings.summaryAt
        if (at == null) {
            alarmIntent(context, SUMMARY, "daily", create = false)?.let {
                context.getSystemService(AlarmManager::class.java).cancel(it)
            }
            return
        }
        val now = LocalDateTime.now()
        var next = now.toLocalDate().atTime(at / 60, at % 60)
        if (!next.isAfter(now)) next = next.plusDays(1)
        setAlarm(context, next.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
            alarmIntent(context, SUMMARY, "daily", create = true)!!)
    }

    private fun alarmIntent(context: Context, kind: String, routineId: String, create: Boolean): PendingIntent? =
        PendingIntent.getBroadcast(
            context, 0,
            Intent(context, AlarmReceiver::class.java)
                .setAction(kind)
                .setData(Uri.parse("routine://$kind/$routineId"))
                .putExtra(EXTRA_ID, routineId),
            PendingIntent.FLAG_IMMUTABLE or
                if (create) PendingIntent.FLAG_UPDATE_CURRENT else PendingIntent.FLAG_NO_CREATE,
        )

    private fun setAlarm(context: Context, atMillis: Long, pi: PendingIntent) {
        val am = context.getSystemService(AlarmManager::class.java)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pi)
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pi)
        }
    }

    /** The next moment this routine's deadline passes and it might still be undone. */
    fun nextDeadline(context: Context, routine: Routine, now: LocalDateTime = LocalDateTime.now()): LocalDateTime? {
        val minutes = routine.deadline ?: return null
        val data = Store.get(context)
        for (offset in 0L..7L) {
            val date = now.toLocalDate().plusDays(offset)
            if (!routine.dueOn(date)) continue
            if (offset == 0L && data.isDone(routine.id, date)) continue
            val at = date.atTime(minutes / 60, minutes % 60)
            if (at.isAfter(now)) return at
        }
        return null
    }

    fun scheduleDeadline(context: Context, routine: Routine?) {
        routine ?: return
        val next = nextDeadline(context, routine)
        if (next == null) {
            alarmIntent(context, DEADLINE, routine.id, create = false)?.let {
                context.getSystemService(AlarmManager::class.java).cancel(it)
            }
            return
        }
        val millis = next.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        setAlarm(context, millis, alarmIntent(context, DEADLINE, routine.id, create = true)!!)
    }

    fun snooze(context: Context, routineId: String) {
        val at = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000
        setAlarm(context, at, alarmIntent(context, SNOOZE, routineId, create = true)!!)
    }

    fun cancelSnooze(context: Context, routineId: String) {
        alarmIntent(context, SNOOZE, routineId, create = false)?.let {
            context.getSystemService(AlarmManager::class.java).cancel(it)
        }
    }

    fun cancelAlarms(context: Context, routineId: String) {
        val am = context.getSystemService(AlarmManager::class.java)
        listOf(DEADLINE, SNOOZE).forEach { kind ->
            alarmIntent(context, kind, routineId, create = false)?.let(am::cancel)
        }
    }

    fun isSnooze(intent: Intent) = intent.action == SNOOZE

    private fun geofenceIntent(context: Context) = PendingIntent.getBroadcast(
        context, 0, Intent(context, GeofenceReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0),
    )

    /** Watches every place that a routine wants arrive or leave reminders for. */
    @SuppressLint("MissingPermission")
    fun registerGeofences(context: Context) {
        val client = LocationServices.getGeofencingClient(context)
        val pi = geofenceIntent(context)
        client.removeGeofences(pi)
        if (!context.hasLocation() || !context.hasBackgroundLocation()) return
        val data = Store.get(context)
        val watched = data.routines
            .filter { it.active && (it.onArrive || it.onLeave) }
            .mapNotNull { data.place(it.placeId) }
            .distinctBy { it.id }
            .take(100)
        if (watched.isEmpty()) return
        val fences = watched.map {
            Geofence.Builder()
                .setRequestId(it.id)
                .setCircularRegion(it.lat, it.lng, it.radius.toFloat())
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
                .build()
        }
        val request = GeofencingRequest.Builder()
            .setInitialTrigger(0) // don't fire just because you're already there
            .addGeofences(fences)
            .build()
        try {
            client.addGeofences(request, pi)
        } catch (_: SecurityException) {
        }
    }
}

/** Runs [block] off the main thread and keeps the receiver alive until it finishes. */
private fun BroadcastReceiver.async(block: suspend () -> Unit) {
    val pending = goAsync()
    CoroutineScope(Dispatchers.IO).launch {
        try {
            block()
        } finally {
            pending.finish()
        }
    }
}

/** Fires at a routine's deadline, when a snooze ends, or for the evening summary. */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Scheduler.SUMMARY) {
            async {
                AutoCheck.run(context)
                val (title, body) = Summary.build(context)
                Notifier.summary(context, title, body)
                Scheduler.scheduleSummary(context)
            }
            return
        }
        val id = intent.getStringExtra(EXTRA_ID) ?: return
        async {
            AutoCheck.run(context) // don't nag about something you've already done
            val data = Store.get(context)
            val routine = data.routine(id) ?: return@async
            val today = LocalDate.now()
            if (routine.dueOn(today) && !data.isDone(id, today)) {
                val message = if (Scheduler.isSnooze(intent)) "Still not done. Here's your reminder."
                else "You haven't done this yet. It was due by ${formatMinutes(routine.deadline ?: 0)}."
                Notifier.remind(context, routine, message)
            }
            if (!Scheduler.isSnooze(intent)) Scheduler.scheduleDeadline(context, routine)
        }
    }
}

object Summary {
    fun build(context: Context): Pair<String, String> {
        val data = Store.get(context)
        val today = LocalDate.now()
        val due = data.routines.filter { it.dueOn(today) }
        val missed = data.pending(today)
        val usage = Usage.forDay(context)
        val lines = mutableListOf<String>()
        lines += when {
            due.isEmpty() -> "No routines were due today."
            missed.isEmpty() -> "Everything done. Nice work!"
            else -> "Missed: " + missed.joinToString { it.title }
        }
        if (usage.isNotEmpty()) {
            val top = usage.entries.take(3).joinToString { "${Usage.label(context, it.key)} ${formatDuration(it.value)}" }
            lines += "Screen time: ${formatDuration(usage.values.sum())} ($top)"
        }
        val title = if (due.isEmpty()) "Your day" else "Today: ${due.size - missed.size} of ${due.size} done"
        return title to lines.joinToString("\n")
    }
}

/** Fires when you arrive at or leave one of your places. */
class GeofenceReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) return
        val arriving = event.geofenceTransition == Geofence.GEOFENCE_TRANSITION_ENTER
        val leaving = event.geofenceTransition == Geofence.GEOFENCE_TRANSITION_EXIT
        if (!arriving && !leaving) return
        async { notifyFor(context, event, arriving) }
    }

    private suspend fun notifyFor(context: Context, event: GeofencingEvent, arriving: Boolean) {
        val leaving = !arriving
        AutoCheck.run(context)
        val data = Store.get(context)
        val today = LocalDate.now()
        val placeIds = event.triggeringGeofences.orEmpty().map { it.requestId }.toSet()
        data.routines
            .filter { it.placeId in placeIds && it.dueOn(today) && !data.isDone(it.id, today) }
            .filter { (arriving && it.onArrive) || (leaving && it.onLeave) }
            .forEach { r ->
                val place = data.place(r.placeId)?.name ?: "this place"
                val message = if (arriving) "You're at $place and this isn't done yet."
                else "You're leaving $place and this isn't done yet."
                Notifier.remind(context, r, message)
            }
    }
}

/** Handles the "Mark done" and "Remind me in 30 min" buttons on a reminder. */
class ActionReceiver : BroadcastReceiver() {
    companion object {
        const val DONE = "done"
        const val SNOOZE = "snooze"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_ID) ?: return
        when (intent.action) {
            DONE -> async { Actions.markDone(context, id, Locator.current(context)) }
            SNOOZE -> {
                Notifier.cancel(context, id)
                Scheduler.snooze(context, id)
            }
        }
    }
}

/** Alarms and place watching are cleared on restart or update, so set them up again. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Scheduler.refreshAll(context)
    }
}
