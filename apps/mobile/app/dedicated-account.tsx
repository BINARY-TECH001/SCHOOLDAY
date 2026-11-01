import React from "react";
import { DedicatedAccountScreen } from "../src/features/wallet/DedicatedAccountScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["payments", "finance"]}>
      <DedicatedAccountScreen />
    </Guard>
  );
}
