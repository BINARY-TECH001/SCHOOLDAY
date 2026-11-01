import React from "react";
import { ParentDetailScreen } from "../src/features/parents/ParentDetailScreen";
import { Guard } from "../src/components/Guard";

export default function Route() {
  return (
    <Guard permissions={["directory", "students"]}>
      <ParentDetailScreen />
    </Guard>
  );
}
