import { LeaveScreen } from "../src/features/leave/LeaveScreen";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";

export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["leave"]}>
      <LeaveScreen
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
