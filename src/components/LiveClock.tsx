import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText as Text } from "./InterTypography";

import { useTheme } from "../theme/ThemeProvider";

export default function LiveClock() {
  const { colors } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.clock, { color: colors.textPrimary }]}>
        {formattedTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  clock: {
    textAlign: "center",
    fontSize: 46,
    lineHeight: 54,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
