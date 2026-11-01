import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Button, ModalSheet } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Role, Staff } from "../../../domain/model";

export interface ManageRolePermissionsSheetProps {
  visible: boolean;
  onClose: () => void;
  staff: Staff;
  onSaveRoleAndPermissions: (patch: {
    role: Role;
    title: string;
    rank?: string;
    status: "active" | "invited" | "suspended";
    permissions: string[];
  }) => Promise<void>;
}

const AVAILABLE_PERMISSIONS = [
  { key: "attendance", label: "Attendance & Gate Biometrics", desc: "Manage staff check-ins and student roll call" },
  { key: "clock_others", label: "Clock In/Out Colleague Staff", desc: "Scan colleague QR badges to clock them in or out" },
  { key: "disburse", label: "Treasury Disbursement", desc: "Authorize and execute wallet payouts and disbursements" },
  { key: "leave", label: "Leave Requests & Approvals", desc: "Approve or reject staff time-off applications" },
  { key: "lessons", label: "Curriculum & Lesson Notes", desc: "Author, review and verify classroom syllabus" },
  { key: "fees", label: "Tuition Invoices & Payment Verification", desc: "View bursary ledger and verify fee vouchers" },
  { key: "payroll", label: "Staff Compensation & Payroll", desc: "Access compensation settings and disbursement" },
  { key: "directory", label: "Faculty Directory Management", desc: "Invite, allocate, and manage staff accounts" },
];

export function ManageRolePermissionsSheet({
  visible,
  onClose,
  staff,
  onSaveRoleAndPermissions,
}: ManageRolePermissionsSheetProps) {
  const [role, setRole] = useState<Role>((staff.role as Role) || "teacher");
  const [title, setTitle] = useState(staff.title || "");
  const [rank, setRank] = useState(staff.rank || "Senior Educator · Level 4");
  const [status, setStatus] = useState<"active" | "invited" | "suspended">(
    (staff.status as any) || "active"
  );
  const [permissions, setPermissions] = useState<string[]>(staff.permissions || []);
  const [saving, setSaving] = useState(false);

  const togglePermission = (permKey: string) => {
    setPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveRoleAndPermissions({
        role,
        title: title.trim() || staff.title,
        rank: rank.trim() || undefined,
        status,
        permissions,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Role, Rank & System Permissions"
      subtitle={`Configure operational credentials for ${staff.name}`}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Role Selector */}
        <View style={styles.field}>
          <Text style={styles.label}>Operational Role</Text>
          <View style={styles.roleGrid}>
            {(["teacher", "admin", "finance", "hr", "staff"] as Role[]).map((r) => (
              <Pressable
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                  {r.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Official Job Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Senior Class Educator & Head of Sciences"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Seniority Rank */}
        <View style={styles.field}>
          <Text style={styles.label}>Academic Seniority Rank</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Master Educator · Grade Level 5"
            placeholderTextColor={colors.muted}
            value={rank}
            onChangeText={setRank}
          />
        </View>

        {/* Credential Status */}
        <View style={styles.field}>
          <Text style={styles.label}>Employment Credential Status</Text>
          <View style={styles.statusRow}>
            {(["active", "suspended"] as const).map((s) => (
              <Pressable
                key={s}
                style={[
                  styles.statusBtn,
                  status === s && styles.statusBtnActive,
                  status === s && s === "suspended" && styles.statusBtnDanger,
                ]}
                onPress={() => setStatus(s)}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    status === s && styles.statusBtnTextActive,
                  ]}
                >
                  {s.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Permissions Checklist */}
        <View style={styles.field}>
          <Text style={styles.label}>System Access Permissions</Text>
          <View style={styles.permList}>
            {AVAILABLE_PERMISSIONS.map((perm) => {
              const hasPerm = permissions.includes(perm.key);
              return (
                <Pressable
                  key={perm.key}
                  style={[styles.permItem, hasPerm && styles.permItemActive]}
                  onPress={() => togglePermission(perm.key)}
                >
                  <View style={[styles.checkbox, hasPerm && styles.checkboxActive]}>
                    {hasPerm && <Icon name="check" size={12} color="#ffffff" />}
                  </View>
                  <View style={styles.permTextCol}>
                    <Text style={styles.permLabel}>{perm.label}</Text>
                    <Text style={styles.permDesc}>{perm.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          title={saving ? "Saving Changes…" : "Update Credentials & Access"}
          variant="primary"
          size="lg"
          loading={saving}
          onPress={handleSave}
        />
        <View style={{ height: 20 }} />
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    maxHeight: 520,
    paddingTop: 4,
  },
  field: {
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  roleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  roleBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate700,
  },
  roleBtnTextActive: {
    color: "#ffffff",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBtnActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  statusBtnDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  statusBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate700,
  },
  statusBtnTextActive: {
    color: "#ffffff",
  },
  permList: {
    gap: 6,
  },
  permItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  permItemActive: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  permTextCol: {
    flex: 1,
    gap: 1,
  },
  permLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  permDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
