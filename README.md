# What We Eatin' 🍕

A mobile app that helps groups of friends decide what food to order together. Swipe-based, real-time, and designed to reach a decision in under 60 seconds.

## Quick Start

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

## Features

- **Swipe Cards** — Tinder-style swiping for restaurants (like, dislike, super-like)
- **Real-Time Sessions** — Create or join a session with friends via a 6-digit code
- **Smart Matching** — Consensus, majority, or weighted voting strategies
- **AI Decision** — "We don't care anymore" button picks the best match
- **Timer** — 2-minute countdown that auto-picks if time runs out
- **Social Layer** — See who's picky, who's online, live swipe progress

## Tech Stack

- **React Native** (Expo SDK 55)
- **TypeScript**
- **Zustand** (state management)
- **React Query** (data fetching)
- **React Native Reanimated** (60fps animations)
- **React Native Gesture Handler** (swipe gestures)
- **Firebase** (Firestore for real-time sync)

## Project Structure

```
app/                    # Expo Router screens
  _layout.tsx           # Root layout with providers
  index.tsx             # Home screen
  session/
    create.tsx          # Create session
    join.tsx            # Join session
    lobby.tsx           # Session lobby
    swipe.tsx           # Swipe screen (core)
src/
  components/           # UI components
    ui/                 # Base design system (Button, Avatar, Badge)
    CardStack.tsx       # Swipeable card stack
    SwipeCard.tsx       # Individual restaurant card
    SwipeActions.tsx    # Like/dislike/superlike buttons
    MatchAnimation.tsx  # Match celebration overlay
    Timer.tsx           # Countdown timer
    UserList.tsx        # Session participants
  hooks/                # Custom React hooks
  services/             # Firebase, API, ads foundations
  store/                # Zustand stores
  theme/                # Design system tokens
  types/                # TypeScript interfaces
  utils/                # Helpers, constants, mock data
```

Ad UI: `src/components/ads/AdBanner.tsx` · config: `src/services/ads.ts`

## Ads (AdMob)

Monetization uses **Google AdMob** via [`react-native-google-mobile-ads`](https://docs.page/invertase/react-native-google-mobile-ads) (native module). **`expo-ads-admob` is deprecated** — do not use it.

### Expo Go caveat

AdMob **does not run in Expo Go**. Foundations are scaffolded behind `EXPO_PUBLIC_ADS_ENABLED` (default off). With the flag on in Expo Go you only see a labeled **placeholder** on the home footer.

### Where ads fit (UX)

| Placement | Status | Notes |
|-----------|--------|--------|
| Home footer (between sessions) | Wired | First low-risk slot |
| Account screen | Later | Non-critical |
| After match dismiss | Later | Interstitial / small pause — not mid-celebration |
| Swipe card stack | Never | Breaks flow |
| Lobby / create critical CTAs | Avoid | |

### Enable placeholder (any client)

```bash
# .env
EXPO_PUBLIC_ADS_ENABLED=true
```

Restart Metro after changing env vars.

### Enable real AdMob (development build)

1. Create an [AdMob](https://admob.google.com/) account and register the iOS/Android apps (`com.whatweeatin.app`).
2. Install packages:
   ```bash
   npx expo install react-native-google-mobile-ads expo-dev-client
   ```
3. Configure `app.json`:
   - Under `expo.plugins`, add:
     ```json
     [
       "react-native-google-mobile-ads",
       {
         "androidAppId": "ca-app-pub-XXXX~YYYY",
         "iosAppId": "ca-app-pub-XXXX~ZZZZ"
       }
     ]
     ```
   - At the **root** of `app.json` (sibling of `"expo"`, not inside it):
     ```json
     "react-native-google-mobile-ads": {
       "android_app_id": "ca-app-pub-XXXX~YYYY",
       "ios_app_id": "ca-app-pub-XXXX~ZZZZ"
     }
     ```
4. Build a native client: `npm run build:dev` (EAS development profile already has `developmentClient: true`).
5. Set `EXPO_PUBLIC_ADS_NATIVE_LINKED=true`, then in `src/components/ads/AdBanner.tsx` replace the placeholder with `BannerAd` from the package (see TODO in that file).
6. For store builds only: set real unit IDs and `EXPO_PUBLIC_ADS_USE_PRODUCTION_IDS=true`.

Code entry points: `src/services/ads.ts`, `src/components/ads/AdBanner.tsx`.

## Configuration

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

The app works with mock data out of the box — no API keys required for development.

### EAS / TestFlight environment variables

Local `.env` is **not** uploaded to EAS Build. `EXPO_PUBLIC_*` must exist on [expo.dev → Environment variables](https://expo.dev) (or via CLI) for the profile’s `environment` in `eas.json` (`production`, `preview`, `development`).

```bash
# Create/update one var (example)
eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com' \
  --environment production --visibility plaintext --type string --non-interactive --force

# After changing env vars, rebuild — OTA alone is not enough for a missing native/bundle bake:
npm run build:ios
```

### Google Sign-In (OAuth clients)

Google Sign-In uses **two OAuth client types** — do not mix them on the Web client.

| Client type | Google Cloud setup | Used for |
| --- | --- | --- |
| **Web** | JS origin `https://auth.expo.io` · redirect `https://auth.expo.io/@yoavwerdiger/what-we-eatin` | Expo Go + Firebase token exchange (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) |
| **iOS** | Application type iOS · bundle ID `com.whatweeatin.app` | TestFlight / App Store native OAuth (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) |

**Do not** add `whatweeatin://oauthredirect` (or any custom scheme) to the **Web** client — Google rejects non-HTTPS redirect URIs on Web clients.

On standalone iOS builds, `expo-auth-session` (SDK 54) uses redirect `com.whatweeatin.app:/oauthredirect` when `iosClientId` is set. Firebase still needs the **Web** client ID for `signInWithCredential`.

```bash
# After creating the iOS OAuth client in Google Cloud Console:
eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID \
  --value 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com' \
  --environment production --visibility plaintext --force

# Rebuild after env changes (OTA alone is not enough):
npm run build:ios
```

Also enable **Google** in Firebase Console → Authentication → Sign-in method, and add the Web client ID there if prompted.
