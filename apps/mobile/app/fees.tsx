import { Fees } from "../src/features/Fees";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";
export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["fees", "finance", "students"]}>
      <Fees
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
