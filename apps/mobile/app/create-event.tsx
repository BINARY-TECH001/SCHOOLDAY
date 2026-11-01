import { CreateEventScreen } from "../src/features/CreateEventScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["settings"]}>
      <CreateEventScreen />
    </Guard>
  );
}
