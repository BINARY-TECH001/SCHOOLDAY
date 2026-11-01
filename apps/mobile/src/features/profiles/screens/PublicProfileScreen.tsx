import React from "react";
import { useLocalSearchParams } from "expo-router";
import { RoleProfileShell } from "../components/RoleProfileShell";

export function PublicProfileScreen() {
  const { type, id } = useLocalSearchParams<{
    type?: "student" | "staff" | "parent" | "user";
    id?: string;
  }>();

  return <RoleProfileShell targetId={id} targetType={type} />;
}
