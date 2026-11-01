import React from "react";
import { DefaultersScreen } from "../src/features/wallet/DefaultersScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["finance"]}>
      <DefaultersScreen />
    </Guard>
  );
}
