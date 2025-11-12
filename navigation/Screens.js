import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { Dimensions } from "react-native";

// screens
import Home from "../screens/Home";
import NotificationsScreen from "../screens/Notifications";
import Profile from "../screens/Profile";
import Register from "../screens/Register";
import SettingsScreen from "../screens/Settings";

// drawer
import CustomDrawerContent from "./Menu";

// header for screens
import { Header } from "../components";

const { width } = Dimensions.get("screen");

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// ============================================================================
// SETTINGS STACK
// ============================================================================
function SettingsStack(props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          header: ({ navigation, scene }) => (
            <Header title="Settings" scene={scene} navigation={navigation} />
          ),
          cardStyle: { backgroundColor: "#F8F9FE" },
        }}
      />
    </Stack.Navigator>
  );
}

// ============================================================================
// NOTIFICATIONS STACK
// ============================================================================
function NotificationsStack(props) {
  return (
    <Stack.Navigator
      initialRouteName="Notifications"
      screenOptions={{
        headerShown: true,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          header: ({ navigation, scene }) => (
            <Header
              title="Fleet Alerts"
              navigation={navigation}
              scene={scene}
            />
          ),
          cardStyle: { backgroundColor: "#F8F9FE" },
        }}
      />
    </Stack.Navigator>
  );
}

// ============================================================================
// PROFILE STACK
// ============================================================================
function ProfileStack(props) {
  return (
    <Stack.Navigator
      initialRouteName="Profile"
      screenOptions={{
        headerShown: true,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{
          header: ({ navigation, scene }) => (
            <Header
              transparent
              white
              title="Profile"
              navigation={navigation}
              scene={scene}
            />
          ),
          cardStyle: { backgroundColor: "#FFFFFF" },
          headerTransparent: true,
        }}
      />
    </Stack.Navigator>
  );
}

// ============================================================================
// HOME STACK (Fleet Dashboard)
// ============================================================================
function HomeStack(props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="Home"
        component={Home}
        options={{
          header: ({ navigation, scene }) => (
            <Header
              title="Fleet Dashboard"
              search
              options
              navigation={navigation}
              scene={scene}
            />
          ),
          cardStyle: { backgroundColor: "#F8F9FE" },
        }}
      />
    </Stack.Navigator>
  );
}

// ============================================================================
// APP STACK (MAIN DRAWER NAVIGATION)
// ============================================================================
function AppStack(props) {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEnabled: true,
        drawerStyle: {
          backgroundColor: "white",
          width: width * 0.8,
        },
      }}
      initialRouteName="HomeDrawer"
    >
      <Drawer.Screen name="HomeDrawer" component={HomeStack} />
      <Drawer.Screen name="ProfileDrawer" component={ProfileStack} />
      <Drawer.Screen
        name="NotificationsDrawer"
        component={NotificationsStack}
      />
      <Drawer.Screen name="SettingsDrawer" component={SettingsStack} />
    </Drawer.Navigator>
  );
}

// ============================================================================
// ONBOARDING STACK (ROOT NAVIGATOR)
// ============================================================================
export default function OnboardingStack(props) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={Register}
        options={{
          headerTransparent: true,
          headerShown: false,
        }}
      />
      <Stack.Screen name="App" component={AppStack} />
    </Stack.Navigator>
  );
}
