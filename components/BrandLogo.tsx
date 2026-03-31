import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const LOGO = require("../assets/images/animal.png");

type BrandLogoProps = {
  size?: number;
};

/** Rent Squirrel mascot from `assets/images/animal.png`. */
export function BrandLogo({ size = 160 }: BrandLogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image source={LOGO} style={StyleSheet.absoluteFill} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
  },
});
