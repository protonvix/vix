# Routines: personal task tracker for Android

A phone app for your daily routines (send emails, send outreach and so on). It reminds you when something isn't done yet:

- **By time:** "If *Send outreach* isn't done by 2:00 PM, notify me."
- **On arriving:** "When I get to the office and it isn't done, notify me."
- **On leaving:** "When I leave home and it isn't done, notify me."
- **Where you did it:** ticking a task off saves the time and your location. The History tab shows them, with a map link.

It also watches how you use your phone:

- **Auto-tick:** a routine ticks itself off when you've done it, e.g. *Send emails* once Gmail shows 5 sent today, or *Send outreach* after 30 minutes in WhatsApp or LinkedIn. Before any reminder goes out it checks again, so you aren't nagged about something already done.
- **Screen time:** how long you spent in each app, today and over the last 7 days.
- **Block distractions:** keep apps like TikTok or Instagram closed until today's routines are done, and/or after a daily time limit. There's a "let me in for 5 minutes" option for emergencies.
- **Evening summary:** a notification (9 PM by default) with what you did, what you missed, and your screen time.

Reminders have **Mark done** and **Remind me in 30 min** buttons. Your data stays on your phone. The only thing that leaves it is the Gmail check, which asks Google how many emails you sent today.

## Install
1. On your phone, open `routines-app/Routines.apk` on GitHub and tap **Download** (or use the file Claude sent you).
2. Open the downloaded file. If Android asks, allow your browser or file manager to **install unknown apps**.
3. Open **Routines**. On the Today tab, tap **Allow** for each item under *Finish setup*:
   - Notifications
   - Location, then **Allow all the time** (needed for arrive and leave reminders while the app is closed)
   - Usage access (for screen time and auto-ticking: find Routines in the list and switch it on)
   - Battery (so battery saver doesn't delay reminders)
   - App blocker (shown once you block an app): Settings → Accessibility → *Routines app blocker* → on.
     **If the switch is greyed out:** Android does this for apps installed from a file. Go to Settings → Apps → Routines → ⋮ (top right) → **Allow restricted settings**, then try again.

## Use
1. **Places tab:** go to a place (home, office), tap **Place**, then **Use my current location**, and give it a name.
2. **Routines tab:** tap **Routine**. Name it, pick the days, then turn on a time, a place, or both.
3. **Today tab:** tick things off as you do them, or let them tick themselves.
4. **Settings tab:** places, blocked apps, Gmail and the evening summary time.

## Connect Gmail (one-time setup, about 10 minutes)
Google only lets an app read Gmail once the app is registered with Google. Because this is your own private app, you register it yourself, for free:

1. Go to <https://console.cloud.google.com/> and sign in with the Gmail account you send from. Create a project (any name, e.g. "Routines").
2. **APIs & Services → Library**: search for **Gmail API** and click **Enable**.
3. **APIs & Services → OAuth consent screen** (also called *Google Auth Platform*): choose **External**, fill in the app name and your email, and save. Under **Audience / Test users**, add your own Gmail address.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, then choose **Android**:
   - Package name: `com.vix.routines`
   - SHA-1 certificate fingerprint: `40:FE:1A:40:D5:75:45:20:A3:00:22:70:49:C7:81:49:89:60:08:17`
5. In the app, open Settings → Gmail → **Connect**, pick your account and allow access. Google will warn that the app isn't verified; that's expected for a personal app. Tap **Continue**.

The app asks for the `gmail.metadata` permission only. It can see when emails were sent, but never what they say.

## Build it yourself
Needs JDK 17+ and the Android SDK (set `sdk.dir` in `local.properties`):

```bash
./gradlew assembleRelease
# output: app/build/outputs/apk/release/app-release.apk
```

Every build is signed with `app/personal.keystore`, so a new version installs over the old one and keeps your data. That key is only for this sideloaded personal app. Don't use it for a Play Store release.
