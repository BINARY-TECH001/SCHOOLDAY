import { StaffDirectoryScreen } from "../src/features/directory/StaffDirectoryScreen";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";

export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["directory"]}>
      <StaffDirectoryScreen
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
