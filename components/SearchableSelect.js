import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#5E72E4",
  white: "#FFFFFF",
  gray: "#8898AA",
  text: "#32325D",
  background: "#F4F5F7",
  border: "#E5E5E5",
};

const SearchableSelect = ({
  data,
  selected,
  onSelect,
  placeholder,
  labelField,
  iconName,
  title,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filteredData = data.filter((item) => {
    const label = item[labelField] || item.email?.split("@")[0] || "";
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const getLabel = (item) => {
    if (!item) return placeholder;
    if (labelField === "first_name") {
      return item.first_name
        ? `${item.first_name} ${item.last_name || ""}`.trim()
        : item.email?.split("@")[0] || "N/A";
    }
    return item[labelField] || "N/A";
  };

  const renderItem = ({ item }) => {
    const isSelected = selected?.id === item.id;
    const isBusy = item.is_busy;

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          isSelected && styles.listItemSelected,
          isBusy && styles.listItemBusy,
        ]}
        onPress={() => {
          onSelect(item);
          setModalVisible(false);
          setSearch("");
        }}
      >
        <View style={styles.listItemContent}>
          <Ionicons
            name={iconName}
            size={20}
            color={
              isSelected ? COLORS.white : isBusy ? "#FB6340" : COLORS.primary
            }
          />
          <Text
            style={[
              styles.listItemText,
              isSelected && styles.listItemTextSelected,
              isBusy && styles.listItemTextBusy,
            ]}
          >
            {getLabel(item)}
          </Text>
        </View>
        <View style={styles.listItemRight}>
          {isBusy && (
            <View style={styles.busyBadge}>
              <Text style={styles.busyText}>Meşgul</Text>
            </View>
          )}
          {isSelected && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        style={[styles.selectorButton, selected && styles.selectorButtonActive]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name={iconName}
          size={20}
          color={selected ? COLORS.primary : COLORS.gray}
        />
        <Text
          style={[styles.selectorText, selected && styles.selectorTextActive]}
        >
          {getLabel(selected)}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Ara..."
                placeholderTextColor={COLORS.gray}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filteredData}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E5E5",
    gap: 10,
  },
  selectorButtonActive: {
    borderColor: COLORS.primary,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray,
  },
  selectorTextActive: {
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#E5E5E5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    margin: 16,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  list: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  listItemSelected: {
    backgroundColor: COLORS.primary,
  },
  listItemBusy: {
    backgroundColor: "#FFF8F0",
    borderWidth: 1,
    borderColor: "#FB6340",
  },
  listItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  listItemTextSelected: {
    color: COLORS.white,
    fontWeight: "600",
  },
  listItemTextBusy: {
    color: "#FB6340",
  },
  listItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  busyBadge: {
    backgroundColor: "#FB6340",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  busyText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.gray,
    padding: 20,
  },
});

export default SearchableSelect;
