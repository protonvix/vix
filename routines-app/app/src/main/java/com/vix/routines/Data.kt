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
) {
    fun dueOn(date: LocalDate) = active && date.dayOfWeek.value in days
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
)

data class AppData(
    val places: List<Place> = emptyList(),
    val routines: List<Routine> = emptyList(),
    val completions: List<Completion> = emptyList(),
) {
    fun place(id: String?) = places.firstOrNull { it.id == id }
    fun routine(id: String?) = routines.firstOrNull { it.id == id }
    fun completion(routineId: String, date: LocalDate) =
        completions.firstOrNull { it.routineId == routineId && it.date == date.toString() }

    fun isDone(routineId: String, date: LocalDate = LocalDate.now()) = completion(routineId, date) != null
}

fun newId(): String = UUID.randomUUID().toString()

private val timeFormat = DateTimeFormatter.ofPattern("h:mm a")
fun formatMinutes(minutes: Int): String = LocalTime.of(minutes / 60, minutes % 60).format(timeFormat)

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
        _data.value = next
        val f = file!!
        val tmp = File(f.parentFile, "data.json.tmp")
        tmp.writeText(encode(next).toString())
        tmp.renameTo(f)
        return next
    }

    private fun encode(d: AppData) = JSONObject().apply {
        put("places", JSONArray(d.places.map { p ->
            JSONObject().put("id", p.id).put("name", p.name).put("lat", p.lat)
                .put("lng", p.lng).put("radius", p.radius)
        }))
        put("routines", JSONArray(d.routines.map { r ->
            JSONObject().put("id", r.id).put("title", r.title)
                .put("days", JSONArray(r.days.sorted()))
                .put("deadline", r.deadline ?: JSONObject.NULL)
                .put("placeId", r.placeId ?: JSONObject.NULL)
                .put("onArrive", r.onArrive).put("onLeave", r.onLeave).put("active", r.active)
        }))
        put("completions", JSONArray(d.completions.map { c ->
            JSONObject().put("id", c.id).put("routineId", c.routineId).put("title", c.title)
                .put("date", c.date).put("time", c.time)
                .put("lat", c.lat ?: JSONObject.NULL).put("lng", c.lng ?: JSONObject.NULL)
        }))
    }

    private fun decode(o: JSONObject): AppData {
        fun JSONObject.optDoubleOrNull(k: String) = if (isNull(k)) null else optDouble(k)
        fun JSONObject.optIntOrNull(k: String) = if (isNull(k)) null else optInt(k)
        fun JSONObject.optStringOrNull(k: String) = if (isNull(k)) null else optString(k)
        fun <T> JSONArray?.map(f: (JSONObject) -> T): List<T> =
            if (this == null) emptyList() else (0 until length()).map { f(getJSONObject(it)) }

        return AppData(
            places = o.optJSONArray("places").map {
                Place(it.getString("id"), it.getString("name"), it.getDouble("lat"),
                    it.getDouble("lng"), it.optInt("radius", 150))
            },
            routines = o.optJSONArray("routines").map {
                val days = it.optJSONArray("days")
                Routine(
                    id = it.getString("id"),
                    title = it.getString("title"),
                    days = if (days == null) (1..7).toSet() else (0 until days.length()).map(days::getInt).toSet(),
                    deadline = it.optIntOrNull("deadline"),
                    placeId = it.optStringOrNull("placeId"),
                    onArrive = it.optBoolean("onArrive"),
                    onLeave = it.optBoolean("onLeave"),
                    active = it.optBoolean("active", true),
                )
            },
            completions = o.optJSONArray("completions").map {
                Completion(it.getString("id"), it.getString("routineId"), it.getString("title"),
                    it.getString("date"), it.getLong("time"), it.optDoubleOrNull("lat"),
                    it.optDoubleOrNull("lng"))
            },
        )
    }
}
