// Iconsax publishes per-icon JS modules but only an aggregate declaration.
// Deep imports keep unused icon families out of Metro's dependency graph.
declare module "iconsax-react-native/dist/esm/*" {
  import type { Icon } from "iconsax-react-native";
  const component: Icon;
  export default component;
}
