import { ClassesScreen } from "../src/features/ClassesScreen";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";

export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["classes"]}>
      <ClassesScreen
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
