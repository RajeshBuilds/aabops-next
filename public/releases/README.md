# Android client APK

Place `android-client.apk` in this folder so the **Download Android app** button on aabops.com serves it directly.

Alternatively, host the APK elsewhere (e.g. GitHub Releases) and set:

```bash
NEXT_PUBLIC_ANDROID_APK_URL=https://github.com/YOUR_ORG/YOUR_REPO/releases/latest/download/android-client.apk
```

Then the header button will use that URL instead.
