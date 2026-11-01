import { InvoiceDetailScreen } from "../src/features/InvoiceDetailScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["fees", "payments"]}>
      <InvoiceDetailScreen />
    </Guard>
  );
}
