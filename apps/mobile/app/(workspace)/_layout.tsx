import { Tabs } from "expo-router";
import { Guard } from "../../src/components/Guard";
import { useApp } from "../../src/providers/AppProvider";
import { FloatingNav } from "../../src/features/Workspace";
export default function Workspace() {
  const { context } = useApp();
  return (
    <Guard>
      <Tabs
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
        screenOptions={{ headerShown: false }}
        tabBar={({ state, navigateToTab, emitter }) => (
          <FloatingNav
            active={state.routes[state.index]?.name ?? "home"}
            onNavigate={(name) => {
              const route = state.routes.find((item) => item.name === name);
              if (!route) return;
              const event = emitter.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) navigateToTab(route.key);
            }}
          />
        )}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="wallet" />
        <Tabs.Screen name="work" options={{ href: null }} />
        <Tabs.Screen name="messages" />
        <Tabs.Screen name="more" />
      </Tabs>
    </Guard>
  );
}
