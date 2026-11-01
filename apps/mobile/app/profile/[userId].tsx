import React from "react";
import { useLocalSearchParams } from "expo-router";
import { RoleProfileShell } from "../../src/features/profiles/components/RoleProfileShell";
import { Guard } from "../../src/components/Guard";
import { useApp } from "../../src/providers/AppProvider";

export default function Route() {
  const { context } = useApp();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <Guard permissions={["profile", "directory", "students"]}>
      <RoleProfileShell
        targetUserId={userId}
        key={
          (context ? context.schoolId + context.userId + context.role : "none") +
          (userId || "unknown")
        }
      />
    </Guard>
  );
}
