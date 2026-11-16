# Release R8 rules for Tutorix. React Native, Firebase, and Agora ship their
# own consumer rules; the entries below cover SDKs that rely on reflection or
# WebView JavaScript bridges.

# Readable Crashlytics stack traces (mapping file is uploaded on release).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions

# WebView bridges (Razorpay checkout, Netless whiteboard, Cashfree web checkout).
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Agora RTC / RTM (consumer rules exist; kept here so a library update cannot drop them).
-keep class io.agora.** { *; }
-dontwarn io.agora.**

# Razorpay
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-keepclasseswithmembers class * {
    public void onPayment*(...);
}
-optimizations !method/inlining/*

# Cashfree
-keep class com.cashfree.** { *; }
-dontwarn com.cashfree.**
-keep class com.reactnativecashfreepgsdk.** { *; }

# Netless whiteboard
-keep class com.reactnativewhiteboard.** { *; }

# react-native-keychain
-keep class com.oblador.keychain.** { *; }

# Tutorix native modules
-keep class com.tutorix.tech.** { *; }
