import { SchoolWalletScreen } from "../src/features/SchoolWalletScreen";
import { Guard } from "../src/components/Guard";
import { useApp } from "../src/providers/AppProvider";
export default function Route() {
  const { context } = useApp();
  return (
    <Guard permissions={["finance"]}>
      <SchoolWalletScreen
        key={
          context ? context.schoolId + context.userId + context.role : "none"
        }
      />
    </Guard>
  );
}
