import { ClassDetailScreen } from "../src/features/ClassDetailScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["classes"]}>
      <ClassDetailScreen />
    </Guard>
  );
}
