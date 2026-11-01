import React from "react";
import { TransactionHistoryScreen } from "../src/features/wallet/TransactionHistoryScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["payments", "finance"]}>
      <TransactionHistoryScreen />
    </Guard>
  );
}
