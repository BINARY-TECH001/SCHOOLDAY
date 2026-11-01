import React from "react";
import { SettlementSettingsScreen } from "../src/features/wallet/SettlementSettingsScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["settings", "finance"]}>
      <SettlementSettingsScreen />
    </Guard>
  );
}
