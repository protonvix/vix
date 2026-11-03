# Routines: personal task tracker for Android

A phone app for your daily routines (send emails, send outreach and so on). It reminds you when something isn't done yet:

- **By time:** "If *Send outreach* isn't done by 2:00 PM, notify me."
- **On arriving:** "When I get to the office and it isn't done, notify me."
- **On leaving:** "When I leave home and it isn't done, notify me."
- **Where you did it:** ticking a task off saves the time and your location. The History tab shows them, with a map link.

Reminders have **Mark done** and **Remind me in 30 min** buttons. Everything stays on your phone: there's no account and no server.

## Install
1. On your phone, open `routines-app/Routines.apk` on GitHub and tap **Download** (or use the file Claude sent you).
2. Open the downloaded file. If Android asks, allow your browser or file manager to **install unknown apps**.
3. Open **Routines**. On the Today tab, tap **Allow** for each item under *Finish setup*:
   - Notifications
   - Location, then **Allow all the time** (needed for arrive and leave reminders while the app is closed)
   - Battery (so battery saver doesn't delay reminders)

## Use
1. **Places tab:** go to a place (home, office), tap **Place**, then **Use my current location**, and give it a name.
2. **Routines tab:** tap **Routine**. Name it, pick the days, then turn on a time, a place, or both.
3. **Today tab:** tick things off as you do them.

## Build it yourself
Needs JDK 17+ and the Android SDK (set `sdk.dir` in `local.properties`):

```bash
./gradlew assembleRelease
# output: app/build/outputs/apk/release/app-release.apk
```

Every build is signed with `app/personal.keystore`, so a new version installs over the old one and keeps your data. That key is only for this sideloaded personal app. Don't use it for a Play Store release.
