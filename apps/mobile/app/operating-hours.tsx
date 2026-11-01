import { OperatingHoursScreen } from "../src/features/OperatingHoursScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["settings"]}>
      <OperatingHoursScreen />
    </Guard>
  );
}
