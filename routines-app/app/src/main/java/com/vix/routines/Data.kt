package com.vix.routines

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.UUID

/** A saved place, such as Home or Office. */
data class Place(
    val id: String = newId(),
    val name: String,
    val lat: Double,
    val lng: Double,
    val radius: Int = 150,
)

/** Something you want to do on certain days. */
data class Routine(
    val id: String = newId(),
    val title: String,
    /** Days it is due, as java.time DayOfWeek values: 1 = Monday ... 7 = Sunday. */
    val days: Set<Int> = (1..7).toSet(),
    /** Remind me if it is not done by this time (minutes after midnight), or null. */
    val deadline: Int? = null,
    val placeId: String? = null,
    val onArrive: Boolean = false,
    val onLeave: Boolean = false,
    val active: Boolean = true,
    /** Auto-tick: done after this many minutes today in [autoApps] (0 = off). */
    val autoMinutes: Int = 0,
    val autoApps: Set<String> = emptySet(),
    /** Auto-tick: done once this many emails were sent from Gmail today (0 = off). */
    val autoEmails: Int = 0,
) {
    fun dueOn(date: LocalDate) = active && date.dayOfWeek.value in days
    val usesAppTime get() = autoMinutes > 0 && autoApps.isNotEmpty()
    val usesEmails get() = autoEmails > 0
    val isAuto get() = usesAppTime || usesEmails
}

/** A record that a routine was done, with where you were at the time. */
data class Completion(
    val id: String = newId(),
    val routineId: String,
    val title: String,
    val date: String,
    val time: Long,
    val lat: Double? = null,
    val lng: Double? = null,
    /** Set when the app ticked it off by itself, saying why. */
    val note: String? = null,
)

/** Keeps an app closed until today's routines are done, and/or after a daily time limit. */
data class BlockRule(
    val packageName: String,
    val untilDone: Boolean = true,
    /** Block after this many minutes today (0 = no limit). */
    val dailyLimit: Int = 0,
)

data class Settings(
    /** Evening summary time in minutes after midnight, or null for off. */
    val summaryAt: Int? = 21 * 60,
    val gmailConnected: Boolean = false,
    val blockingOn: Boolean = true,
)

data class AppData(
    val places: List<Place> = emptyList(),
    val routines: List<Routine> = emptyList(),
    val completions: List<Completion> = emptyList(),
    val blocks: List<BlockRule> = emptyList(),
    val settings: Settings = Settings(),
    /** Last Gmail check: how many emails were sent on [sentDate]. */
    val sentDate: String? = null,
    val sentCount: Int = 0,
    /** Apps you gave yourself a few extra minutes in: package -> until (epoch millis). */
    val unlocked: Map<String, Long> = emptyMap(),
) {
    fun place(id: String?) = places.firstOrNull { it.id == id }
    fun routine(id: String?) = routines.firstOrNull { it.id == id }
    fun completion(routineId: String, date: LocalDate) =
        completions.firstOrNull { it.routineId == routineId && it.date == date.toString() }

    fun isDone(routineId: String, date: LocalDate = LocalDate.now()) = completion(routineId, date) != null
    fun pending(date: LocalDate = LocalDate.now()) = routines.filter { it.dueOn(date) && !isDone(it.id, date) }
    fun sentToday() = if (sentDate == LocalDate.now().toString()) sentCount else 0
}

fun newId(): String = UUID.randomUUID().toString()

private val timeFormat = DateTimeFormatter.ofPattern("h:mm a")
fun formatMinutes(minutes: Int): String = LocalTime.of(minutes / 60, minutes % 60).format(timeFormat)

fun formatDuration(millis: Long): String {
    val m = millis / 60_000
    return when {
        m < 1 -> "<1 min"
        m < 60 -> "$m min"
        else -> "${m / 60} h ${m % 60} min"
    }
}

/** Keeps everything in one small JSON file inside the app's private storage. */
object Store {
    private val _data = MutableStateFlow(AppData())
    val data: StateFlow<AppData> = _data
    private var file: File? = null

    @Synchronized
    fun init(context: Context) {
        if (file != null) return
        val f = File(context.applicationContext.filesDir, "data.json")
        file = f
        _data.value = try {
            if (f.exists()) decode(JSONObject(f.readText())) else AppData()
        } catch (e: Exception) {
            AppData()
        }
    }

    fun get(context: Context): AppData {
        init(context)
        return _data.value
    }

    @Synchronized
    fun update(context: Context, change: (AppData) -> AppData): AppData {
        init(context)
        val next = change(_data.value)
        if (next == _data.value) return next
        _data.value = next
        val f = file!!
        val tmp = File(f.parentFile, "data.json.tmp")
        tmp.writeText(encode(next).toString())
        tmp.renameTo(f)
        return next
    }

    private fun Any?.orNull(): Any = this ?: JSONObject.NULL

    private fun encode(d: AppData) = JSONObject().apply {
        put("places", JSONArray(d.places.map { p ->
            JSONObject().put("id", p.id).put("name", p.name).put("lat", p.lat)
                .put("lng", p.lng).put("radius", p.radius)
        }))
        put("routines", JSONArray(d.routines.map { r ->
            JSONObject().put("id", r.id).put("title", r.title)
                .put("days", JSONArray(r.days.sorted()))
                .put("deadline", r.deadline.orNull())
                .put("placeId", r.placeId.orNull())
                .put("onArrive", r.onArrive).put("onLeave", r.onLeave).put("active", r.active)
                .put("autoMinutes", r.autoMinutes).put("autoApps", JSONArray(r.autoApps.sorted()))
                .put("autoEmails", r.autoEmails)
        }))
        put("completions", JSONArray(d.completions.map { c ->
            JSONObject().put("id", c.id).put("routineId", c.routineId).put("title", c.title)
                .put("date", c.date).put("time", c.time)
                .put("lat", c.lat.orNull()).put("lng", c.lng.orNull()).put("note", c.note.orNull())
        }))
        put("blocks", JSONArray(d.blocks.map { b ->
            JSONObject().put("pkg", b.packageName).put("untilDone", b.untilDone).put("dailyLimit", b.dailyLimit)
        }))
        put("settings", JSONObject()
            .put("summaryAt", d.settings.summaryAt.orNull())
            .put("gmailConnected", d.settings.gmailConnected)
            .put("blockingOn", d.settings.blockingOn))
        put("sentDate", d.sentDate.orNull())
        put("sentCount", d.sentCount)
        put("unlocked", JSONObject(d.unlocked.mapValues { it.value }))
    }

    private fun decode(o: JSONObject): AppData {
        fun JSONObject.dbl(k: String) = if (!has(k) || isNull(k)) null else optDouble(k)
        fun JSONObject.int(k: String) = if (!has(k) || isNull(k)) null else optInt(k)
        fun JSONObject.str(k: String) = if (!has(k) || isNull(k)) null else optString(k)
        fun JSONArray?.strings(): Set<String> =
            if (this == null) emptySet() else (0 until length()).map(::getString).toSet()
        fun <T> JSONArray?.objects(f: (JSONObject) -> T): List<T> =
            if (this == null) emptyList() else (0 until length()).map { f(getJSONObject(it)) }

        val s = o.optJSONObject("settings")
        val unlocked = o.optJSONObject("unlocked")
        return AppData(
            places = o.optJSONArray("places").objects {
                Place(it.getString("id"), it.getString("name"), it.getDouble("lat"),
                    it.getDouble("lng"), it.optInt("radius", 150))
            },
            routines = o.optJSONArray("routines").objects {
                val days = it.optJSONArray("days")
                Routine(
                    id = it.getString("id"),
                    title = it.getString("title"),
                    days = if (days == null) (1..7).toSet() else (0 until days.length()).map(days::getInt).toSet(),
                    deadline = it.int("deadline"),
                    placeId = it.str("placeId"),
                    onArrive = it.optBoolean("onArrive"),
                    onLeave = it.optBoolean("onLeave"),
                    active = it.optBoolean("active", true),
                    autoMinutes = it.optInt("autoMinutes"),
                    autoApps = it.optJSONArray("autoApps").strings(),
                    autoEmails = it.optInt("autoEmails"),
                )
            },
            completions = o.optJSONArray("completions").objects {
                Completion(it.getString("id"), it.getString("routineId"), it.getString("title"),
                    it.getString("date"), it.getLong("time"), it.dbl("lat"), it.dbl("lng"), it.str("note"))
            },
            blocks = o.optJSONArray("blocks").objects {
                BlockRule(it.getString("pkg"), it.optBoolean("untilDone", true), it.optInt("dailyLimit"))
            },
            settings = if (s == null) Settings() else Settings(
                summaryAt = if (s.has("summaryAt")) s.int("summaryAt") else 21 * 60,
                gmailConnected = s.optBoolean("gmailConnected"),
                blockingOn = s.optBoolean("blockingOn", true),
            ),
            sentDate = o.str("sentDate"),
            sentCount = o.optInt("sentCount"),
            unlocked = unlocked?.keys()?.asSequence()?.associateWith { unlocked.getLong(it) } ?: emptyMap(),
        )
    }
}
