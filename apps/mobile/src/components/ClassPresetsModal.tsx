import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, shadows, Button, Badge } from "./ui";
import { Icon } from "./Icon";
import { useSchool } from "../providers/AppProvider";

export interface PresetClassItem {
  id: string;
  name: string;
  category: "early" | "primary" | "junior" | "senior";
  defaultArm: string;
  defaultCapacity: number;
  defaultTermFeeNaira: number;
}

const ALL_PRESETS: PresetClassItem[] = [
  // Early Years
  {
    id: "creche",
    name: "Creche",
    category: "early",
    defaultArm: "Bloom",
    defaultCapacity: 15,
    defaultTermFeeNaira: 100000,
  },
  {
    id: "playgroup",
    name: "Playgroup",
    category: "early",
    defaultArm: "Sunbeam",
    defaultCapacity: 20,
    defaultTermFeeNaira: 100000,
  },
  {
    id: "nursery-1",
    name: "Nursery 1",
    category: "early",
    defaultArm: "Emerald",
    defaultCapacity: 25,
    defaultTermFeeNaira: 110000,
  },
  {
    id: "nursery-2",
    name: "Nursery 2",
    category: "early",
    defaultArm: "Topaz",
    defaultCapacity: 25,
    defaultTermFeeNaira: 110000,
  },
  {
    id: "kg",
    name: "Kindergarten / Reception",
    category: "early",
    defaultArm: "Diamond",
    defaultCapacity: 25,
    defaultTermFeeNaira: 120000,
  },

  // Primary (1 to 6)
  {
    id: "pri-1",
    name: "Primary 1",
    category: "primary",
    defaultArm: "Gold",
    defaultCapacity: 30,
    defaultTermFeeNaira: 125000,
  },
  {
    id: "pri-2",
    name: "Primary 2",
    category: "primary",
    defaultArm: "Gold",
    defaultCapacity: 30,
    defaultTermFeeNaira: 125000,
  },
  {
    id: "pri-3",
    name: "Primary 3",
    category: "primary",
    defaultArm: "Gold",
    defaultCapacity: 30,
    defaultTermFeeNaira: 130000,
  },
  {
    id: "pri-4",
    name: "Primary 4",
    category: "primary",
    defaultArm: "Gold",
    defaultCapacity: 30,
    defaultTermFeeNaira: 130000,
  },
  {
    id: "pri-5",
    name: "Primary 5",
    category: "primary",
    defaultArm: "Gold",
    defaultCapacity: 30,
    defaultTermFeeNaira: 135000,
  },
  {
    id: "pri-6",
    name: "Primary 6",
    category: "primary",
    defaultArm: "Gold",
    defaultCapacity: 30,
    defaultTermFeeNaira: 140000,
  },

  // Junior Secondary (JSS 1 to 3)
  {
    id: "jss-1",
    name: "JSS 1",
    category: "junior",
    defaultArm: "Alpha",
    defaultCapacity: 35,
    defaultTermFeeNaira: 150000,
  },
  {
    id: "jss-2",
    name: "JSS 2",
    category: "junior",
    defaultArm: "Alpha",
    defaultCapacity: 35,
    defaultTermFeeNaira: 150000,
  },
  {
    id: "jss-3",
    name: "JSS 3",
    category: "junior",
    defaultArm: "Alpha",
    defaultCapacity: 35,
    defaultTermFeeNaira: 160000,
  },

  // Senior Secondary (SSS 1 to 3)
  {
    id: "sss-1",
    name: "SSS 1",
    category: "senior",
    defaultArm: "Science",
    defaultCapacity: 35,
    defaultTermFeeNaira: 165000,
  },
  {
    id: "sss-2",
    name: "SSS 2",
    category: "senior",
    defaultArm: "Science",
    defaultCapacity: 35,
    defaultTermFeeNaira: 165000,
  },
  {
    id: "sss-3",
    name: "SSS 3",
    category: "senior",
    defaultArm: "Science",
    defaultCapacity: 35,
    defaultTermFeeNaira: 180000,
  },
];

interface ClassConfig {
  selected: boolean;
  arm: string;
  capacity: string;
  termFeeNaira: string;
}

interface ClassPresetsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClassPresetsModal({
  visible,
  onClose,
  onSuccess,
}: ClassPresetsModalProps) {
  const { data, context, services, act, busy } = useSchool();
  const [activeTab, setActiveTab] = useState<"all" | "early" | "primary" | "junior" | "senior">("primary");

  // Track state for all presets
  const [configs, setConfigs] = useState<Record<string, ClassConfig>>(() => {
    const map: Record<string, ClassConfig> = {};
    for (const p of ALL_PRESETS) {
      // By default pre-select Primary 1 to 6 if classes list is currently empty
      const isDefaultChecked = p.category === "primary";
      map[p.id] = {
        selected: isDefaultChecked,
        arm: p.defaultArm,
        capacity: String(p.defaultCapacity),
        termFeeNaira: String(p.defaultTermFeeNaira),
      };
    }
    return map;
  });

  const filteredPresets = ALL_PRESETS.filter((p) => {
    if (activeTab === "all") return true;
    return p.category === activeTab;
  });

  const toggleSelect = (id: string) => {
    setConfigs((prev) => {
      const current = prev[id] || {
        selected: false,
        arm: "",
        capacity: "30",
        termFeeNaira: "120000",
      };
      return {
        ...prev,
        [id]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  const updateArm = (id: string, arm: string) => {
    setConfigs((prev) => {
      const current = prev[id] || {
        selected: false,
        arm: "",
        capacity: "30",
        termFeeNaira: "120000",
      };
      return {
        ...prev,
        [id]: { ...current, arm },
      };
    });
  };

  const updateCapacity = (id: string, capacity: string) => {
    setConfigs((prev) => {
      const current = prev[id] || {
        selected: false,
        arm: "",
        capacity: "30",
        termFeeNaira: "120000",
      };
      return {
        ...prev,
        [id]: { ...current, capacity },
      };
    });
  };

  const updateFee = (id: string, termFeeNaira: string) => {
    setConfigs((prev) => {
      const current = prev[id] || {
        selected: false,
        arm: "",
        capacity: "30",
        termFeeNaira: "120000",
      };
      return {
        ...prev,
        [id]: { ...current, termFeeNaira },
      };
    });
  };

  const selectAllCurrentTab = () => {
    setConfigs((prev) => {
      const next = { ...prev };
      for (const p of filteredPresets) {
        const item = next[p.id];
        if (item) {
          next[p.id] = { ...item, selected: true };
        }
      }
      return next;
    });
  };

  const deselectAllCurrentTab = () => {
    setConfigs((prev) => {
      const next = { ...prev };
      for (const p of filteredPresets) {
        const item = next[p.id];
        if (item) {
          next[p.id] = { ...item, selected: false };
        }
      }
      return next;
    });
  };

  const selectedCount = Object.values(configs).filter((c) => c.selected).length;

  const handleBatchCreate = async () => {
    const toCreate = ALL_PRESETS.filter((p) => configs[p.id]?.selected).map((p) => {
      const cfg = configs[p.id] || {
        selected: true,
        arm: p.defaultArm,
        capacity: String(p.defaultCapacity),
        termFeeNaira: String(p.defaultTermFeeNaira),
      };
      const armSuffix = cfg.arm.trim() ? ` ${cfg.arm.trim()}` : "";
      const fullName = `${p.name}${armSuffix}`;
      const feeKobo = Math.round((Number(cfg.termFeeNaira) || p.defaultTermFeeNaira) * 100);
      const cap = Number(cfg.capacity) || p.defaultCapacity;
      return {
        name: fullName,
        termFee: feeKobo,
        capacity: cap,
      };
    });

    if (toCreate.length === 0) {
      toast.error("Please select at least one class to create.");
      return;
    }

    await act(
      () => services.createClassesBatch(context, toCreate),
      `Successfully created ${toCreate.length} academic classrooms!`,
    );

    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        {/* Top Header */}
        <View style={styles.headerBar}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.headerTitle}>Add Classes & Presets</Text>
            <Text style={styles.headerSubtitle}>
              Select institutional grade levels and adjust student capacities
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close class presets"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Icon name="close" size={18} color={colors.navy} />
          </Pressable>
        </View>

        {/* Category Tabs */}
        <View style={styles.tabsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {[
              { id: "primary", label: "Primary (1–6)" },
              { id: "early", label: "Early Years (Creche–Nursery)" },
              { id: "junior", label: "Junior Secondary (JSS)" },
              { id: "senior", label: "Senior Secondary (SSS)" },
              { id: "all", label: "All Presets" },
            ].map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[
                  styles.tabChip,
                  activeTab === tab.id && styles.tabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    activeTab === tab.id && styles.tabChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Quick Batch Select Row */}
        <View style={styles.quickSelectBar}>
          <Text style={styles.quickSelectInfo}>
            {selectedCount} class{selectedCount !== 1 ? "es" : ""} selected
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={selectAllCurrentTab}>
              <Text style={styles.quickActionLink}>Select All in Tab</Text>
            </Pressable>
            <Text style={{ color: colors.border }}>|</Text>
            <Pressable onPress={deselectAllCurrentTab}>
              <Text style={styles.quickActionLink}>Clear Tab</Text>
            </Pressable>
          </View>
        </View>

        {/* Class Items List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {filteredPresets.map((preset) => {
            const cfg = configs[preset.id] || {
              selected: false,
              arm: preset.defaultArm,
              capacity: String(preset.defaultCapacity),
              termFeeNaira: String(preset.defaultTermFeeNaira),
            };

            const alreadyExists = data.classes.some((c) =>
              c.name.toLowerCase().startsWith(preset.name.toLowerCase()),
            );

            return (
              <View
                key={preset.id}
                style={[
                  styles.presetCard,
                  cfg.selected && styles.presetCardSelected,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Pressable
                    onPress={() => toggleSelect(preset.id)}
                    style={styles.checkboxRow}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        cfg.selected && styles.checkboxActive,
                      ]}
                    >
                      {cfg.selected && (
                        <Icon name="check" size={13} color="#ffffff" filled />
                      )}
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.className}>{preset.name}</Text>
                      {alreadyExists && (
                        <Badge text="Already in school" tone="neutral" />
                      )}
                    </View>
                  </Pressable>
                </View>

                {cfg.selected && (
                  <View style={styles.configInputsRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.inputMiniLabel}>ARM / STREAM</Text>
                      <TextInput
                        value={cfg.arm}
                        onChangeText={(txt) => updateArm(preset.id, txt)}
                        placeholder="e.g. Gold"
                        placeholderTextColor={colors.muted}
                        style={styles.miniInput}
                      />
                    </View>

                    <View style={{ width: 100, gap: 4 }}>
                      <Text style={styles.inputMiniLabel}>CAPACITY (PUPILS)</Text>
                      <TextInput
                        value={cfg.capacity}
                        onChangeText={(txt) => updateCapacity(preset.id, txt)}
                        keyboardType="number-pad"
                        placeholder="30"
                        placeholderTextColor={colors.muted}
                        style={styles.miniInput}
                      />
                    </View>

                    <View style={{ width: 120, gap: 4 }}>
                      <Text style={styles.inputMiniLabel}>TERM FEE (₦)</Text>
                      <TextInput
                        value={cfg.termFeeNaira}
                        onChangeText={(txt) => updateFee(preset.id, txt)}
                        keyboardType="number-pad"
                        placeholder="120000"
                        placeholderTextColor={colors.muted}
                        style={styles.miniInput}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Fixed Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <Button
            title={
              selectedCount > 0
                ? `Create ${selectedCount} Classrooms`
                : "Select Classes to Create"
            }
            variant="primary"
            size="lg"
            icon="school"
            loading={busy}
            disabled={busy || selectedCount === 0}
            onPress={handleBatchCreate}
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitle: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  tabsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  tabChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  quickSelectBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  quickSelectInfo: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  quickActionLink: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  presetCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 14,
    gap: 12,
  },
  presetCardSelected: {
    borderColor: colors.navy,
    backgroundColor: "#ffffff",
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  className: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  configInputsRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  inputMiniLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  miniInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
});
