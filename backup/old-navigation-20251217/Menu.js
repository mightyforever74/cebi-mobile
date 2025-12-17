import { CommonActions } from "@react-navigation/native";
import { Block, Text, theme } from "galio-framework";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeArea } from "react-native-safe-area-context";
import Icon from "../components/Icon";
import { DrawerItem as DrawerCustomItem } from "../components/index";
import Images from "../constants/Images";
import { useAuth } from "../src/context/AuthContext";

const { width } = Dimensions.get("screen");

function CustomDrawerContent({
  drawerPosition,
  navigation,
  profile,
  focused,
  state,
  ...rest
}) {
  const insets = useSafeArea();
  const { user, logout } = useAuth();

  const screens = [
    { title: "Dashboard", navigateTo: "HomeDrawer" },
    { title: "Fleet Alerts", navigateTo: "NotificationsDrawer" },
    { title: "My Profile", navigateTo: "ProfileDrawer" },
    { title: "Settings", navigateTo: "SettingsDrawer" },
  ];

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🚪 Logging out...");

              // 1. AuthContext logout (clears token & state)
              await logout();
              console.log("✅ AuthContext logout complete");

              // 2. Navigation reset - Go to Login screen
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                })
              );
              console.log("✅ Navigation reset to Login");
            } catch (error) {
              console.error("❌ Logout error:", error);

              // Fallback: Still try to navigate to login
              try {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                  })
                );
              } catch (navError) {
                console.error("❌ Navigation error:", navError);
                Alert.alert(
                  "Hata",
                  "Çıkış yapılırken bir hata oluştu. Uygulamayı yeniden başlatın."
                );
              }
            }
          },
        },
      ]
    );
  };

  return (
    <Block
      style={styles.container}
      forceInset={{ top: "always", horizontal: "never" }}
    >
      <Block flex={0.06} style={styles.header}>
        <Image styles={styles.logo} source={Images.Logo} />
      </Block>

      {/* User Info */}
      {user && (
        <Block style={styles.userInfo}>
          <Block style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.email?.charAt(0).toUpperCase() || "U"}
            </Text>
          </Block>
          <Block style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.first_name || user.email?.split("@")[0] || "Kullanıcı"}
            </Text>
            <Text style={styles.userRole}>
              {user.role === "company_admin"
                ? "Yönetici"
                : user.role === "driver"
                ? "Sürücü"
                : user.role === "super_admin"
                ? "Süper Admin"
                : user.role}
            </Text>
            {user.company?.name && (
              <Text style={styles.companyName}>{user.company.name}</Text>
            )}
          </Block>
        </Block>
      )}

      <Block flex style={{ paddingLeft: 8, paddingRight: 14 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {screens.map((item, index) => {
            return (
              <DrawerCustomItem
                title={item?.title}
                key={index}
                navigation={navigation}
                focused={state.index === index ? true : false}
                navigateTo={item?.navigateTo}
              />
            );
          })}

          <Block
            flex
            style={{ marginTop: 24, marginVertical: 8, paddingHorizontal: 8 }}
          >
            <Block
              style={{
                borderColor: "rgba(0,0,0,0.2)",
                width: "100%",
                borderWidth: StyleSheet.hairlineWidth,
              }}
            />
            <Text
              color="#8898AA"
              style={{
                marginTop: 16,
                marginLeft: 8,
                fontFamily: "open-sans-regular",
              }}
            >
              DOCUMENTATION
            </Text>
          </Block>
          <DrawerCustomItem title="Getting Started" navigation={navigation} />

          {/* Logout Section */}
          <Block
            style={{ marginTop: 24, marginVertical: 8, paddingHorizontal: 8 }}
          >
            <Block
              style={{
                borderColor: "rgba(0,0,0,0.2)",
                width: "100%",
                borderWidth: StyleSheet.hairlineWidth,
              }}
            />
          </Block>

          {/* Logout Button - Dashboard Style */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon
              name="log-out"
              family="Feather"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      </Block>
    </Block>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 28,
    paddingBottom: theme.SIZES.BASE,
    paddingTop: theme.SIZES.BASE * 3,
    justifyContent: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F7FAFC",
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5E72E4",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#32325D",
  },
  userRole: {
    fontSize: 12,
    color: "#5E72E4",
    marginTop: 2,
  },
  companyName: {
    fontSize: 11,
    color: "#8898AA",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: "#F5365C",
    shadowColor: "#F5365C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default CustomDrawerContent;
