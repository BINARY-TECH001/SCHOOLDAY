import { Payment } from "../src/features/Payments";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";
export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["payments"]}>
      <Payment
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
