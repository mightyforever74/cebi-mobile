import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

// Screens
import Home from "../screens/Home";

// Super Admin Screens
import SuperAdminCompaniesScreen from "../screens/superadmin/SuperAdminCompaniesScreen";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";

// Admin Screens (placeholders for now)
// import FleetMapScreen from "../screens/admin/FleetMapScreen";
// import VehiclesScreen from "../screens/admin/VehiclesScreen";

// Driver Screens (placeholders for now)
// import DriverTasksScreen from "../screens/driver/DriverTasksScreen";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Hamburger Menu Button Component
const HamburgerButton = ({ navigation }) => (
  <TouchableOpacity
    style={styles.hamburgerButton}
    onPress={() => navigation.openDrawer()}
  >
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
  </TouchableOpacity>
);

// Screen options with hamburger menu
const getScreenOptions =
  (title, color) =>
  ({ navigation }) => ({
    title,
    headerStyle: {
      backgroundColor: color,
      elevation: 4,
      shadowOpacity: 0.3,
    },
    headerTintColor: "#fff",
    headerTitleStyle: {
      fontWeight: "bold",
      fontSize: 18,
    },
    headerLeft: () => <HamburgerButton navigation={navigation} />,
  });

// Custom Drawer Content
const CustomDrawerContent = (props) => {
  const { user, logout } = useAuth();

  const getRoleColor = () => {
    switch (user?.role) {
      case "super_admin":
        return "#8b5cf6";
      case "company_admin":
        return "#5e72e4";
      case "driver":
        return "#2dce89";
      default:
        return "#5e72e4";
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "super_admin":
        return "Super Admin";
      case "company_admin":
        return "Şirket Yöneticisi";
      case "driver":
        return "Sürücü";
      default:
        return "Kullanıcı";
    }
  };

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Çıkış yapmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <View style={styles.drawerContainer}>
      {/* Header */}
      <View style={[styles.drawerHeader, { backgroundColor: getRoleColor() }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🌷</Text>
        </View>
        <Text style={styles.drawerTitle}>TulipFleet</Text>
        <Text style={styles.drawerEmail}>
          {user?.email || "user@tulipfleet.com"}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel()}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <DrawerContentScrollView {...props} style={styles.menuContainer}>
        {props.state.routes.map((route, index) => {
          const focused = props.state.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.menuItem,
                focused && { backgroundColor: getRoleColor() + "20" },
              ]}
              onPress={() => props.navigation.navigate(route.name)}
            >
              <Text
                style={[
                  styles.menuText,
                  focused && { color: getRoleColor(), fontWeight: "bold" },
                ]}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Çıkış Yap</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>TulipFleet v1.3.0</Text>
      </View>
    </View>
  );
};

// ============================================
// SUPER ADMIN NAVIGATOR
// ============================================
const SuperAdminNavigator = () => {
  const primaryColor = "#8b5cf6";

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: "#fff",
          width: 280,
        },
        drawerActiveTintColor: primaryColor,
        drawerInactiveTintColor: "#525f7f",
      }}
    >
      <Drawer.Screen
        name="🏠 Ana Sayfa"
        component={SuperAdminDashboard}
        options={getScreenOptions("TulipFleet Super Admin", primaryColor)}
      />
      <Drawer.Screen
        name="🏢 Şirketler"
        component={SuperAdminCompaniesScreen}
        options={getScreenOptions("Şirket Yönetimi", primaryColor)}
      />
      <Drawer.Screen
        name="🗺️ Canlı Harita"
        component={PlaceholderScreen}
        options={getScreenOptions("Canlı Harita", primaryColor)}
      />
      <Drawer.Screen
        name="🚛 Tüm Araçlar"
        component={PlaceholderScreen}
        options={getScreenOptions("Tüm Araçlar", primaryColor)}
      />
      <Drawer.Screen
        name="👥 Tüm Sürücüler"
        component={PlaceholderScreen}
        options={getScreenOptions("Tüm Sürücüler", primaryColor)}
      />
      <Drawer.Screen
        name="📋 Tüm Görevler"
        component={PlaceholderScreen}
        options={getScreenOptions("Tüm Görevler", primaryColor)}
      />
      <Drawer.Screen
        name="🚨 Sistem Uyarıları"
        component={PlaceholderScreen}
        options={getScreenOptions("Sistem Uyarıları", primaryColor)}
      />
      <Drawer.Screen
        name="⚙️ Ayarlar"
        component={PlaceholderScreen}
        options={getScreenOptions("Ayarlar", primaryColor)}
      />
    </Drawer.Navigator>
  );
};

// ============================================
// COMPANY ADMIN NAVIGATOR
// ============================================
const AdminNavigator = () => {
  const primaryColor = "#5e72e4";

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: "#fff",
          width: 280,
        },
        drawerActiveTintColor: primaryColor,
        drawerInactiveTintColor: "#525f7f",
      }}
    >
      <Drawer.Screen
        name="🏠 Ana Sayfa"
        component={Home}
        options={getScreenOptions("TulipFleet Admin", primaryColor)}
      />
      <Drawer.Screen
        name="🗺️ Canlı Harita"
        component={PlaceholderScreen}
        options={getScreenOptions("Canlı Harita", primaryColor)}
      />
      <Drawer.Screen
        name="🚛 Araçlar"
        component={PlaceholderScreen}
        options={getScreenOptions("Araçlar", primaryColor)}
      />
      <Drawer.Screen
        name="👥 Sürücüler"
        component={PlaceholderScreen}
        options={getScreenOptions("Sürücüler", primaryColor)}
      />
      <Drawer.Screen
        name="📋 Görevler"
        component={PlaceholderScreen}
        options={getScreenOptions("Görevler", primaryColor)}
      />
      <Drawer.Screen
        name="🚨 Uyarılar"
        component={PlaceholderScreen}
        options={getScreenOptions("Uyarılar", primaryColor)}
      />
      <Drawer.Screen
        name="⚙️ Ayarlar"
        component={PlaceholderScreen}
        options={getScreenOptions("Ayarlar", primaryColor)}
      />
    </Drawer.Navigator>
  );
};

// ============================================
// DRIVER NAVIGATOR
// ============================================
const DriverNavigator = () => {
  const primaryColor = "#2dce89";

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: "#fff",
          width: 280,
        },
        drawerActiveTintColor: primaryColor,
        drawerInactiveTintColor: "#525f7f",
      }}
    >
      <Drawer.Screen
        name="🏠 Ana Sayfa"
        component={Home}
        options={getScreenOptions("TulipFleet", primaryColor)}
      />
      <Drawer.Screen
        name="🗺️ Harita"
        component={PlaceholderScreen}
        options={getScreenOptions("Harita", primaryColor)}
      />
      <Drawer.Screen
        name="📋 Görevlerim"
        component={PlaceholderScreen}
        options={getScreenOptions("Görevlerim", primaryColor)}
      />
      <Drawer.Screen
        name="🚛 Aracım"
        component={PlaceholderScreen}
        options={getScreenOptions("Aracım", primaryColor)}
      />
      <Drawer.Screen
        name="👤 Profilim"
        component={PlaceholderScreen}
        options={getScreenOptions("Profilim", primaryColor)}
      />
      <Drawer.Screen
        name="⚙️ Ayarlar"
        component={PlaceholderScreen}
        options={getScreenOptions("Ayarlar", primaryColor)}
      />
    </Drawer.Navigator>
  );
};

// Placeholder Screen for unimplemented features
const PlaceholderScreen = ({ route }) => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderEmoji}>🚧</Text>
    <Text style={styles.placeholderTitle}>Yapım Aşamasında</Text>
    <Text style={styles.placeholderSubtitle}>{route.name}</Text>
    <Text style={styles.placeholderText}>Bu özellik yakında eklenecek!</Text>
  </View>
);

// ============================================
// MAIN NAVIGATOR (Role-based routing)
// ============================================
const MainNavigator = () => {
  const { user } = useAuth();

  const getNavigatorForRole = () => {
    switch (user?.role) {
      case "super_admin":
        return <SuperAdminNavigator />;
      case "company_admin":
        return <AdminNavigator />;
      case "driver":
        return <DriverNavigator />;
      default:
        return <DriverNavigator />;
    }
  };

  return getNavigatorForRole();
};

const styles = StyleSheet.create({
  // Hamburger Button
  hamburgerButton: {
    marginLeft: 15,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  hamburgerLine: {
    width: 22,
    height: 3,
    backgroundColor: "#fff",
    marginVertical: 2,
    borderRadius: 2,
  },

  // Drawer
  drawerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  drawerHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  logoText: {
    fontSize: 30,
  },
  drawerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  drawerEmail: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  // Menu
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    fontSize: 15,
    color: "#525f7f",
  },

  // Footer
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: "#f5365c",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  versionText: {
    textAlign: "center",
    color: "#8898aa",
    fontSize: 11,
  },

  // Placeholder
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  placeholderEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#32325d",
    marginBottom: 10,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: "#5e72e4",
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 14,
    color: "#8898aa",
  },
});

export default MainNavigator;
