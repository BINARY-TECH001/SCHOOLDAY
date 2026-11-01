import { Lessons } from "../src/features/Lessons";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";
export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["lessons"]}>
      <Lessons
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
