import { CreateClassScreen } from "../src/features/CreateClassScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["settings", "staffManage"]}>
      <CreateClassScreen />
    </Guard>
  );
}
