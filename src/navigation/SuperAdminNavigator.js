// src/navigation/SuperAdminNavigator.js
import { createStackNavigator } from "@react-navigation/stack";

// Super Admin Screens
import CompaniesScreen from "../screens/superadmin/CompaniesScreen";
import CreateCompanyScreen from "../screens/superadmin/CreateCompanyScreen";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";

const Stack = createStackNavigator();

const SuperAdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#5E72E4",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: "#FFF",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="SuperAdminDashboard"
        component={SuperAdminDashboard}
        options={{ title: "🌷 Super Admin" }}
      />
      <Stack.Screen
        name="Companies"
        component={CompaniesScreen}
        options={{ title: "🏢 Şirketler" }}
      />
      <Stack.Screen
        name="CreateCompany"
        component={CreateCompanyScreen}
        options={{ title: "➕ Yeni Şirket" }}
      />
      <Stack.Screen
        name="CompanyDetail"
        component={CompaniesScreen} // TODO: Create CompanyDetailScreen
        options={{ title: "🏢 Şirket Detayı" }}
      />
      <Stack.Screen
        name="EditCompany"
        component={CreateCompanyScreen} // Reuse with edit mode
        options={{ title: "✏️ Şirket Düzenle" }}
      />
      <Stack.Screen
        name="AllUsers"
        component={CompaniesScreen} // TODO: Create AllUsersScreen
        options={{ title: "👥 Tüm Kullanıcılar" }}
      />
      <Stack.Screen
        name="SystemLogs"
        component={CompaniesScreen} // TODO: Create SystemLogsScreen
        options={{ title: "📋 Sistem Logları" }}
      />
    </Stack.Navigator>
  );
};

export default SuperAdminNavigator;
