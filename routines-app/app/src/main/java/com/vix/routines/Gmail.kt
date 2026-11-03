package com.vix.routines

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.ZoneId

/**
 * Counts the emails you sent today. It asks Google only for the "metadata" permission:
 * it can see dates and labels, never what your emails say.
 */
object Gmail {
    private const val SCOPE = "https://www.googleapis.com/auth/gmail.metadata"
    private const val API = "https://gmail.googleapis.com/gmail/v1/users/me"

    private fun request() = AuthorizationRequest.builder()
        .setRequestedScopes(listOf(Scope(SCOPE)))
        .build()

    sealed interface Connect {
        data object Connected : Connect
        data class NeedsConsent(val pendingIntent: PendingIntent) : Connect
        data class Failed(val message: String) : Connect
    }

    /** Starts connecting. If Google needs you to approve, returns the screen to show. */
    suspend fun connect(context: Context): Connect = try {
        val result = Identity.getAuthorizationClient(context).authorize(request()).await()
        if (result.hasResolution()) Connect.NeedsConsent(result.pendingIntent!!) else {
            markConnected(context, true)
            Connect.Connected
        }
    } catch (e: Exception) {
        Connect.Failed(explain(e))
    }

    /** Call with the result of the Google approval screen. */
    fun finishConnect(context: Context, data: Intent?): Connect = try {
        val result: AuthorizationResult = Identity.getAuthorizationClient(context).getAuthorizationResultFromIntent(data)
        if (result.accessToken != null) {
            markConnected(context, true)
            Connect.Connected
        } else Connect.Failed("Google didn't give access.")
    } catch (e: Exception) {
        Connect.Failed(explain(e))
    }

    fun disconnect(context: Context) = markConnected(context, false)

    private fun markConnected(context: Context, on: Boolean) {
        Store.update(context) { it.copy(settings = it.settings.copy(gmailConnected = on)) }
    }

    private fun explain(e: Exception): String {
        val m = e.message.orEmpty()
        return when {
            "10:" in m || "DEVELOPER_ERROR" in m ->
                "Google doesn't recognise this app yet. Finish the Google Cloud setup in the README, then try again."
            else -> "Couldn't connect to Google: ${m.ifBlank { e.javaClass.simpleName }}"
        }
    }

    /** A token without showing any screen, or null if you need to connect again. */
    private suspend fun token(context: Context): String? = try {
        val r = Identity.getAuthorizationClient(context).authorize(request()).await()
        if (r.hasResolution()) null else r.accessToken
    } catch (e: Exception) {
        null
    }

    /** How many emails you sent today, or null if it couldn't check. Also saves the count. */
    suspend fun sentToday(context: Context): Int? = withContext(Dispatchers.IO) {
        if (!Store.get(context).settings.gmailConnected) return@withContext null
        var tok = token(context) ?: return@withContext null
        val count = try {
            countSent(tok)
        } catch (e: Unauthorized) {
            try { GoogleAuthUtil.clearToken(context, tok) } catch (_: Exception) {}
            tok = token(context) ?: return@withContext null
            try { countSent(tok) } catch (_: Exception) { null }
        } catch (e: Exception) {
            null
        } ?: return@withContext null
        Store.update(context) { it.copy(sentDate = LocalDate.now().toString(), sentCount = count) }
        count
    }

    private class Unauthorized : Exception()

    private fun get(url: String, token: String): JSONObject {
        val c = URL(url).openConnection() as HttpURLConnection
        c.setRequestProperty("Authorization", "Bearer $token")
        c.connectTimeout = 10_000
        c.readTimeout = 10_000
        try {
            if (c.responseCode == 401) throw Unauthorized()
            if (c.responseCode !in 200..299) throw Exception("Gmail said ${c.responseCode}")
            return JSONObject(c.inputStream.bufferedReader().readText())
        } finally {
            c.disconnect()
        }
    }

    /** Sent messages come newest first, so stop at the first one from before today. */
    private fun countSent(token: String): Int {
        val since = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val list = get("$API/messages?labelIds=SENT&maxResults=50", token)
        val ids = list.optJSONArray("messages") ?: return 0
        var count = 0
        for (i in 0 until ids.length()) {
            val id = ids.getJSONObject(i).getString("id")
            val msg = get("$API/messages/$id?format=minimal", token)
            if (msg.optString("internalDate").toLongOrNull()?.let { it >= since } == true) count++ else break
        }
        return count
    }
}
