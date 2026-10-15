import type { ComponentProps } from "react";
import { Tabs } from "expo-router";

import CustomTabBar from "../../components/CustomTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...(props as unknown as ComponentProps<typeof CustomTabBar>)}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />

      <Tabs.Screen
        name="leave"
        options={{
          title: "Leave",
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="reimbursement"
        options={{
          title: "Reimburse",
        }}
      />

      <Tabs.Screen
        name="payout"
        options={{
          title: "Payout",
        }}
      />
    </Tabs>
  );
}
