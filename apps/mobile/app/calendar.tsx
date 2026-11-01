import { CalendarScreen } from "../src/features/CalendarScreen";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";

export default function Route() {
  const { context } = useApp();
  return (
    <Guard>
      <CalendarScreen
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
