import React from "react";
import { useLocalSearchParams } from "expo-router";
import { RoleProfileShell } from "../../src/features/profiles/components/RoleProfileShell";
import { Guard } from "../../src/components/Guard";
import { useApp } from "../../src/providers/AppProvider";

export default function Route() {
  const { context } = useApp();
  const { userId, id, type } = useLocalSearchParams<{
    userId?: string;
    id?: string;
    type?: "student" | "staff" | "parent" | "user";
  }>();

  return (
    <Guard permissions={["profile"]}>
      <RoleProfileShell
        targetUserId={userId}
        targetId={id}
        targetType={type}
        key={
          (context ? context.schoolId + context.userId + context.role : "none") +
          (userId || id || "self")
        }
      />
    </Guard>
  );
}
