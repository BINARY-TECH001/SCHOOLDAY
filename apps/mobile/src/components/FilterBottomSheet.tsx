import React from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { ModalSheet, Badge } from "./ui";
import { colors, fonts } from "../theme/tokens";
import { Icon } from "./Icon";

export interface FilterOption {
  key: string;
  label: string;
  badge?: string;
}

export interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

export interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  groups: FilterGroup[];
  selectedFilters: Record<string, string | string[]>;
  onSelectFilter: (groupId: string, value: string) => void;
  onReset: () => void;
  onApply?: () => void;
}

export function FilterBottomSheet({
  visible,
  onClose,
  title = "Filter",
  groups,
  selectedFilters,
  onSelectFilter,
  onReset,
  onApply,
}: FilterBottomSheetProps) {
  const handleSelect = (groupId: string, optionKey: string) => {
    onSelectFilter(groupId, optionKey);
    // Instant apply if single group
    if (groups.length === 1 && !groups[0]?.multiSelect) {
      if (onApply) onApply();
      onClose();
    }
  };

  const handleApply = () => {
    if (onApply) onApply();
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetSubtitle}>Choose an option to filter records</Text>
        <Pressable onPress={onReset} hitSlop={8}>
          <Text style={styles.resetText}>Reset All</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {groups.map((group) => {
          const currentVal = selectedFilters[group.id];

          return (
            <View key={group.id} style={styles.groupContainer}>
              {groups.length > 1 && (
                <Text style={styles.groupTitle}>{group.title}</Text>
              )}
              <View style={styles.optionsList}>
                {group.options.map((option) => {
                  const isSelected = Array.isArray(currentVal)
                    ? currentVal.includes(option.key)
                    : currentVal === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => handleSelect(group.id, option.key)}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowActive,
                      ]}
                    >
                      <View style={styles.optionLeft}>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleActive,
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>

                      {option.badge && (
                        <Badge
                          text={option.badge}
                          tone={isSelected ? "purple" : "neutral"}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* If multi-group, show a sleek Apply button */}
        {groups.length > 1 && (
          <Pressable onPress={handleApply} style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply Selected Filters</Text>
          </Pressable>
        )}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginTop: -4,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  resetText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  container: {
    gap: 14,
    paddingBottom: 10,
  },
  groupContainer: {
    gap: 8,
  },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
    textTransform: "uppercase",
  },
  optionsList: {
    gap: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionRowActive: {
    backgroundColor: "#ffffff",
    borderColor: colors.indigo,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: colors.indigo,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.indigo,
  },
  optionLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  optionLabelActive: {
    fontFamily: fonts.bold,
    color: colors.indigo,
  },
  applyBtn: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  applyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#ffffff",
  },
});
