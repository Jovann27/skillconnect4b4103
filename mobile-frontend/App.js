import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Platform, Alert, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MainProvider } from "./contexts/MainContext";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Import all your screens
import Login from "./screens/auth/Login";
import ForgotPassword from "./screens/auth/ForgotPassword";
import Register from "./screens/auth/Register";
import ResetPassword from "./screens/auth/ResetPassword";
import Home from "./screens/home/Home";
import Settings from "./screens/Settings";
import Profile from "./screens/profile/Profile";
import EditFirstName from "./screens/profile/EditFirstName";
import EditLastName from "./screens/profile/EditLastName";
import EditEmail from "./screens/profile/EditEmail";
import PhoneVerification from "./screens/auth/PhoneVerification";
import VerifyPhoneForPassword from "./screens/auth/VerifyPhoneForPassword";
import Notification from "./screens/Notification";
import TermsPolicies from "./screens/TermsPolicies";
import PlaceOrder from "./screens/PlaceOrder";
import WaitingForWorker from "./screens/WaitingForWorker";
import Records from "./screens/records/Records";
import Workers from "./screens/Workers";
import Clients from "./screens/Clients";
import Favourites from "./screens/Favourites";
import Blocked from "./screens/Blocked";
import Service from "./screens/Service";
import ClientAccepted from "./screens/ClientAccepted";
import Chat from "./screens/Chat";
import ProfileReviews from "./screens/ProfileReviews";
import OrderDetails from "./screens/records/OrderDetails";
import BlockedWorker from "./screens/BlockedWorker";
import CustomDrawer from "./components/CustomDrawer";
import GiveReview from "./screens/GiveReview";
import NotificationScreen from "./screens/NotificationScreen";
import RoleGuard from "./components/RoleGuard";
import AboutUs from "./screens/AboutUs";
import TermsScreen from "./screens/TermsScreen";
import PrivacyScreen from "./screens/PrivacyScreen";

const Stack = createNativeStackNavigator();

// Role constants matching web App.jsx
/**
 * RoleGuard Implementation - Matches web App.jsx pattern
 * 
 * This file uses RoleGuard directly in Stack.Screen components, matching the web App.jsx pattern.
 * 
 * Web App.jsx pattern:
 *   <Route path="my-service" element={
 *     <RoleGuard allowedRoles={["Service Provider"]}>
 *       <MyService />
 *     </RoleGuard>
 *   } />
 * 
 * Mobile App.js pattern (matching web):
 *   <Stack.Screen name="Service">
 *     {(props) => (
 *       <RoleGuard navigation={props.navigation} allowedRoles={PROVIDER_ONLY_ROLES}>
 *         <Service {...props} />
 *       </RoleGuard>
 *     )}
 *   </Stack.Screen>
 * 
 * Both use the same RoleGuard component directly as a wrapper.
 */

// Role constants matching web App.jsx RoleGuard pattern
// These define which roles can access specific features

// SERVICE_FLOW_ROLES: Roles that can access service request flows
// - PlaceOrder, Records, WaitingForWorker, OrderDetails
// - Matches web: allowedRoles={["Community Member", "Service Provider", "Service Provider Applicant"]}
const SERVICE_FLOW_ROLES = ["Community Member", "Service Provider", "Service Provider Applicant"];

// PROVIDER_ONLY_ROLES: Roles that can access provider-only features
// - Service (MyService), Clients, ClientAccepted, BlockedWorker
// - Matches web: allowedRoles={["Service Provider"]}
const PROVIDER_ONLY_ROLES = ["Service Provider"];

// Note: RoleGuard is now used directly in Stack.Screen components (matching web App.jsx pattern)
// No need for withRoleGuard HOC - using direct RoleGuard wrapper like web version

// Configure notification behavior when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState("");
  const notificationListener = useRef();
  const responseListener = useRef();

  // Register device for push notifications
  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        Alert.alert("Failed to get push token for push notifications!");
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo Push Token:", token);
      setExpoPushToken(token);
    } else {
      Alert.alert("Must use physical device for Push Notifications");
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listener fired when a notification is received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification);
    });

    // Listener fired when user interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <MainProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <CustomDrawer isLoggedIn={isLoggedIn}>
            {(toggleDrawer) => (
            <Stack.Navigator
              // Global settings for all screens
              screenOptions={{
                headerShown: true,
                headerTitleAlign: "center",
                headerTitleStyle: { fontSize: 17 },
                headerShadowVisible: false,
                headerLeft: () => (
                  <TouchableOpacity onPress={toggleDrawer} style={{ marginLeft: 10 }}>
                    <Ionicons name="reorder-three" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              }}
            >
            {/* Regular Screens */}
           <Stack.Screen
                name="Home"
                component={Home}
                options={({ navigation }) => ({
                  headerTitleAlign: "center",
                  headerTitleStyle: { fontSize: 17 },
                  headerShadowVisible: false,
                  headerLeft: () => (
                    <TouchableOpacity onPress={toggleDrawer} style={{ marginLeft: 10 }}>
                      <Ionicons name="reorder-three" size={24} color="#000" />
                    </TouchableOpacity>
                  ),
                  headerRight: () => (
                    <TouchableOpacity
                      onPress={() => navigation.navigate("NotificationScreen")}
                      style={{ marginRight: 15 }}
                    >
                      <Ionicons name="notifications-outline" size={24} color="#000" />
                    </TouchableOpacity>
                  ),
                })}
              />
            <Stack.Screen name="Login">
              {(props) => <Login {...props} setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Settings">
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation}
                  requireAuth={true}
                  allowedRoles={[]} // Settings available to all authenticated users
                >
                  <Settings {...props} setIsLoggedIn={setIsLoggedIn} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="EditFirstName"
              options={{
                presentation: "transparentModal",
                headerShown: false,
                animation: "fade",
                animationDuration: 200,
              }}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Profile">
                  <EditFirstName {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="EditLastName"
              options={{
                presentation: "transparentModal",
                headerShown: false,
                animation: "fade",
                animationDuration: 200,
              }}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Profile">
                  <EditLastName {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="VerifyPhoneForPassword"
              component={VerifyPhoneForPassword}
              options={{ headerShown: false }}
            />
            {/* Routes for Community Members and Service Providers (matches web: service-request, records, waiting-for-worker) */}
            <Stack.Screen
              name="PlaceOrder"
              options={{ headerTitle: "Place Order", headerTitleStyle: { fontSize: 17 } }}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={SERVICE_FLOW_ROLES}
                  fallbackRoute="Home"
                >
                  <PlaceOrder {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen name="Records">
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={SERVICE_FLOW_ROLES}
                  fallbackRoute="Home"
                >
                  <Records {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen name="WaitingForWorker">
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={SERVICE_FLOW_ROLES}
                  fallbackRoute="Home"
                >
                  <WaitingForWorker {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            {/* Routes for Service Providers only (matches web: my-service) */}
            <Stack.Screen
              name="Service"
              options={{ headerTitle: "My Service", headerTitleStyle: { fontSize: 17 } }}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={PROVIDER_ONLY_ROLES}
                  fallbackRoute="Home"
                >
                  <Service {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            {/* Routes available to all authenticated users (no role restriction) */}
            <Stack.Screen
              name="ProfileReviews"
              options={{ headerTitle: "Profile", headerTitleStyle: { fontSize: 17 } }}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <ProfileReviews {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Workers"
              options={{ headerTitle: "Workers", headerTitleStyle: { fontSize: 17 } }}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <Workers {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen name="Chat" options={{ headerShown: false }}>
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <Chat {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen name="NotificationScreen" options={{ headerTitle: "Notifications" }}>
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <NotificationScreen {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            {/* Modified Screens */}
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPassword}
              options={({ navigation }) => ({
                headerTitle: "",
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen
              name="Profile"
              options={({ navigation }) => ({
                headerTitle: "Personal Information",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation}
                  requireAuth={true}
                  allowedRoles={[]} // Profile available to all authenticated users
                >
                  <Profile {...props} setIsLoggedIn={setIsLoggedIn} />
                </RoleGuard>
              )}
            </Stack.Screen>

            {/* Routes for Service Providers only */}
            <Stack.Screen
              name="ClientAccepted"
              options={({ navigation }) => ({
                headerTitle: "Accepted Client",
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={PROVIDER_ONLY_ROLES}
                  fallbackRoute="Home"
                >
                  <ClientAccepted {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="EditEmail"
              options={({ navigation }) => ({
                headerTitle: "Change Email",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Profile">
                  <EditEmail {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="PhoneVerification"
              options={({ navigation }) => ({
                headerTitle: "Change your phone number",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Profile">
                  <PhoneVerification {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            {/* Routes for Service Providers only */}
            <Stack.Screen
              name="Clients"
              options={({ navigation }) => ({
                headerTitle: "Clients",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={PROVIDER_ONLY_ROLES}
                  fallbackRoute="Home"
                >
                  <Clients {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            {/* Routes for Community Members and Service Providers */}
            <Stack.Screen
              name="OrderDetails"
              options={({ navigation }) => ({
                headerTitle: "",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={SERVICE_FLOW_ROLES}
                  fallbackRoute="Records"
                >
                  <OrderDetails {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="TermsPolicies"
              component={TermsPolicies}
              options={({ navigation }) => ({
                headerTitle: "Terms & Policies",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="Terms"
              options={({ navigation }) => ({
                headerTitle: "Terms & Conditions",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="TermsPolicies">
                  <TermsScreen {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Privacy"
              options={({ navigation }) => ({
                headerTitle: "Privacy Policy",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="TermsPolicies">
                  <PrivacyScreen {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="AboutUs"
              options={({ navigation }) => ({
                headerTitle: "About SkillConnect",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <AboutUs {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Notification"
              options={({ navigation }) => ({
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <Notification {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Favourites"
              options={({ navigation }) => ({
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <Favourites {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Blocked"
              options={({ navigation }) => ({
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <Blocked {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            {/* Routes for Service Providers only */}
            <Stack.Screen
              name="BlockedWorker"
              options={({ navigation }) => ({
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => (
                <RoleGuard 
                  navigation={props.navigation} 
                  allowedRoles={PROVIDER_ONLY_ROLES}
                  fallbackRoute="Home"
                >
                  <BlockedWorker {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="GiveReview"
              options={{
                presentation: "modal",     // FULL SCREEN MODAL
                headerShown: false,
              }}
            >
              {(props) => (
                <RoleGuard navigation={props.navigation} fallbackRoute="Home">
                  <GiveReview {...props} />
                </RoleGuard>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="ResetPassword"
              component={ResetPassword}
              options={({ navigation }) => ({
                headerTitle: "Reset Password",
                headerTitleStyle: { fontSize: 17 },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 10 }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                  </TouchableOpacity>
                ),
              })}
            />

          </Stack.Navigator>
        )}
        </CustomDrawer>
      </NavigationContainer>
    </SafeAreaProvider>
  </MainProvider>
);
}
