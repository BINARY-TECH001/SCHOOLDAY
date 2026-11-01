import { InviteStaffScreen } from "../src/features/InviteStaffScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["directory"]}>
      <InviteStaffScreen />
    </Guard>
  );
}
