import { WalletScreen } from "../../src/features/WalletScreen";
import { Guard } from "../../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["payments", "finance", "payroll"]}>
      <WalletScreen />
    </Guard>
  );
}
