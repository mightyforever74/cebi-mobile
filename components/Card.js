import { Block, Text } from "galio-framework";
import { Image, Pressable } from "react-native";
import { argonTheme } from "../constants";

export default function ItemCard({
  item,
  navigation,
  onPress,
  horizontal = false,
  cardContainer,
  imgContainer,
  imageStyles,
  styles = {},
  ctaRight,
  ctaColor,
}) {
  const handlePress = () => {
    if (typeof onPress === "function") return onPress(item);
    return navigation?.navigate?.("Product", { product: item });
  };

  return (
    <Block row={horizontal} card flex style={cardContainer}>
      <Pressable onPress={handlePress} style={{ flex: 1 }}>
        <Block flex style={imgContainer}>
          <Image source={{ uri: item?.image }} style={imageStyles} />
        </Block>

        <Block row space="between" style={styles.cardDescription}>
          <Block flex>
            <Text
              size={14}
              color={argonTheme?.COLORS?.TEXT}
              style={[{ fontFamily: "open-sans-regular" }, styles.cardTitle]}
              numberOfLines={1}
            >
              {item?.title}
            </Text>

            {item?.body ? (
              <Block flex left>
                <Text
                  style={{ fontFamily: "open-sans-regular" }}
                  size={12}
                  color={argonTheme?.COLORS?.TEXT}
                  numberOfLines={2}
                >
                  {item.body}
                </Text>
              </Block>
            ) : null}
          </Block>

          <Block right={!!ctaRight}>
            <Text
              style={{ fontFamily: "open-sans-bold" }}
              size={12}
              muted={!ctaColor}
              color={ctaColor || argonTheme?.COLORS?.ACTIVE}
              bold
              numberOfLines={1}
            >
              {item?.cta}
            </Text>
          </Block>
        </Block>
      </Pressable>
    </Block>
  );
}
