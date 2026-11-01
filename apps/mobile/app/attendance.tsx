import { Attendance } from "../src/features/Attendance";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";
export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["attendance"]}>
      <Attendance
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
