import { TransactionDetailScreen } from "../src/features/TransactionDetailScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["payments"]}>
      <TransactionDetailScreen />
    </Guard>
  );
}
