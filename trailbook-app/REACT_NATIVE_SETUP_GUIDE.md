# Complete React Native App Development Guide

## Step-by-Step Guide to Building a React Native App

### Prerequisites

1. **Node.js** (v18 or later)
   - Download from [nodejs.org](https://nodejs.org/)

2. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

3. **For iOS Development (Mac only):**
   - Xcode (from App Store)
   - CocoaPods: `sudo gem install cocoapods`

4. **For Android Development:**
   - Android Studio
   - Android SDK
   - Java Development Kit (JDK 17 or later)
   - Set up Android environment variables

### Step 1: Choose Your Approach

**Option A: Expo (Recommended for Beginners)**
- Easier setup, faster development
- Built-in tools and services
- Can eject to bare React Native later

**Option B: React Native CLI (Bare Workflow)**
- More control and flexibility
- Direct access to native code
- Better for complex native features

### Step 2: Initialize Your Project

#### Using Expo (Recommended):
```bash
npx create-expo-app TrailbookMobile
cd TrailbookMobile
```

#### Using React Native CLI:
```bash
npx react-native@latest init TrailbookMobile
cd TrailbookMobile
```

### Step 3: Project Structure

A typical React Native app structure:
```
TrailbookMobile/
├── App.js / App.tsx          # Main entry point
├── src/
│   ├── screens/              # Screen components
│   ├── components/           # Reusable components
│   ├── navigation/           # Navigation setup
│   ├── services/             # API calls, services
│   ├── utils/                # Helper functions
│   ├── hooks/                # Custom hooks
│   ├── context/              # Context providers
│   └── constants/            # Constants, config
├── assets/                   # Images, fonts, etc.
├── android/                  # Android native code
├── ios/                      # iOS native code
└── package.json
```

### Step 4: Essential Dependencies

Install commonly needed packages:

```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# UI Components
npm install react-native-paper  # or react-native-elements

# State Management
npm install @reduxjs/toolkit react-redux  # or Zustand, Jotai

# HTTP Client
npm install axios

# Async Storage
npm install @react-native-async-storage/async-storage

# Forms
npm install react-hook-form

# Icons
npm install react-native-vector-icons

# For Expo projects, also install:
npx expo install react-native-screens react-native-safe-area-context
```

### Step 5: Set Up Navigation

Create a navigation structure:

```typescript
// src/navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Step 6: Create Core Screens

Start with basic screens:
- Home/Feed Screen
- Profile Screen
- Album Detail Screen
- Authentication Screens
- Settings Screen

### Step 7: Set Up API Integration

Create API service layer:

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'https://your-api-url.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export default api;
```

### Step 8: State Management

Choose and set up state management:
- Redux Toolkit (for complex state)
- Zustand (lightweight)
- Context API (for simpler apps)

### Step 9: Styling

React Native uses StyleSheet API:

```typescript
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
```

Or use libraries like:
- NativeWind (Tailwind CSS for React Native)
- Styled Components
- React Native Paper (Material Design)

### Step 10: Testing

Set up testing:
```bash
npm install --save-dev jest @testing-library/react-native
```

### Step 11: Running Your App

#### Expo:
```bash
npm start
# Then press 'i' for iOS or 'a' for Android
```

#### React Native CLI:
```bash
# iOS
npm run ios

# Android
npm run android
```

### Step 12: Building for Production

#### Expo:
```bash
# Build APK/IPA
eas build --platform android
eas build --platform ios
```

#### React Native CLI:
```bash
# Android
cd android && ./gradlew assembleRelease

# iOS
# Build through Xcode
```

## Key Differences from Web React

1. **No HTML/CSS**: Use React Native components (`View`, `Text`, `Image`)
2. **Styling**: Use StyleSheet API, not CSS
3. **Navigation**: Use React Navigation, not React Router
4. **Platform-specific code**: Use `Platform.OS` to detect iOS/Android
5. **No browser APIs**: Use React Native alternatives

## Best Practices

1. **Performance:**
   - Use `FlatList` for long lists
   - Optimize images
   - Use `React.memo` for expensive components

2. **Code Organization:**
   - Keep components small and focused
   - Separate business logic from UI
   - Use TypeScript for type safety

3. **Error Handling:**
   - Implement error boundaries
   - Handle network errors gracefully
   - Show user-friendly error messages

4. **Testing:**
   - Write unit tests for utilities
   - Test components with React Native Testing Library
   - Test on real devices

## Next Steps

1. Set up your development environment
2. Initialize the project
3. Install essential dependencies
4. Create your first screen
5. Set up navigation
6. Integrate with your backend API
7. Add authentication
8. Implement core features
9. Test on devices
10. Build and deploy

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Community](https://github.com/react-native-community)
