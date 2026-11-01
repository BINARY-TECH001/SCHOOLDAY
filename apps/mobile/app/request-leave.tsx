import { RequestLeaveScreen } from "../src/features/leave/screens/RequestLeaveScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["leave"]}>
      <RequestLeaveScreen />
    </Guard>
  );
}
