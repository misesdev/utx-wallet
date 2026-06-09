# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.**

# react-native-vector-icons
-keep class com.oblador.vectoricons.** { *; }

# react-native-encrypted-storage
-keep class com.emeraldsanto.encryptedstorage.** { *; }

# op-sqlite
-keep class com.op.sqlite.** { *; }

# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }

# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }

# react-native-svg
-keep class com.horcrux.svg.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-dontwarn kotlin.**
