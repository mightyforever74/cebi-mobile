# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# react-native-ble-plx (Polidea RxAndroidBle tabanlı) — R8/ProGuard açılırken
# BLE tarama/eşleştirme JNI-reflection ağırlıklı, keep-rule olmadan kırılma riski yüksek
-keep class com.polidea.rxandroidble2.** { *; }
-keep interface com.polidea.rxandroidble2.** { *; }
-dontwarn com.polidea.rxandroidble2.**
-keep class com.polidea.reactnativeble.** { *; }

# react-native-maps / Google Maps SDK — marker/overlay custom view stripping bilinen sorun
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.airbnb.android.react.maps.** { *; }

# Add any project specific keep options here:
