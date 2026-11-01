import { StaffDetailScreen } from "../src/features/StaffDetailScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["directory"]}>
      <StaffDetailScreen />
    </Guard>
  );
}
