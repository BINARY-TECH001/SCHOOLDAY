import React from "react";
import { DisburseScreen } from "../src/features/wallet/DisburseScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["finance"]}>
      <DisburseScreen />
    </Guard>
  );
}
