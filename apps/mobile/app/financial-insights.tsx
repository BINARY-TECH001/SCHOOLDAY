import React from "react";
import { FinancialInsightsScreen } from "../src/features/wallet/FinancialInsightsScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["finance"]}>
      <FinancialInsightsScreen />
    </Guard>
  );
}
