import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Home({ navigation }) {
  // Navigation handlers for the new buttons
  const handleFindServices = () => {
    // Example navigation
    // navigation.navigate('FindServices');
    console.log("Navigate to Find Services");
  };

  const handlePostSkills = () => {
    // Example navigation
    // navigation.navigate('PostSkills');
    console.log("Navigate to Post Skills");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Welcome Section */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome to</Text>
        <Text style={styles.title}>
          SkillConnect<Text style={styles.titleHighlight}>4B410</Text>
        </Text>
        <Text style={styles.subtitle}>BARANGAY 410 ZONE 42</Text>
        <Text style={styles.paragraph}>
          Connecting skilled workers with opportunities in Barangay 410 Zone 42.
          Find local services, post your skills, and build a stronger community together.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleFindServices}
          >
            <Ionicons name="search-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Find Services</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePostSkills}
          >
            <Ionicons name="add-circle-outline" size={18} color="#D32F2F" />
            <Text style={styles.secondaryButtonText}>Post Your Skills</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#444" />
            <Text style={styles.featureText}>Trusted Professionals</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="people-outline" size={16} color="#444" />
            <Text style={styles.featureText}>Local Community</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="search-circle-outline" size={16} color="#444" />
            <Text style={styles.featureText}>Easy to Find Services</Text>
          </View>
        </View>
      </View>

      {/* Mission & Vision */}
      <View style={styles.mvContainer}>
        <View style={[styles.mvBox, styles.missionBox]}>
          <Text style={[styles.mvTitle, styles.missionTitle]}>MISSION</Text>
          <Text style={styles.mvText}>
            To empower residents by providing access to local jobs, skills, and
            opportunities.
          </Text>
        </View>
        <View style={[styles.mvBox, styles.visionBox]}>
          <Text style={[styles.mvTitle, styles.visionTitle]}>VISION</Text>
          <Text style={styles.mvText}>
            To build a connected community where skills and services are easily
            accessible to everyone.
          </Text>
        </View>
      </View>

      {/* How It Works Section */}
      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>How SkillConnect4B410 Works</Text>
        <View style={styles.howUnderline} />

        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <Ionicons
              name="person-add-outline"
              size={32}
              color="#ce4da3"
              style={styles.stepIcon}
            />
            <Text style={styles.stepTitle}>Create Account</Text>
            <Text style={styles.stepDesc}>
              Sign up easily and start exploring local jobs or post your own services within your barangay.
            </Text>
          </View>

          <View style={styles.stepCard}>
            <Ionicons
              name="search-outline"
              size={32}
              color="#ce4da3"
              style={styles.stepIcon}
            />
            <Text style={styles.stepTitle}>Find or Post a Job</Text>
            <Text style={styles.stepDesc}>
              Browse through available opportunities or post job listings for others to see.
            </Text>
          </View>

          <View style={styles.stepCard}>
            <Ionicons
              name="send-outline"
              size={32}
              color="#ce4da3"
              style={styles.stepIcon}
            />
            <Text style={styles.stepTitle}>Apply or Recruit</Text>
            <Text style={styles.stepDesc}>
              Apply for jobs that match your skills or recruit Service Providers that suit your needs.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    padding: 15,
    backgroundColor: "#f7dbe4ff",
  },
  welcome: {
    fontSize: 16,
    color: "#555",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 4,
    color: "#333",
  },
  titleHighlight: {
    color: "#FFB6C1",
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
    marginBottom: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#FFDAB9",
    paddingVertical: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#555",
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 25,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryButton: {
    backgroundColor: "#D32F2F",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D32F2F",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: "#D32F2F",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  feature: {
    alignItems: "center",
  },
  featureText: {
    fontSize: 12,
    color: "#444",
    marginTop: 4,
  },
  mvContainer: {
    marginBottom: 20,
  },
  mvBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  missionBox: {
    backgroundColor: "#FEF2F2",
  },
  visionBox: {
    backgroundColor: "#EFF6FF",
  },
  mvTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    paddingBottom: 4,
  },
  missionTitle: {
    color: "#D32F2F",
    borderBottomWidth: 2,
    borderBottomColor: "#D32F2F",
  },
  visionTitle: {
    color: "#1E40AF",
    borderBottomWidth: 2,
    borderBottomColor: "#1E40AF",
  },
  mvText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  // --- HOW IT WORKS SECTION ---
  howItWorks: {
    paddingVertical: 30,
    backgroundColor: "#f9f9ff",
    borderRadius: 20,
    marginBottom: 30,
    elevation: 1,
  },
  howTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
  },
  howUnderline: {
    width: 50,
    height: 3,
    backgroundColor: "#ce4da3",
    alignSelf: "center",
    marginVertical: 8,
    borderRadius: 10,
  },
  stepsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },
  stepCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepIcon: {
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
    textAlign: "center",
  },
  stepDesc: {
    fontSize: 13,
    textAlign: "center",
    color: "#555",
    lineHeight: 18,
  },
});
