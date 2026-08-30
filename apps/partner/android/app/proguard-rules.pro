# KARTSEEK Partner App — ProGuard Rules
# ──────────────────────────────────────────────────────────────
# Flutter-specific rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Prevent R8 from stripping interface information
-keep,allowobfuscation,allowshrinking class * extends com.google.gson.reflect.TypeToken

# Google Maps
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }

# Dio / OkHttp (network layer)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# ── Flutter Plugin Keep Rules ──────────────────────────────────
# Geolocator (background location for active rides/deliveries)
-keep class com.baseflow.geolocator.** { *; }
-dontwarn com.baseflow.geolocator.**

# Local Auth (biometric login)
-keep class io.flutter.plugins.localauth.** { *; }

# Secure Storage (tokens, credentials)
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Permission Handler
-keep class com.baseflow.permissionhandler.** { *; }

# Image Picker (KYC document uploads)
-keep class io.flutter.plugins.imagepicker.** { *; }

# Lottie Animations
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**

# Flutter Local Notifications
-keep class com.dexterous.** { *; }
-dontwarn com.dexterous.**

# Keep Kotlin metadata
-keepattributes *Annotation*
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Crashlytics (when enabled)
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# General Android
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# WebView
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String);
}
