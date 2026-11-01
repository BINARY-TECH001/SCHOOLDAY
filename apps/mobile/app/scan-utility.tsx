import { ScanUtilityScreen } from "../src/features/ScanUtilityScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["attendance"]}>
      <ScanUtilityScreen />
    </Guard>
  );
}
