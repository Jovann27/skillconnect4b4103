import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Animated,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import apiClient from "../api";
import { socket } from "../utils/socket";

const { width } = Dimensions.get("window");

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AnimatedWaiting = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View style={styles.pulseCircle}>
        <Ionicons name="location-outline" size={50} color="#C20884" />
      </View>
    </Animated.View>
  );
};

const FloatingAlert = ({ visible, onClose, message = "Order Accepted! Your worker is on the way." }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 500,
          useNativeDriver: true,
        }).start(() => onClose());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.alertContainer, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
      <Text style={styles.alertText}>{message}</Text>
    </Animated.View>
  );
};

const DetailsCard = ({ title, data }) => {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.detailRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "600" }}>{item.label}: </Text>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const WorkerSection = ({ status, worker, onChat, onCall }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "Available" || status === "Matched") {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [status]);

  if (status === "Matched") {
    return (
      <Animated.View style={[styles.workerCard, { opacity: fadeAnim }]}>
        <View style={styles.workerTopRow}>
          <Image
            source={worker?.image ? { uri: worker.image } : require("../assets/default-profile.png")}
            style={styles.workerImage}
          />
          <View style={styles.workerDetails}>
            <Text style={styles.workerName}>{worker?.name || "Juan Dela Cruz"}</Text>
            <Text style={styles.workerSkill}>{worker?.skill || "Plumber"}</Text>
            <Text style={styles.workerPhone}>{worker?.phone || "09123456789"}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#E8F5E9" }]} onPress={onCall}>
              <Ionicons name="call-outline" size={20} color="#2E7D32" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#FCE4EC" }]} onPress={onChat}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#C2185B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.workerFooter}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.workerFooterText}>Service provider is reviewing your request...</Text>
        </View>
      </Animated.View>
    );
  }

  if (status !== "Available") {
    return (
      <View style={styles.waitingContainer}>
        <AnimatedWaiting />
        <Text style={styles.waitingMain}>Searching for nearby workers...</Text>
        <Text style={styles.waitingSub}>Sit tight while we find the best worker for you.</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.workerCard, { opacity: fadeAnim }]}>
      <View style={styles.workerTopRow}>
        <Image
          source={worker?.image ? { uri: worker.image } : require("../assets/default-profile.png")}
          style={styles.workerImage}
        />
        <View style={styles.workerDetails}>
          <Text style={styles.workerName}>{worker?.name || "Juan Dela Cruz"}</Text>
          <Text style={styles.workerSkill}>{worker?.skill || "Plumber"}</Text>
          <Text style={styles.workerPhone}>{worker?.phone || "09123456789"}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#E8F5E9" }]} onPress={onCall}>
            <Ionicons name="call-outline" size={20} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#FCE4EC" }]} onPress={onChat}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#C2185B" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.workerFooter}>
        <Ionicons name="navigate-outline" size={18} color="#666" />
        <Text style={styles.workerFooterText}>
          Worker is reviewing your request...
          {worker?.eta && (
            <Text style={{ fontWeight: "600" }}>
              {"\n"}ETA: {new Date(worker.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
};

const registerForPushNotificationsAsync = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push token for notifications!");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }
};

export default function WaitingForWorker({ route, navigation }) {
  const { orderData } = route.params || {};
  const [orderStatus, setOrderStatus] = useState("PENDING");
  const [workerData, setWorkerData] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showAcceptedAlert, setShowAcceptedAlert] = useState(false);
  const [showMatchedAlert, setShowMatchedAlert] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (orderStatus === "Available") {
      setShowAcceptedAlert(true);
    }
  }, [orderStatus]);

  useEffect(() => {
    // Join service request room
    if (orderData?.id) {
      socket.emit("join-service-request", orderData.id);
    }

    // Listen for service request updates
    const handleServiceRequestUpdate = async (data) => {
      if (data.requestId === orderData?.id) {
        try {
          const response = await apiClient.get(`/user/service-request/${orderData.id}`);
          const currentRequest = response.data.request;
          console.log("Fetched request data:", currentRequest);
          setCurrentRequest(currentRequest);

          if (data.action === "accepted") {
            setOrderStatus("Available");
            setWorkerData({
              name: currentRequest.serviceProvider ? `${currentRequest.serviceProvider.firstName} ${currentRequest.serviceProvider.lastName}` : "Worker",
              skill: currentRequest.typeOfWork || "Service",
              phone: currentRequest.serviceProvider?.phone || "09123456789",
              image: currentRequest.serviceProvider?.profilePic || "",
              eta: currentRequest.eta,
            });
            setShowAlert(true);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Order Accepted!",
                body: "Your worker is on the way!",
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });
          } else if (data.action === "cancelled") {
            Alert.alert("Request Cancelled", "Your service request has been cancelled.");
            navigation.navigate("PlaceOrder");
          }
        } catch (error) {
          console.log("Error fetching updated request:", error);
        }
      }
    };

    socket.on("service-request-updated", handleServiceRequestUpdate);

    return () => {
      socket.off("service-request-updated", handleServiceRequestUpdate);
    };
  }, [orderData]);

  // Initial load
  useEffect(() => {
    const loadInitialRequest = async () => {
      if (orderData?.id) {
        try {
          const response = await apiClient.get(`/user/service-request/${orderData.id}`);
          const currentRequest = response.data.request;
          setCurrentRequest(currentRequest);

          if (currentRequest.status === "Working") {
            setOrderStatus("Available");
            setWorkerData({
              name: currentRequest.serviceProvider ? `${currentRequest.serviceProvider.firstName} ${currentRequest.serviceProvider.lastName}` : "Worker",
              skill: currentRequest.typeOfWork || "Service",
              phone: currentRequest.serviceProvider?.phone || "09123456789",
              image: currentRequest.serviceProvider?.profilePic || "",
              eta: currentRequest.eta,
            });
          }
        } catch (error) {
          console.log("Error loading initial request:", error);
        }
      }
    };
    loadInitialRequest();
  }, [orderData]);

  const handleCancel = async () => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/user/service-request/${orderData?.id}/cancel`);
            navigation.navigate("PlaceOrder");
          } catch (error) {
            console.log("Error cancelling request:", error);
            Alert.alert("Error", "Failed to cancel request. Please try again.");
          }
        }
      },
    ]);
  };

  const customerDetails = [
    { label: "Name", value: currentRequest?.name || "N/A" },
    { label: "Address", value: currentRequest?.address || "N/A" },
    { label: "Phone", value: currentRequest?.phone || "N/A" },
  ];

  const orderDetails = [
    { label: "Service Type", value: currentRequest?.typeOfWork || "N/A" },
    { label: "Priority", value: currentRequest?.targetProvider ? "Favorite Worker" : "Any Available" },
    { label: "Budget", value: `₱${currentRequest?.budget || "N/A"}` },
    { label: "Date", value: currentRequest?.createdAt ? new Date(currentRequest.createdAt).toLocaleDateString() : "N/A" },
    { label: "Note", value: currentRequest?.notes || "None" },
  ];

  const matchedServices = currentRequest?.matchedProviders?.map(provider => ({
    label: provider.serviceType || "Service",
    value: `₱${provider.rate || "N/A"}`,
  })) || [];

  return (
    <View style={styles.container}>
      <FloatingAlert visible={showAlert} onClose={() => setShowAlert(false)} />
      <FloatingAlert visible={showAcceptedAlert} onClose={() => setShowAcceptedAlert(false)} message="Worker has been assigned! Get ready for service." />
      <FloatingAlert visible={showMatchedAlert} onClose={() => setShowMatchedAlert(false)} message="Service provider is reviewing your request." />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <WorkerSection
          status={orderStatus}
          worker={workerData}
          onChat={() => navigation.navigate("Chat", { role: "client", other: workerData })}
          onCall={() => Linking.openURL(`tel:${workerData?.phone}`)}
        />
        <DetailsCard title="Customer Details" data={customerDetails} />
        <DetailsCard title="Order Details" data={orderDetails} />

        {/* Give Review Button */}
        {orderStatus === "Available" && (
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => navigation.navigate("GiveReview", { order: orderData })}
            >
              <Text style={styles.reviewText}>Give Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>


      {/* Footer Cancel Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: 20, paddingTop: 20 },
  pulseCircle: {
    backgroundColor: "#FCE4EC",
    borderRadius: 50,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C20884",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  alertContainer: {
    position: "absolute",
    top: 20,
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: "#E8FDEB",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  alertText: { marginLeft: 10, color: "#2E7D32", fontWeight: "600", fontSize: 14 },
  waitingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 30,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
  },
  waitingMain: { fontSize: 16, fontWeight: "700", marginTop: 15, color: "#333" },
  waitingSub: { fontSize: 13, color: "#777", marginTop: 4 },
  workerCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  workerTopRow: { flexDirection: "row", alignItems: "center" },
  workerImage: { width: 70, height: 70, borderRadius: 35, marginRight: 12, backgroundColor: "#EEE" },
  workerDetails: { flex: 1 },
  workerName: { fontSize: 18, fontWeight: "700", color: "#111" },
  workerSkill: { fontSize: 14, color: "#555", marginTop: 3 },
  workerPhone: { fontSize: 13, color: "#777", marginTop: 2 },
  buttonContainer: { flexDirection: "row", alignItems: "center" },
  iconButton: { borderRadius: 12, padding: 10, marginLeft: 8 },
  workerFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 10 },
  workerFooterText: { marginLeft: 8, color: "#555", fontSize: 13 },
  infoCard: { backgroundColor: "#fff", borderRadius: 15, padding: 18, paddingVertical: 20, marginBottom: 15, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#333" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoText: { fontSize: 14, color: "#444", flexShrink: 1 },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
  },
  reviewButton: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#db5191ff",
  borderRadius: 12,
  paddingVertical: 16,
  elevation: 2,
},
reviewText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
  marginLeft: 8,
},
  cancelButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#db5191ff", borderRadius: 12, paddingVertical: 18 },
  cancelText: { color: "#ffffffff", fontWeight: "700", fontSize: 15, marginLeft: 6 },
});
