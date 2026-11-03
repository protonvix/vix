package com.vix.routines

import android.Manifest
import android.annotation.SuppressLint
import android.app.TimePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val dark = isSystemInDarkTheme()
            val ctx = LocalContext.current
            val colors = when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
                    if (dark) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
                dark -> darkColorScheme()
                else -> lightColorScheme()
            }
            MaterialTheme(colorScheme = colors) { App() }
        }
    }

    override fun onResume() {
        super.onResume()
        Scheduler.refreshAll(this)
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Today("Today", Icons.Outlined.CheckCircle),
    Routines("Routines", Icons.Outlined.Repeat),
    Places("Places", Icons.Outlined.Place),
    History("History", Icons.Outlined.History),
}

private val dayLetters = listOf("M", "T", "W", "T", "F", "S", "S")
private val timeFmt = DateTimeFormatter.ofPattern("h:mm a")
private val dateFmt = DateTimeFormatter.ofPattern("EEEE, d MMMM")

@Composable
private fun App() {
    val data by Store.data.collectAsState()
    var tab by rememberSaveable { mutableStateOf(Tab.Today) }
    var editingRoutine by remember { mutableStateOf<Routine?>(null) }
    var editingPlace by remember { mutableStateOf<Place?>(null) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach {
                    NavigationBarItem(
                        selected = tab == it, onClick = { tab = it },
                        icon = { Icon(it.icon, null) }, label = { Text(it.label) },
                    )
                }
            }
        },
        floatingActionButton = {
            when (tab) {
                Tab.Today, Tab.Routines -> ExtendedFloatingActionButton(
                    onClick = { editingRoutine = Routine(title = "") },
                    icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Routine") },
                )
                Tab.Places -> ExtendedFloatingActionButton(
                    onClick = { editingPlace = Place(name = "", lat = 0.0, lng = 0.0) },
                    icon = { Icon(Icons.Outlined.AddLocationAlt, null) }, text = { Text("Place") },
                )
                Tab.History -> {}
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when (tab) {
                Tab.Today -> TodayScreen(data, onEdit = { editingRoutine = it })
                Tab.Routines -> RoutinesScreen(data, onEdit = { editingRoutine = it })
                Tab.Places -> PlacesScreen(data, onEdit = { editingPlace = it })
                Tab.History -> HistoryScreen(data)
            }
        }
    }

    editingRoutine?.let { r ->
        RoutineEditor(r, data, onDismiss = { editingRoutine = null }, onAddPlace = {
            editingRoutine = null
            tab = Tab.Places
            editingPlace = Place(name = "", lat = 0.0, lng = 0.0)
        })
    }
    editingPlace?.let { p -> PlaceEditor(p, onDismiss = { editingPlace = null }) }
}

@Composable
private fun Header(title: String, subtitle: String? = null) {
    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 8.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
        if (subtitle != null) {
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun Empty(text: String) {
    Text(
        text, Modifier.fillMaxWidth().padding(32.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge,
    )
}

private fun describe(r: Routine, data: AppData): String {
    val parts = mutableListOf<String>()
    r.deadline?.let { parts += "By ${formatMinutes(it)}" }
    data.place(r.placeId)?.let { p ->
        val when_ = listOfNotNull(if (r.onArrive) "arrive" else null, if (r.onLeave) "leave" else null)
        parts += if (when_.isEmpty()) p.name else "${p.name} (${when_.joinToString(" / ")})"
    }
    if (parts.isEmpty()) parts += "No reminder set"
    return parts.joinToString(" · ")
}

// ---------- Today ----------

@Composable
private fun TodayScreen(data: AppData, onEdit: (Routine) -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val today = LocalDate.now()
    val due = data.routines.filter { it.dueOn(today) }.sortedBy { it.deadline ?: Int.MAX_VALUE }
    val doneCount = due.count { data.isDone(it.id, today) }

    LazyColumn(contentPadding = PaddingValues(bottom = 96.dp)) {
        item {
            Header(today.format(dateFmt),
                if (due.isEmpty()) null else "$doneCount of ${due.size} done today")
        }
        item { PermissionsCard() }
        if (due.isNotEmpty()) {
            item {
                LinearProgressIndicator(
                    progress = { doneCount.toFloat() / due.size },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                )
            }
        }
        if (due.isEmpty()) item { Empty("Nothing due today. Tap \"Routine\" to add things like \"Send emails\" or \"Send outreach\".") }
        items(due, key = { it.id }) { r ->
            val done = data.completion(r.id, today)
            Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp).clickable { onEdit(r) }) {
                Row(Modifier.padding(start = 4.dp, end = 16.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = done != null, onCheckedChange = { checked ->
                        if (checked) scope.launch { Actions.markDone(ctx, r.id, Locator.current(ctx)) }
                        else Actions.undo(ctx, r.id)
                    })
                    Column(Modifier.weight(1f)) {
                        Text(
                            r.title, style = MaterialTheme.typography.titleMedium,
                            textDecoration = if (done != null) TextDecoration.LineThrough else null,
                        )
                        Text(
                            if (done != null) "Done at ${Instant.ofEpochMilli(done.time).atZone(ZoneId.systemDefault()).format(timeFmt)}"
                            else describe(r, data),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

/** Shows only the permissions still missing, each with a button to allow it. */
@Composable
private fun PermissionsCard() {
    val ctx = LocalContext.current
    var tick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { tick++ }
    val refresh = { tick++; Scheduler.refreshAll(ctx) }

    val notify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { refresh() }
    val location = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refresh() }
    val background = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { refresh() }

    key(tick) {
        val power = ctx.getSystemService(PowerManager::class.java)
        val rows = buildList {
            if (!ctx.hasNotifications() && Build.VERSION.SDK_INT >= 33) add(Triple(
                "Notifications", "So the app can remind you.",
            ) { notify.launch(Manifest.permission.POST_NOTIFICATIONS) })
            if (!ctx.hasLocation()) add(Triple(
                "Location", "So it knows where you are and can log where you did each task.",
            ) { location.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) })
            else if (!ctx.hasBackgroundLocation() && Build.VERSION.SDK_INT >= 29) add(Triple(
                "Location all the time", "Choose \"Allow all the time\" so arrive/leave reminders work while the app is closed.",
            ) { background.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION) })
            if (!power.isIgnoringBatteryOptimizations(ctx.packageName)) add(Triple(
                "Battery", "Stop battery saver from delaying your reminders.",
            ) { requestBatteryExemption(ctx) })
        }
        if (rows.isNotEmpty()) {
            ElevatedCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Finish setup", style = MaterialTheme.typography.titleMedium)
                    rows.forEach { (title, why, onClick) ->
                        Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f).padding(end = 12.dp)) {
                                Text(title, fontWeight = FontWeight.Medium)
                                Text(why, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            FilledTonalButton(onClick = onClick) { Text("Allow") }
                        }
                    }
                }
            }
        }
    }
}

@SuppressLint("BatteryLife")
private fun requestBatteryExemption(ctx: Context) {
    try {
        ctx.startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}")))
    } catch (_: Exception) {
        ctx.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }
}

// ---------- Routines ----------

@Composable
private fun RoutinesScreen(data: AppData, onEdit: (Routine) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(bottom = 96.dp)) {
        item { Header("Routines", "Tap one to change it") }
        if (data.routines.isEmpty()) item { Empty("No routines yet.") }
        items(data.routines, key = { it.id }) { r ->
            ListItem(
                modifier = Modifier.clickable { onEdit(r) },
                headlineContent = { Text(r.title) },
                supportingContent = {
                    val days = if (r.days.size == 7) "Every day"
                    else if (r.days == (1..5).toSet()) "Weekdays"
                    else r.days.sorted().joinToString(" ") { java.time.DayOfWeek.of(it).name.take(3).lowercase().replaceFirstChar(Char::uppercase) }
                    Text("$days · ${describe(r, data)}")
                },
                trailingContent = { if (!r.active) Text("Paused", color = MaterialTheme.colorScheme.onSurfaceVariant) },
            )
            HorizontalDivider()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun RoutineEditor(initial: Routine, data: AppData, onDismiss: () -> Unit, onAddPlace: () -> Unit) {
    val ctx = LocalContext.current
    val isNew = data.routine(initial.id) == null
    var title by remember { mutableStateOf(initial.title) }
    var days by remember { mutableStateOf(initial.days) }
    var deadline by remember { mutableStateOf(initial.deadline) }
    var placeId by remember { mutableStateOf(initial.placeId) }
    var onArrive by remember { mutableStateOf(initial.onArrive) }
    var onLeave by remember { mutableStateOf(initial.onLeave) }
    var active by remember { mutableStateOf(initial.active) }
    var placeMenu by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "New routine" else "Edit routine") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(title, { title = it }, label = { Text("What to do") },
                    placeholder = { Text("Send outreach") }, singleLine = true, modifier = Modifier.fillMaxWidth())

                Text("Days", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    (1..7).forEach { d ->
                        FilterChip(selected = d in days, onClick = { days = if (d in days) days - d else days + d },
                            label = { Text(dayLetters[d - 1]) })
                    }
                }

                Text("Remind me at a time", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 16.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        if (deadline == null) "Off" else "If not done by ${formatMinutes(deadline!!)}",
                        Modifier.weight(1f),
                    )
                    Switch(checked = deadline != null, onCheckedChange = { deadline = if (it) 9 * 60 else null })
                }
                if (deadline != null) {
                    TextButton(onClick = {
                        val d = deadline!!
                        TimePickerDialog(ctx, { _, h, m -> deadline = h * 60 + m }, d / 60, d % 60, false).show()
                    }) { Text("Change time") }
                }

                Text("Remind me at a place", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp))
                ExposedDropdownMenuBox(expanded = placeMenu, onExpandedChange = { placeMenu = it }) {
                    OutlinedTextField(
                        value = data.place(placeId)?.name ?: "No place",
                        onValueChange = {}, readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(placeMenu) },
                        modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
                    )
                    ExposedDropdownMenu(expanded = placeMenu, onDismissRequest = { placeMenu = false }) {
                        DropdownMenuItem(text = { Text("No place") }, onClick = { placeId = null; placeMenu = false })
                        data.places.forEach { p ->
                            DropdownMenuItem(text = { Text(p.name) }, onClick = {
                                placeId = p.id
                                if (!onArrive && !onLeave) onArrive = true
                                placeMenu = false
                            })
                        }
                        DropdownMenuItem(text = { Text("+ Add a new place") }, onClick = { placeMenu = false; onAddPlace() })
                    }
                }
                if (placeId != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(onArrive, { onArrive = it }); Text("When I arrive, if not done")
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(onLeave, { onLeave = it }); Text("When I leave, if not done")
                    }
                }

                if (!isNew) {
                    Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Active", Modifier.weight(1f))
                        Switch(checked = active, onCheckedChange = { active = it })
                    }
                    TextButton(
                        onClick = { Actions.deleteRoutine(ctx, initial.id); onDismiss() },
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    ) { Text("Delete routine") }
                }
            }
        },
        confirmButton = {
            TextButton(enabled = title.isNotBlank() && days.isNotEmpty(), onClick = {
                Actions.saveRoutine(ctx, initial.copy(
                    title = title.trim(), days = days, deadline = deadline, placeId = placeId,
                    onArrive = placeId != null && onArrive, onLeave = placeId != null && onLeave, active = active,
                ))
                onDismiss()
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

// ---------- Places ----------

@Composable
private fun PlacesScreen(data: AppData, onEdit: (Place) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(bottom = 96.dp)) {
        item { Header("Places", "Where you want reminders, like Home or Office") }
        if (data.places.isEmpty()) item { Empty("No places yet. Go to the place, tap \"Place\" and use your current location.") }
        items(data.places, key = { it.id }) { p ->
            val used = data.routines.count { it.placeId == p.id }
            ListItem(
                modifier = Modifier.clickable { onEdit(p) },
                leadingContent = { Icon(Icons.Outlined.Place, null) },
                headlineContent = { Text(p.name) },
                supportingContent = { Text("${p.radius} m around this spot · used by $used routine${if (used == 1) "" else "s"}") },
            )
            HorizontalDivider()
        }
    }
}

@Composable
private fun PlaceEditor(initial: Place, onDismiss: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val isNew = Store.get(ctx).place(initial.id) == null
    var name by remember { mutableStateOf(initial.name) }
    var lat by remember { mutableStateOf(if (isNew) "" else initial.lat.toString()) }
    var lng by remember { mutableStateOf(if (isNew) "" else initial.lng.toString()) }
    var radius by remember { mutableFloatStateOf(initial.radius.toFloat()) }
    var locating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val latD = lat.toDoubleOrNull()
    val lngD = lng.toDoubleOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "New place" else "Edit place") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(name, { name = it }, label = { Text("Name") }, placeholder = { Text("Office") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                Button(
                    onClick = {
                        if (!ctx.hasLocation()) { error = "Allow location on the Today tab first."; return@Button }
                        locating = true; error = null
                        scope.launch {
                            val loc = Locator.current(ctx, 15000)
                            locating = false
                            if (loc == null) error = "Couldn't get your location. Is location turned on?"
                            else { lat = "%.6f".format(java.util.Locale.US, loc.latitude); lng = "%.6f".format(java.util.Locale.US, loc.longitude) }
                        }
                    },
                    enabled = !locating, modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                ) {
                    Icon(Icons.Outlined.MyLocation, null); Spacer(Modifier.width(8.dp))
                    Text(if (locating) "Finding you..." else "Use my current location")
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(lat, { lat = it }, label = { Text("Latitude") }, singleLine = true, modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    OutlinedTextField(lng, { lng = it }, label = { Text("Longitude") }, singleLine = true, modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                }
                if (latD != null && lngD != null) {
                    TextButton(onClick = { openMap(ctx, latD, lngD) }) { Text("Check it on the map") }
                }
                Text("Area: ${radius.roundToInt()} m around the spot", Modifier.padding(top = 8.dp))
                Slider(radius, { radius = (it / 50).roundToInt() * 50f }, valueRange = 100f..1000f)
                Text("Bigger areas trigger more reliably. 150 m or more works best.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!isNew) {
                    TextButton(
                        onClick = { Actions.deletePlace(ctx, initial.id); onDismiss() },
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    ) { Text("Delete place") }
                }
            }
        },
        confirmButton = {
            TextButton(enabled = name.isNotBlank() && latD != null && lngD != null, onClick = {
                Actions.savePlace(ctx, initial.copy(name = name.trim(), lat = latD!!, lng = lngD!!, radius = radius.roundToInt()))
                onDismiss()
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

private fun openMap(ctx: Context, lat: Double, lng: Double) {
    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$lat,$lng")))
}

// ---------- History ----------

@Composable
private fun HistoryScreen(data: AppData) {
    val ctx = LocalContext.current
    val byDay = data.completions.sortedByDescending { it.time }.groupBy { it.date }
    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
        item { Header("History", "What you did, when and where") }
        if (byDay.isEmpty()) item { Empty("Nothing done yet. Tick off a routine and it shows up here.") }
        byDay.forEach { (date, list) ->
            item(key = date) {
                val d = LocalDate.parse(date)
                val due = data.routines.count { it.dueOn(d) }
                Text(
                    d.format(dateFmt) + if (due > 0) "  ·  ${list.size} of $due" else "",
                    style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(start = 20.dp, top = 20.dp, bottom = 4.dp),
                )
            }
            items(list, key = { it.id }) { c ->
                val time = Instant.ofEpochMilli(c.time).atZone(ZoneId.systemDefault()).format(timeFmt)
                val near = if (c.lat != null && c.lng != null)
                    data.places.firstOrNull { distance(it.lat, it.lng, c.lat, c.lng) <= it.radius }?.name
                else null
                ListItem(
                    headlineContent = { Text(c.title) },
                    supportingContent = {
                        Text(when {
                            c.lat == null -> "$time · location not recorded"
                            near != null -> "$time · at $near"
                            else -> "$time · %.4f, %.4f".format(c.lat, c.lng)
                        })
                    },
                    trailingContent = {
                        if (c.lat != null && c.lng != null) {
                            IconButton(onClick = { openMap(ctx, c.lat, c.lng) }) { Icon(Icons.Outlined.Map, "Show on map") }
                        }
                    },
                )
            }
        }
    }
}

private fun distance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Float {
    val out = FloatArray(1)
    android.location.Location.distanceBetween(lat1, lng1, lat2, lng2, out)
    return out[0]
}
