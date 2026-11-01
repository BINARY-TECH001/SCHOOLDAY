import { PayrollScreen } from "../src/features/PayrollScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["payroll"]}>
      <PayrollScreen />
    </Guard>
  );
}
