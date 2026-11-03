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
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MaterialTheme(colorScheme = appColors()) { App() } }
    }

    override fun onResume() {
        super.onResume()
        Scheduler.refreshAll(this)
        lifecycleScope.launch { AutoCheck.run(applicationContext) }
    }
}

@Composable
fun appColors(): ColorScheme {
    val dark = isSystemInDarkTheme()
    val ctx = LocalContext.current
    return when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> if (dark) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        dark -> darkColorScheme()
        else -> lightColorScheme()
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Today("Today", Icons.Outlined.CheckCircle),
    Routines("Routines", Icons.Outlined.Repeat),
    ScreenTime("Screen time", Icons.Outlined.HourglassBottom),
    History("History", Icons.Outlined.History),
    Settings("Settings", Icons.Outlined.Tune),
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
                        icon = { Icon(it.icon, null) },
                        label = { Text(it.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    )
                }
            }
        },
        floatingActionButton = {
            if (tab == Tab.Today || tab == Tab.Routines) ExtendedFloatingActionButton(
                onClick = { editingRoutine = Routine(title = "") },
                icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Routine") },
            )
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when (tab) {
                Tab.Today -> TodayScreen(data, onEdit = { editingRoutine = it })
                Tab.Routines -> RoutinesScreen(data, onEdit = { editingRoutine = it })
                Tab.ScreenTime -> ScreenTimeScreen()
                Tab.History -> HistoryScreen(data)
                Tab.Settings -> SettingsScreen(data, onEditPlace = { editingPlace = it })
            }
        }
    }

    editingRoutine?.let { r ->
        RoutineEditor(r, data, onDismiss = { editingRoutine = null }, onAddPlace = {
            editingRoutine = null
            tab = Tab.Settings
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
private fun Section(title: String) {
    Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 4.dp))
}

@Composable
private fun Empty(text: String) {
    Text(text, Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
}

@Composable
private fun AppIcon(pkg: String, size: Int = 36) {
    val ctx = LocalContext.current
    val bmp = remember(pkg) { Usage.icon(ctx, pkg)?.toBitmap(size * 3, size * 3)?.asImageBitmap() }
    if (bmp != null) Image(bmp, null, Modifier.size(size.dp))
    else Box(Modifier.size(size.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surfaceVariant))
}

/** Re-reads when you come back to the app. */
@Composable
private fun resumeTick(): Int {
    var tick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { tick++ }
    return tick
}

@Composable
private fun usageToday(): Map<String, Long> {
    val ctx = LocalContext.current
    val tick = resumeTick()
    val usage by produceState(emptyMap<String, Long>(), tick) {
        value = withContext(Dispatchers.Default) { Usage.forDay(ctx) }
    }
    return usage
}

private fun describe(r: Routine, data: AppData, ctx: Context): String {
    val parts = mutableListOf<String>()
    r.deadline?.let { parts += "By ${formatMinutes(it)}" }
    data.place(r.placeId)?.let { p ->
        val on = listOfNotNull(if (r.onArrive) "arrive" else null, if (r.onLeave) "leave" else null)
        parts += if (on.isEmpty()) p.name else "${p.name} (${on.joinToString(" / ")})"
    }
    if (r.usesAppTime) parts += "Auto: ${r.autoMinutes} min in ${r.autoApps.joinToString { Usage.label(ctx, it) }}"
    if (r.usesEmails) parts += "Auto: ${r.autoEmails} email${if (r.autoEmails == 1) "" else "s"} sent"
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
    val usage = usageToday()

    LazyColumn(contentPadding = PaddingValues(bottom = 96.dp)) {
        item { Header(today.format(dateFmt), if (due.isEmpty()) null else "$doneCount of ${due.size} done today") }
        item { SetupCard(data, compact = true) }
        if (due.isNotEmpty()) item {
            LinearProgressIndicator(
                progress = { doneCount.toFloat() / due.size },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }
        if (due.isEmpty()) item { Empty("Nothing due today. Tap \"Routine\" to add things like \"Send emails\" or \"Send outreach\".") }
        items(due, key = { it.id }) { r ->
            val done = data.completion(r.id, today)
            val progress = buildList {
                if (r.usesAppTime) add("${Usage.minutesIn(usage, r.autoApps)} of ${r.autoMinutes} min so far")
                if (r.usesEmails) add("${data.sentToday()} of ${r.autoEmails} emails sent")
            }.joinToString(" · ")
            Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp).clickable { onEdit(r) }) {
                Row(Modifier.padding(start = 4.dp, end = 16.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = done != null, onCheckedChange = { checked ->
                        if (checked) scope.launch { Actions.markDone(ctx, r.id, Locator.current(ctx)) }
                        else Actions.undo(ctx, r.id)
                    })
                    Column(Modifier.weight(1f)) {
                        Text(r.title, style = MaterialTheme.typography.titleMedium,
                            textDecoration = if (done != null) TextDecoration.LineThrough else null)
                        val sub = when {
                            done != null -> "Done at ${Instant.ofEpochMilli(done.time).atZone(ZoneId.systemDefault()).format(timeFmt)}" +
                                (if (done.note != null) " (automatically)" else "")
                            progress.isNotEmpty() -> progress
                            else -> describe(r, data, ctx)
                        }
                        Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

// ---------- Setup / permissions ----------

private data class SetupItem(val title: String, val why: String, val button: String = "Allow", val onClick: () -> Unit)

/** Shows only what's still missing, each with a button to allow it. */
@Composable
private fun SetupCard(data: AppData, compact: Boolean) {
    val ctx = LocalContext.current
    val tick = resumeTick()
    var extra by remember { mutableIntStateOf(0) }
    val refresh = { extra++; Scheduler.refreshAll(ctx) }

    val notify = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { refresh() }
    val location = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refresh() }
    val background = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { refresh() }

    val items = remember(tick, extra, data.blocks.size) {
        val power = ctx.getSystemService(PowerManager::class.java)
        buildList {
            if (!ctx.hasNotifications() && Build.VERSION.SDK_INT >= 33) add(SetupItem(
                "Notifications", "So the app can remind you.") { notify.launch(Manifest.permission.POST_NOTIFICATIONS) })
            if (!ctx.hasLocation()) add(SetupItem(
                "Location", "So it knows where you are and logs where you did each task.") {
                location.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            })
            else if (!ctx.hasBackgroundLocation() && Build.VERSION.SDK_INT >= 29) add(SetupItem(
                "Location all the time", "Choose \"Allow all the time\" so arrive/leave reminders work while the app is closed.") {
                background.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            })
            if (!Usage.hasAccess(ctx)) add(SetupItem(
                "Usage access", "For screen time and auto-ticking. Find Routines in the list and turn it on.", "Open") {
                Usage.openSettings(ctx)
            })
            if (data.blocks.isNotEmpty() && !Blocker.isEnabled(ctx)) add(SetupItem(
                "App blocker", "Settings → Accessibility → Routines app blocker → turn on. If it's greyed out, see the tip below.", "Open") {
                Blocker.openSettings(ctx)
            })
            if (!power.isIgnoringBatteryOptimizations(ctx.packageName)) add(SetupItem(
                "Battery", "Stop battery saver from delaying your reminders.") { requestBatteryExemption(ctx) })
        }
    }
    if (items.isEmpty()) {
        if (!compact) Text("Everything is set up.", Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
        return
    }
    ElevatedCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text("Finish setup", style = MaterialTheme.typography.titleMedium)
            items.forEach { item ->
                Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f).padding(end = 12.dp)) {
                        Text(item.title, fontWeight = FontWeight.Medium)
                        Text(item.why, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    FilledTonalButton(onClick = item.onClick) { Text(item.button) }
                }
            }
            if (items.any { it.title == "App blocker" }) RestrictedTip()
        }
    }
}

@Composable
private fun RestrictedTip() {
    val ctx = LocalContext.current
    Text(
        "Tip: Android greys out this switch for apps you installed yourself. Open App info, tap ⋮ (top right), " +
            "choose \"Allow restricted settings\", then turn the blocker on.",
        style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 12.dp),
    )
    TextButton(onClick = {
        ctx.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")))
    }) { Text("Open App info") }
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

private fun daysText(days: Set<Int>) = when {
    days.size == 7 -> "Every day"
    days == (1..5).toSet() -> "Weekdays"
    else -> days.sorted().joinToString(" ") { DayOfWeek.of(it).name.take(3).lowercase().replaceFirstChar(Char::uppercase) }
}

@Composable
private fun RoutinesScreen(data: AppData, onEdit: (Routine) -> Unit) {
    val ctx = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(bottom = 96.dp)) {
        item { Header("Routines", "Tap one to change it") }
        if (data.routines.isEmpty()) item { Empty("No routines yet.") }
        items(data.routines, key = { it.id }) { r ->
            ListItem(
                modifier = Modifier.clickable { onEdit(r) },
                headlineContent = { Text(r.title) },
                supportingContent = { Text("${daysText(r.days)} · ${describe(r, data, ctx)}") },
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
    var autoMinutes by remember { mutableIntStateOf(initial.autoMinutes) }
    var autoApps by remember { mutableStateOf(initial.autoApps) }
    var autoEmails by remember { mutableIntStateOf(initial.autoEmails) }
    var placeMenu by remember { mutableStateOf(false) }
    var pickingApps by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "New routine" else "Edit routine") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(title, { title = it }, label = { Text("What to do") },
                    placeholder = { Text("Send outreach") }, singleLine = true, modifier = Modifier.fillMaxWidth())

                Label("Days")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    (1..7).forEach { d ->
                        FilterChip(selected = d in days, onClick = { days = if (d in days) days - d else days + d },
                            label = { Text(dayLetters[d - 1]) })
                    }
                }

                Label("Remind me at a time")
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(if (deadline == null) "Off" else "If not done by ${formatMinutes(deadline!!)}", Modifier.weight(1f))
                    Switch(checked = deadline != null, onCheckedChange = { deadline = if (it) 9 * 60 else null })
                }
                if (deadline != null) TextButton(onClick = {
                    val d = deadline!!
                    TimePickerDialog(ctx, { _, h, m -> deadline = h * 60 + m }, d / 60, d % 60, false).show()
                }) { Text("Change time") }

                Label("Remind me at a place")
                ExposedDropdownMenuBox(expanded = placeMenu, onExpandedChange = { placeMenu = it }) {
                    OutlinedTextField(
                        value = data.place(placeId)?.name ?: "No place", onValueChange = {}, readOnly = true,
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
                    CheckRow("When I arrive, if not done", onArrive) { onArrive = it }
                    CheckRow("When I leave, if not done", onLeave) { onLeave = it }
                }

                Label("Tick off automatically")
                CheckRow("After time in certain apps", autoMinutes > 0) { autoMinutes = if (it) 15 else 0 }
                if (autoMinutes > 0) {
                    Text("$autoMinutes min in total", style = MaterialTheme.typography.bodySmall)
                    Slider(autoMinutes.toFloat(), { autoMinutes = (it / 5).roundToInt() * 5 }, valueRange = 5f..180f)
                    OutlinedButton(onClick = { pickingApps = true }, modifier = Modifier.fillMaxWidth()) {
                        Text(if (autoApps.isEmpty()) "Choose apps" else autoApps.joinToString { Usage.label(ctx, it) },
                            maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                CheckRow("After sending emails (Gmail)", autoEmails > 0) { autoEmails = if (it) 1 else 0 }
                if (autoEmails > 0) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$autoEmails email${if (autoEmails == 1) "" else "s"} sent today", Modifier.weight(1f))
                        IconButton(onClick = { if (autoEmails > 1) autoEmails-- }) { Icon(Icons.Outlined.Remove, "Fewer") }
                        IconButton(onClick = { autoEmails++ }) { Icon(Icons.Outlined.Add, "More") }
                    }
                    if (!data.settings.gmailConnected) Text("Connect Gmail in Settings for this to work.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
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
                    autoMinutes = if (autoApps.isEmpty()) 0 else autoMinutes,
                    autoApps = if (autoMinutes > 0) autoApps else emptySet(),
                    autoEmails = autoEmails,
                ))
                onDismiss()
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )

    if (pickingApps) AppPicker(autoApps, multiple = true, onDismiss = { pickingApps = false }) { autoApps = it; pickingApps = false }
}

@Composable
private fun Label(text: String) {
    Text(text, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 18.dp, bottom = 4.dp))
}

@Composable
private fun CheckRow(text: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { onChange(!checked) }, verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked, onChange); Text(text)
    }
}

@Composable
private fun AppPicker(selected: Set<String>, multiple: Boolean, onDismiss: () -> Unit, onDone: (Set<String>) -> Unit) {
    val ctx = LocalContext.current
    val apps by produceState(emptyList<AppInfo>()) { value = withContext(Dispatchers.Default) { Usage.launchableApps(ctx) } }
    var chosen by remember { mutableStateOf(selected) }
    var query by remember { mutableStateOf("") }
    val shown = apps.filter { query.isBlank() || it.label.contains(query, ignoreCase = true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (multiple) "Choose apps" else "Choose an app") },
        text = {
            Column {
                OutlinedTextField(query, { query = it }, placeholder = { Text("Search") }, singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.Search, null) }, modifier = Modifier.fillMaxWidth())
                if (apps.isEmpty()) Text("Loading your apps...", Modifier.padding(16.dp))
                LazyColumn(Modifier.heightIn(max = 380.dp)) {
                    items(shown, key = { it.packageName }) { app ->
                        val on = app.packageName in chosen
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                if (multiple) chosen = if (on) chosen - app.packageName else chosen + app.packageName
                                else onDone(setOf(app.packageName))
                            }.padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AppIcon(app.packageName, 32)
                            Text(app.label, Modifier.weight(1f).padding(horizontal = 12.dp))
                            if (multiple) Checkbox(on, null)
                        }
                    }
                }
            }
        },
        confirmButton = { if (multiple) TextButton(onClick = { onDone(chosen) }) { Text("Done") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

// ---------- Screen time ----------

@Composable
private fun ScreenTimeScreen() {
    val ctx = LocalContext.current
    val tick = resumeTick()
    var week by rememberSaveable { mutableStateOf(false) }
    val hasAccess = remember(tick) { Usage.hasAccess(ctx) }
    // index 0 = today, 6 = six days ago
    val days by produceState<List<Map<String, Long>>?>(null, tick, week) {
        value = withContext(Dispatchers.Default) {
            val today = LocalDate.now()
            (0 until if (week) 7 else 1).map { Usage.forDay(ctx, today.minusDays(it.toLong())) }
        }
    }

    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
        item { Header("Screen time") }
        if (!hasAccess) {
            item {
                Empty("Turn on Usage access to see which apps you use and for how long.")
                Button(onClick = { Usage.openSettings(ctx) }, Modifier.padding(horizontal = 20.dp)) { Text("Turn on usage access") }
            }
            return@LazyColumn
        }
        item {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                SegmentedButton(!week, { week = false }, SegmentedButtonDefaults.itemShape(0, 2)) { Text("Today") }
                SegmentedButton(week, { week = true }, SegmentedButtonDefaults.itemShape(1, 2)) { Text("Last 7 days") }
            }
        }
        val list = days ?: run { item { Empty("Adding it up...") }; return@LazyColumn }
        val totals = HashMap<String, Long>().apply { list.forEach { d -> d.forEach { (k, v) -> merge(k, v, Long::plus) } } }
        val sorted = totals.entries.sortedByDescending { it.value }
        val total = totals.values.sum()
        item {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                Text(formatDuration(if (week) total / 7 else total), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.SemiBold)
                Text(if (week) "a day on average · ${formatDuration(total)} in total" else "on your phone today",
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (week) item { WeekBars(list) }
        if (sorted.isEmpty()) item { Empty("No app use recorded yet.") }
        val max = sorted.firstOrNull()?.value ?: 1L
        items(sorted.take(40), key = { it.key }) { (pkg, ms) ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                AppIcon(pkg)
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(Usage.label(ctx, pkg), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Box(Modifier.padding(top = 4.dp).fillMaxWidth((ms.toFloat() / max).coerceIn(0.02f, 1f)).height(6.dp)
                        .clip(RoundedCornerShape(3.dp)).background(MaterialTheme.colorScheme.primary))
                }
                Text(formatDuration(ms), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun WeekBars(days: List<Map<String, Long>>) {
    val totals = days.map { it.values.sum() }.reversed() // oldest first
    val max = (totals.maxOrNull() ?: 0L).coerceAtLeast(1L)
    val today = LocalDate.now()
    Row(Modifier.fillMaxWidth().height(140.dp).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom) {
        totals.forEachIndexed { i, ms ->
            val date = today.minusDays((totals.size - 1 - i).toLong())
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${ms / 3_600_000}h", style = MaterialTheme.typography.labelSmall)
                Box(Modifier.padding(vertical = 4.dp).width(22.dp).height((90 * ms / max).toInt().coerceAtLeast(2).dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(if (i == totals.size - 1) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)))
                Text(dayLetters[date.dayOfWeek.value - 1], style = MaterialTheme.typography.labelSmall)
            }
        }
    }
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
                Section(d.format(dateFmt) + if (due > 0) "  ·  ${list.size} of $due" else "")
            }
            items(list, key = { it.id }) { c ->
                val time = Instant.ofEpochMilli(c.time).atZone(ZoneId.systemDefault()).format(timeFmt)
                val near = if (c.lat != null && c.lng != null)
                    data.places.firstOrNull { distance(it.lat, it.lng, c.lat, c.lng) <= it.radius }?.name else null
                ListItem(
                    headlineContent = { Text(c.title) },
                    supportingContent = {
                        Column {
                            Text(when {
                                c.lat == null -> "$time · location not recorded"
                                near != null -> "$time · at $near"
                                else -> "$time · %.4f, %.4f".format(c.lat, c.lng)
                            })
                            c.note?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                        }
                    },
                    trailingContent = {
                        if (c.lat != null && c.lng != null) IconButton(onClick = { openMap(ctx, c.lat, c.lng) }) {
                            Icon(Icons.Outlined.Map, "Show on map")
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

private fun openMap(ctx: Context, lat: Double, lng: Double) {
    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$lat,$lng")))
}

// ---------- Settings ----------

@Composable
private fun SettingsScreen(data: AppData, onEditPlace: (Place) -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val tick = resumeTick()
    var editingBlock by remember { mutableStateOf<BlockRule?>(null) }
    var pickingBlockApp by remember { mutableStateOf(false) }
    var gmailMessage by remember { mutableStateOf<String?>(null) }
    val blockerOn = remember(tick) { Blocker.isEnabled(ctx) }

    val consent = rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        gmailMessage = when (val r = Gmail.finishConnect(ctx, result.data)) {
            is Gmail.Connect.Failed -> r.message
            else -> null
        }
    }

    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
        item { Header("Settings") }

        item { Section("Setup") }
        item { SetupCard(data, compact = false) }

        item { Section("Places") }
        if (data.places.isEmpty()) item { Empty("Go to a place (home, office), tap Add place and use your current location.") }
        items(data.places, key = { it.id }) { p ->
            val used = data.routines.count { it.placeId == p.id }
            ListItem(
                modifier = Modifier.clickable { onEditPlace(p) },
                leadingContent = { Icon(Icons.Outlined.Place, null) },
                headlineContent = { Text(p.name) },
                supportingContent = { Text("${p.radius} m around this spot · used by $used routine${if (used == 1) "" else "s"}") },
            )
        }
        item {
            TextButton(onClick = { onEditPlace(Place(name = "", lat = 0.0, lng = 0.0)) }, Modifier.padding(horizontal = 8.dp)) {
                Icon(Icons.Outlined.AddLocationAlt, null); Spacer(Modifier.width(8.dp)); Text("Add place")
            }
        }

        item { Section("Block distracting apps") }
        item {
            ListItem(
                headlineContent = { Text("Blocking") },
                supportingContent = {
                    Text(when {
                        data.blocks.isEmpty() -> "Choose apps to keep closed until your routines are done."
                        !blockerOn -> "Turn on the app blocker in Setup above."
                        data.settings.blockingOn -> "On"
                        else -> "Paused"
                    })
                },
                trailingContent = {
                    Switch(data.settings.blockingOn, { on ->
                        Store.update(ctx) { it.copy(settings = it.settings.copy(blockingOn = on)) }
                    })
                },
            )
        }
        items(data.blocks, key = { it.packageName }) { b ->
            ListItem(
                modifier = Modifier.clickable { editingBlock = b },
                leadingContent = { AppIcon(b.packageName) },
                headlineContent = { Text(Usage.label(ctx, b.packageName)) },
                supportingContent = { Text(blockText(b)) },
            )
        }
        item {
            TextButton(onClick = { pickingBlockApp = true }, Modifier.padding(horizontal = 8.dp)) {
                Icon(Icons.Outlined.Block, null); Spacer(Modifier.width(8.dp)); Text("Block an app")
            }
        }

        item { Section("Gmail") }
        item {
            val connected = data.settings.gmailConnected
            ListItem(
                headlineContent = { Text(if (connected) "Connected" else "Not connected") },
                supportingContent = {
                    Text(if (connected) "${data.sentToday()} emails sent today (it only sees dates, never what your emails say)"
                    else "Connect it so \"Send emails\" ticks itself off when you've sent them.")
                },
                trailingContent = {
                    if (connected) TextButton(onClick = { Gmail.disconnect(ctx) }) { Text("Disconnect") }
                    else FilledTonalButton(onClick = {
                        scope.launch {
                            gmailMessage = null
                            when (val r = Gmail.connect(ctx)) {
                                is Gmail.Connect.NeedsConsent -> consent.launch(IntentSenderRequest.Builder(r.pendingIntent).build())
                                is Gmail.Connect.Failed -> gmailMessage = r.message
                                Gmail.Connect.Connected -> scope.launch { Gmail.sentToday(ctx) }
                            }
                        }
                    }) { Text("Connect") }
                },
            )
            gmailMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 20.dp))
            }
            if (connected) TextButton(onClick = { scope.launch { Gmail.sentToday(ctx) ?: run { gmailMessage = "Couldn't reach Gmail. Try connecting again." } } },
                Modifier.padding(horizontal = 8.dp)) { Text("Check now") }
        }

        item { Section("Evening summary") }
        item {
            val at = data.settings.summaryAt
            ListItem(
                modifier = Modifier.clickable(enabled = at != null) {
                    TimePickerDialog(ctx, { _, h, m ->
                        Store.update(ctx) { it.copy(settings = it.settings.copy(summaryAt = h * 60 + m)) }
                        Scheduler.scheduleSummary(ctx)
                    }, (at ?: 1260) / 60, (at ?: 1260) % 60, false).show()
                },
                headlineContent = { Text(if (at == null) "Off" else "Every day at ${formatMinutes(at)}") },
                supportingContent = { Text("What you did, what you missed, and your screen time. Tap to change the time.") },
                trailingContent = {
                    Switch(at != null, { on ->
                        Store.update(ctx) { it.copy(settings = it.settings.copy(summaryAt = if (on) 21 * 60 else null)) }
                        Scheduler.scheduleSummary(ctx)
                    })
                },
            )
        }
    }

    if (pickingBlockApp) AppPicker(emptySet(), multiple = false, onDismiss = { pickingBlockApp = false }) { picked ->
        pickingBlockApp = false
        val pkg = picked.first()
        editingBlock = data.blocks.firstOrNull { it.packageName == pkg } ?: BlockRule(pkg)
    }
    editingBlock?.let { BlockEditor(it, isNew = data.blocks.none { b -> b.packageName == it.packageName }) { editingBlock = null } }
}

private fun blockText(b: BlockRule) = listOfNotNull(
    if (b.untilDone) "Until today's routines are done" else null,
    if (b.dailyLimit > 0) "After ${b.dailyLimit} min a day" else null,
).joinToString(" · ").ifEmpty { "Not blocked" }

@Composable
private fun BlockEditor(initial: BlockRule, isNew: Boolean, onDismiss: () -> Unit) {
    val ctx = LocalContext.current
    var untilDone by remember { mutableStateOf(initial.untilDone) }
    var limit by remember { mutableIntStateOf(initial.dailyLimit) }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { AppIcon(initial.packageName, 40) },
        title = { Text("Block ${Usage.label(ctx, initial.packageName)}") },
        text = {
            Column {
                CheckRow("Until today's routines are done", untilDone) { untilDone = it }
                CheckRow("After a daily time limit", limit > 0) { limit = if (it) 30 else 0 }
                if (limit > 0) {
                    Text("$limit min a day", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 12.dp))
                    Slider(limit.toFloat(), { limit = (it / 5).roundToInt() * 5 }, valueRange = 5f..240f)
                }
                if (!isNew) TextButton(
                    onClick = {
                        Store.update(ctx) { d -> d.copy(blocks = d.blocks.filterNot { it.packageName == initial.packageName }) }
                        onDismiss()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) { Text("Stop blocking") }
            }
        },
        confirmButton = {
            TextButton(enabled = untilDone || limit > 0, onClick = {
                val rule = initial.copy(untilDone = untilDone, dailyLimit = limit)
                Store.update(ctx) { d -> d.copy(blocks = d.blocks.filterNot { it.packageName == rule.packageName } + rule) }
                onDismiss()
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
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
                        if (!ctx.hasLocation()) { error = "Allow location in Setup first."; return@Button }
                        locating = true; error = null
                        scope.launch {
                            val loc = Locator.current(ctx, 15000)
                            locating = false
                            if (loc == null) error = "Couldn't get your location. Is location turned on?"
                            else {
                                lat = "%.6f".format(java.util.Locale.US, loc.latitude)
                                lng = "%.6f".format(java.util.Locale.US, loc.longitude)
                            }
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
                if (latD != null && lngD != null) TextButton(onClick = { openMap(ctx, latD, lngD) }) { Text("Check it on the map") }
                Text("Area: ${radius.roundToInt()} m around the spot", Modifier.padding(top = 8.dp))
                Slider(radius, { radius = (it / 50).roundToInt() * 50f }, valueRange = 100f..1000f)
                Text("Bigger areas trigger more reliably. 150 m or more works best.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!isNew) TextButton(
                    onClick = { Actions.deletePlace(ctx, initial.id); onDismiss() },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) { Text("Delete place") }
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
