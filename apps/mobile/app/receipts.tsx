import { ReceiptDetailScreen } from "../src/features/ReceiptDetailScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["payments", "finance", "students", "profile", "children"]}>
      <ReceiptDetailScreen />
    </Guard>
  );
}
