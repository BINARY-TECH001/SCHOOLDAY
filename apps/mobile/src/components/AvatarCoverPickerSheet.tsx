import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";
import { ModalSheet, Button, Badge, colors, fonts, shadows } from "./ui";
import { Icon } from "./Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const PRESET_AVATARS = [
  {
    id: "av-1",
    label: "Professional Educator",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "av-2",
    label: "Senior Academic Head",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "av-3",
    label: "Science Instructor",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "av-4",
    label: "Operations & Admin",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "av-5",
    label: "Primary Coordinator",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "av-6",
    label: "Bursar & Finance",
    url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
  },
];

export const PRESET_COVERS = [
  {
    id: "cov-1",
    label: "Classic Prestige Quad",
    url: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cov-2",
    label: "Modern Science Campus",
    url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cov-3",
    label: "Lush Academic Courtyard",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cov-4",
    label: "Heritage College Hall",
    url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "cov-5",
    label: "Silicon Aurora Library",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  },
];

export interface AvatarCoverPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: "avatar" | "cover";
  currentAvatarUrl?: string;
  currentCoverUrl?: string;
  onSelectAvatar: (url: string) => void;
  onSelectCover: (url: string) => void;
  canEditCover?: boolean;
}

export function AvatarCoverPickerSheet({
  visible,
  onClose,
  initialTab = "avatar",
  currentAvatarUrl,
  currentCoverUrl,
  onSelectAvatar,
  onSelectCover,
  canEditCover = false,
}: AvatarCoverPickerSheetProps) {
  const [activeTab, setActiveTab] = useState<"avatar" | "cover">(initialTab);
  const [customUrl, setCustomUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<"preset" | "device" | "url">("preset");

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) {
      toast.error("Please enter a valid image web URL.");
      return;
    }
    if (activeTab === "avatar") {
      onSelectAvatar(customUrl.trim());
    } else {
      onSelectCover(customUrl.trim());
    }
    toast.success("Image URL updated.");
    setCustomUrl("");
    onClose();
  };

  const handleSimulateDeviceUpload = (simulatedUrl: string) => {
    if (activeTab === "avatar") {
      onSelectAvatar(simulatedUrl);
    } else {
      onSelectCover(simulatedUrl);
    }
    toast.success(`Custom ${activeTab === "avatar" ? "profile photo" : "campus cover"} uploaded!`);
    onClose();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={activeTab === "avatar" ? "Update Profile Avatar" : "Update Campus Cover"}
      subtitle={
        activeTab === "avatar"
          ? "Upload a custom photo or choose from academic portraits."
          : "Upload a high-res campus banner or select official presets."
      }
    >
      <View style={styles.container}>
        {/* Segmented Tab Switcher (Avatar vs Cover) */}
        {canEditCover && (
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => {
                setActiveTab("avatar");
                setUploadMode("preset");
              }}
              style={[styles.tabBtn, activeTab === "avatar" && styles.tabBtnActive]}
            >
              <Icon
                name="profile"
                size={15}
                color={activeTab === "avatar" ? colors.navy : colors.muted}
                filled={activeTab === "avatar"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "avatar" && styles.tabBtnTextActive,
                ]}
              >
                Profile Photo
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setActiveTab("cover");
                setUploadMode("preset");
              }}
              style={[styles.tabBtn, activeTab === "cover" && styles.tabBtnActive]}
            >
              <Icon
                name="gallery"
                size={15}
                color={activeTab === "cover" ? colors.navy : colors.muted}
                filled={activeTab === "cover"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "cover" && styles.tabBtnTextActive,
                ]}
              >
                Campus Banner
              </Text>
            </Pressable>
          </View>
        )}

        {/* Source Mode Selector (Preset vs Device Upload vs Custom URL) */}
        <View style={styles.sourceSelectorRow}>
          <Pressable
            onPress={() => setUploadMode("preset")}
            style={[styles.sourcePill, uploadMode === "preset" && styles.sourcePillActive]}
          >
            <Icon
              name="check"
              size={13}
              color={uploadMode === "preset" ? "#ffffff" : colors.muted}
              filled={uploadMode === "preset"}
            />
            <Text
              style={[
                styles.sourcePillText,
                uploadMode === "preset" && styles.sourcePillTextActive,
              ]}
            >
              Presets
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setUploadMode("device")}
            style={[styles.sourcePill, uploadMode === "device" && styles.sourcePillActive]}
          >
            <Icon
              name="camera"
              size={13}
              color={uploadMode === "device" ? "#ffffff" : colors.muted}
            />
            <Text
              style={[
                styles.sourcePillText,
                uploadMode === "device" && styles.sourcePillTextActive,
              ]}
            >
              Device Upload
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setUploadMode("url")}
            style={[styles.sourcePill, uploadMode === "url" && styles.sourcePillActive]}
          >
            <Icon
              name="document"
              size={13}
              color={uploadMode === "url" ? "#ffffff" : colors.muted}
            />
            <Text
              style={[
                styles.sourcePillText,
                uploadMode === "url" && styles.sourcePillTextActive,
              ]}
            >
              Image Link
            </Text>
          </Pressable>
        </View>

        {/* Upload Mode 1: Device Photo Library Simulation */}
        {uploadMode === "device" && (
          <View style={styles.deviceUploadBox}>
            <View style={styles.deviceUploadHeader}>
              <View style={styles.deviceUploadIconWrap}>
                <Icon name="gallery" size={24} color={colors.navy} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.deviceUploadTitle}>Select from Device Gallery</Text>
                <Text style={styles.deviceUploadSub}>
                  Upload PNG, JPEG, or HEIC files up to 10MB
                </Text>
              </View>
            </View>

            <View style={styles.galleryRollGrid}>
              {(activeTab === "avatar"
                ? [
                    {
                      id: "cam-1",
                      label: "Executive Studio Headshot",
                      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
                    },
                    {
                      id: "cam-2",
                      label: "Academic Faculty Portrait",
                      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
                    },
                    {
                      id: "cam-3",
                      label: "Campus Instructor Live",
                      url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
                    },
                  ]
                : [
                    {
                      id: "cam-cov-1",
                      label: "High-Res Quad Panorama",
                      url: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
                    },
                    {
                      id: "cam-cov-2",
                      label: "Science Laboratories Wing",
                      url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
                    },
                  ]
              ).map((pic) => (
                <Pressable
                  key={pic.id}
                  onPress={() => handleSimulateDeviceUpload(pic.url)}
                  style={styles.galleryPicCard}
                >
                  <Image source={{ uri: pic.url }} style={styles.galleryPicImg} />
                  <View style={styles.galleryPicOverlay}>
                    <Icon name="check" size={14} color="#ffffff" filled />
                    <Text style={styles.galleryPicLabel}>{pic.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Upload Mode 2: Custom Image URL */}
        {uploadMode === "url" && (
          <View style={styles.urlInputBox}>
            <Text style={styles.sectionTitle}>Direct Image URL</Text>
            <View style={styles.urlInputRow}>
              <Icon name="document" size={16} color={colors.muted} />
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/my-photo.jpg"
                placeholderTextColor={colors.muted}
                value={customUrl}
                onChangeText={setCustomUrl}
                autoCapitalize="none"
              />
            </View>

            <Button
              title="Apply Image URL"
              variant="primary"
              size="md"
              icon="check"
              disabled={!customUrl.trim()}
              onPress={handleApplyCustomUrl}
            />
          </View>
        )}

        {/* Upload Mode 3: Presets Grid */}
        {uploadMode === "preset" && (
          <>
            {activeTab === "avatar" ? (
              <View style={{ gap: 14 }}>
                <Text style={styles.sectionTitle}>Curated Academic Avatars</Text>
                <View style={styles.avatarGrid}>
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = currentAvatarUrl === av.url;
                    return (
                      <Pressable
                        key={av.id}
                        onPress={() => {
                          onSelectAvatar(av.url);
                          onClose();
                        }}
                        style={[
                          styles.avatarTile,
                          isSelected && styles.avatarTileActive,
                          shadows.sm,
                        ]}
                      >
                        <Image source={{ uri: av.url }} style={styles.avatarImg} />
                        {isSelected && (
                          <View style={styles.selectedCheckOverlay}>
                            <Icon name="check" size={14} color="#ffffff" filled />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Button
                  title="Reset to Initials Avatar"
                  variant="outline"
                  size="md"
                  onPress={() => {
                    onSelectAvatar("");
                    onClose();
                  }}
                />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Official School Covers</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 320 }}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {PRESET_COVERS.map((cov) => {
                    const isSelected = currentCoverUrl === cov.url;
                    return (
                      <Pressable
                        key={cov.id}
                        onPress={() => {
                          onSelectCover(cov.url);
                          onClose();
                        }}
                        style={[
                          styles.coverCard,
                          isSelected && styles.coverCardActive,
                        ]}
                      >
                        <Image source={{ uri: cov.url }} style={styles.coverImg} />
                        <View style={styles.coverOverlay}>
                          <Text style={styles.coverLabel}>{cov.label}</Text>
                          {isSelected && (
                            <Badge text="CURRENT BANNER" tone="warning" dot />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 6,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
    ...shadows.sm,
  },
  tabBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  tabBtnTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  sourceSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  sourcePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sourcePillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  sourcePillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  sourcePillTextActive: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
  deviceUploadBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  deviceUploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deviceUploadIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  deviceUploadTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  deviceUploadSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  galleryRollGrid: {
    gap: 8,
  },
  galleryPicCard: {
    height: 90,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  galleryPicImg: {
    width: "100%",
    height: "100%",
  },
  galleryPicOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  galleryPicLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  urlInputBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  urlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  urlInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
    padding: 0,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  avatarTile: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarTileActive: {
    borderColor: colors.orange,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  selectedCheckOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(234, 88, 12, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverCard: {
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  coverCardActive: {
    borderColor: colors.orange,
  },
  coverImg: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
});
