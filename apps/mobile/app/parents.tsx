import React from "react";
import { ParentsScreen } from "../src/features/parents/ParentsScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["directory", "students"]}>
      <ParentsScreen />
    </Guard>
  );
}
