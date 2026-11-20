import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

// Native, transparent navigation bar: on iOS 26 its toolbar buttons render as
// system Liquid Glass. Each screen supplies its own <Stack.Toolbar> items, since
// leaving a session has to run logic before navigating.
export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackVisible: false,
        title: '',
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
