# Project-specific ProGuard/R8 rules.
#
# React Native and its native modules ship consumer rules inside their AARs,
# which R8 applies automatically. The rules below cover the remaining gaps for
# this app: code reached only through JNI or reflection, which R8 cannot see.

# Hermes and the JNI bridge.
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }

# react-native-keychain reaches the Android keystore providers reflectively.
-keep class com.oblador.keychain.** { *; }

# Networking stack used by fetch(); these warnings are for optional deps that
# are never on the runtime classpath.
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
