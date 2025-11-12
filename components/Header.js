import { CommonActions } from "@react-navigation/native";
import { Block, Button, NavBar, Text, theme } from "galio-framework";
import React from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import argonTheme from "../constants/Theme";
import Icon from "./Icon";
import Input from "./Input";
import Tabs from "./Tabs";

const { height, width } = Dimensions.get("window");
const iPhoneX = () =>
  Platform.OS === "ios" &&
  (height === 812 || width === 812 || height === 896 || width === 896);

// ---- ROUTE NAMES ----
const ROUTES = {
  APP: "App",
  PERSONAL: "Personal",
  SYSTEM: "System",
};

// ---- SAFE NAVIGATE ----
const safeNavigate = (navigation, routeName, params) => {
  const state = navigation?.getState?.();
  const hasRoute =
    state?.routes?.some((r) => r.name === routeName) ||
    state?.routeNames?.includes?.(routeName);
  if (hasRoute) navigation.navigate(routeName, params);
  else console.warn(`[Header] Route not found: ${routeName}`);
};

// ---- BELL BUTTON ONLY (Cart/Search kaldırıldı) ----
const BellButton = ({ isWhite, style, navigation }) => (
  <TouchableOpacity
    style={[styles.button, style]}
    onPress={() => safeNavigate(navigation, ROUTES.SYSTEM)}
  >
    <Icon
      family="ArgonExtra"
      size={16}
      name="bell"
      color={argonTheme.COLORS[isWhite ? "WHITE" : "ICON"]}
    />
    <Block middle style={styles.notify} />
  </TouchableOpacity>
);

class Header extends React.Component {
  handleLeftPress = () => {
    const { back, navigation } = this.props;
    return back
      ? navigation.dispatch(CommonActions.goBack())
      : navigation.openDrawer();
  };

  renderRight = () => {
    const { white, title, navigation } = this.props;

    const showBellOn = new Set([ROUTES.APP, ROUTES.PERSONAL, ROUTES.SYSTEM]);

    if (showBellOn.has(title)) {
      return [
        <BellButton key="bell" navigation={navigation} isWhite={white} />,
      ];
    }
    return null;
  };

  renderSearch = () => {
    const { navigation } = this.props;
    return (
      <Input
        right
        color="black"
        style={styles.search}
        placeholder="What are you looking for?"
        placeholderTextColor={"#8898AA"}
        onFocus={() => {
          Keyboard.dismiss();
          safeNavigate(navigation, ROUTES.PERSONAL); // istersen burayı farklı bir route yap
        }}
        iconContent={
          <Icon
            size={16}
            color={theme.COLORS.MUTED}
            name="search-zoom-in"
            family="ArgonExtra"
          />
        }
      />
    );
  };

  renderOptions = () => {
    const { navigation, optionLeft, optionRight } = this.props;

    return (
      <Block row style={styles.options}>
        <Button
          shadowless
          style={[styles.tab, styles.divider]}
          onPress={() => safeNavigate(navigation, ROUTES.PERSONAL)}
        >
          <Block row middle>
            <Icon
              name="user"
              family="Feather"
              style={styles.icon}
              color={argonTheme.COLORS.ICON}
            />
            <Text
              size={16}
              style={[{ fontFamily: "open-sans-regular" }, styles.tabTitle]}
            >
              {optionLeft || "Personal"}
            </Text>
          </Block>
        </Button>

        <Button
          shadowless
          style={styles.tab}
          onPress={() => safeNavigate(navigation, ROUTES.SYSTEM)}
        >
          <Block row middle>
            <Icon
              size={16}
              name="settings"
              family="Feather"
              style={styles.icon}
              color={argonTheme.COLORS.ICON}
            />
            <Text
              size={16}
              style={[{ fontFamily: "open-sans-regular" }, styles.tabTitle]}
            >
              {optionRight || "System"}
            </Text>
          </Block>
        </Button>
      </Block>
    );
  };

  renderTabs = () => {
    const { tabs, tabIndex, navigation } = this.props;
    const defaultTab = tabs && tabs[0] && tabs[0].id;
    if (!tabs) return null;

    return (
      <Tabs
        data={tabs || []}
        initialIndex={tabIndex || defaultTab}
        onChange={(id) => navigation.setParams({ tabId: id })}
      />
    );
  };

  renderHeader = () => {
    const { search, options, tabs } = this.props;
    if (search || tabs || options) {
      return (
        <Block center>
          {search ? this.renderSearch() : null}
          {options ? this.renderOptions() : null}
          {tabs ? this.renderTabs() : null}
        </Block>
      );
    }
    return null;
  };

  render() {
    const {
      back,
      title,
      white,
      transparent,
      bgColor,
      iconColor,
      titleColor,
      navigation,
      ...props
    } = this.props;

    const noShadow = [
      "Search",
      "Categories",
      "Deals",
      "Pro",
      "Profile",
    ].includes(title);

    const headerStyles = [
      !noShadow ? styles.shadow : null,
      transparent ? { backgroundColor: "rgba(0,0,0,0)" } : null,
    ];

    const navbarStyles = [
      styles.navbar,
      bgColor && { backgroundColor: bgColor },
    ];

    return (
      <Block style={headerStyles}>
        <NavBar
          back={false}
          title={title}
          style={navbarStyles}
          transparent={transparent}
          right={this.renderRight()}
          rightStyle={{ alignItems: "center" }}
          onLeftPress={this.handleLeftPress}
          left={
            <Icon
              name={back ? "chevron-left" : "menu"}
              family="entypo"
              size={20}
              onPress={this.handleLeftPress}
              color={
                iconColor ||
                (white ? argonTheme.COLORS.WHITE : argonTheme.COLORS.ICON)
              }
              style={{ marginTop: 2 }}
            />
          }
          leftStyle={{ paddingVertical: 12, flex: 0.2 }}
          titleStyle={[
            styles.title,
            { color: argonTheme.COLORS[white ? "WHITE" : "HEADER"] },
            titleColor && { color: titleColor },
          ]}
          {...props}
        />
        {this.renderHeader()}
      </Block>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    position: "relative",
  },
  title: {
    width: "100%",
    fontSize: 16,
    fontWeight: "bold",
  },
  navbar: {
    paddingVertical: 0,
    paddingBottom: theme.SIZES.BASE * 1.5,
    paddingTop: iPhoneX() ? theme.SIZES.BASE * 4 : theme.SIZES.BASE,
    zIndex: 5,
  },
  shadow: {
    backgroundColor: theme.COLORS.WHITE,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.2,
    elevation: 3,
  },
  notify: {
    backgroundColor: argonTheme.COLORS.LABEL,
    borderRadius: 4,
    height: theme.SIZES.BASE / 2,
    width: theme.SIZES.BASE / 2,
    position: "absolute",
    top: 9,
    right: 12,
  },
  header: {
    backgroundColor: theme.COLORS.WHITE,
  },
  divider: {
    borderRightWidth: 0.3,
    borderRightColor: theme.COLORS.ICON,
  },
  search: {
    height: 48,
    width: width - 32,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 3,
    borderColor: argonTheme.COLORS.BORDER,
  },
  options: {
    marginBottom: 24,
    marginTop: 10,
    elevation: 4,
  },
  tab: {
    backgroundColor: theme.COLORS.TRANSPARENT,
    width: width * 0.35,
    borderRadius: 0,
    borderWidth: 0,
    height: 24,
    elevation: 0,
  },
  tabTitle: {
    lineHeight: 19,
    fontWeight: "400",
    color: argonTheme.COLORS.HEADER,
  },
  icon: { paddingRight: 8 },
});

export default Header;
