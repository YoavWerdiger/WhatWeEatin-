import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, Share, StyleSheet, Text, View } from "react-native";
import { ApiError, api } from "./src/api/client";
import { AppButton } from "./src/components/AppButton";
import { CreateSessionScreen } from "./src/screens/CreateSessionScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MatchScreen } from "./src/screens/MatchScreen";
import { SwipeScreen } from "./src/screens/SwipeScreen";
import { colors, spacing } from "./src/theme/tokens";
import { Candidate, MatchWithRestaurant, SwipeVote } from "./src/types/app";

type Screen = "home" | "create" | "swipe" | "match";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [userId, setUserId] = useState<string>("");
  const [joinSessionId, setJoinSessionId] = useState("");

  const [latitude, setLatitude] = useState("32.0853");
  const [longitude, setLongitude] = useState("34.7818");
  const [radiusKm, setRadiusKm] = useState(5);
  const [budgetLevel, setBudgetLevel] = useState(2);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(["pizza", "sushi"]);

  const [sessionId, setSessionId] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [timerTotal, setTimerTotal] = useState(120);
  const [secondsLeft, setSecondsLeft] = useState(120);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matchResult, setMatchResult] = useState<MatchWithRestaurant | null>(null);
  const [pickyCount, setPickyCount] = useState(0);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [loadingVote, setLoadingVote] = useState(false);
  const [message, setMessage] = useState<string>("");

  const currentCandidate = useMemo(() => candidates[0] ?? null, [candidates]);

  useEffect(() => {
    void loginOnce();
  }, []);

  useEffect(() => {
    if (screen !== "swipe") {
      return;
    }
    if (secondsLeft <= 0) {
      void handleAutoPick();
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, secondsLeft]);

  const loginOnce = async () => {
    try {
      const providerUserId = `demo-${Math.floor(Math.random() * 999999)}`;
      const result = await api.login({
        provider: "google",
        providerUserId,
        displayName: "Food Friend",
      });
      setUserId(result.user.id);
      setMessage("");
    } catch (error) {
      setMessage("Could not connect to backend. Check EXPO_PUBLIC_API_URL.");
    }
  };

  const fetchAndStartSwipe = async (nextSessionId: string, timerSeconds?: number) => {
    const sessionCandidates = await api.getCandidates(nextSessionId);
    setCandidates(sessionCandidates);
    const total = timerSeconds ?? 120;
    setTimerTotal(total);
    setSecondsLeft(total);
    setPickyCount(0);
    setScreen("swipe");
  };

  const handleCreateSession = async () => {
    if (!userId) {
      setMessage("Please wait a moment, logging in.");
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage("Location must be valid coordinates.");
      return;
    }
    setLoadingCreate(true);
    setMessage("");
    try {
      const result = await api.createSession({
        hostUserId: userId,
        locationLat: lat,
        locationLng: lng,
        radiusKm,
        budgetLevel,
        timerSeconds: 120,
        cuisinePreferences: selectedCuisines,
      });
      setSessionId(result.session.id);
      setInviteLink(result.inviteLink);
      await fetchAndStartSwipe(result.session.id, result.session.timerSeconds);
    } catch (error) {
      setMessage(toErrorMessage(error));
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoinSession = async () => {
    if (!joinSessionId || !userId) {
      return;
    }
    setLoadingJoin(true);
    setMessage("");
    try {
      await api.joinSession(joinSessionId, userId);
      const state = await api.getSessionState(joinSessionId);
      setSessionId(joinSessionId);
      setInviteLink(`whatweeatin://join/${joinSessionId}`);
      await fetchAndStartSwipe(joinSessionId, state.session.timerSeconds);
    } catch (error) {
      setMessage(toErrorMessage(error));
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleVote = async (vote: SwipeVote) => {
    if (!sessionId || !currentCandidate || !userId) {
      return;
    }
    setLoadingVote(true);
    setMessage("");
    try {
      const result = await api.castVote(sessionId, {
        userId,
        restaurantId: currentCandidate.restaurantId,
        vote,
      });
      if (vote === "left_no") {
        setPickyCount((current) => current + 1);
      }
      setCandidates((current) => current.slice(1));

      if (result.match) {
        await loadMatch(sessionId);
      } else if (candidates.length <= 1) {
        await handleAutoPick();
      }
    } catch (error) {
      setMessage(toErrorMessage(error));
    } finally {
      setLoadingVote(false);
    }
  };

  const loadMatch = async (activeSessionId: string) => {
    const result = await api.getMatch(activeSessionId);
    if (!result) {
      setMessage("No match yet.");
      return;
    }
    setMatchResult(result);
    setScreen("match");
  };

  const handleAutoPick = async () => {
    if (!sessionId) {
      return;
    }
    try {
      await api.autoPick(sessionId);
      await loadMatch(sessionId);
    } catch (error) {
      setMessage(toErrorMessage(error));
    }
  };

  const shareInvite = async () => {
    if (!inviteLink) {
      Alert.alert("No active session", "Start a session first.");
      return;
    }
    try {
      await Share.share({
        message: `Join my food session now: ${inviteLink}`,
      });
    } catch {
      // Ignore share cancellations.
    }
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((current) =>
      current.includes(cuisine) ? current.filter((item) => item !== cuisine) : [...current, cuisine],
    );
  };

  const restartToHome = () => {
    setScreen("home");
    setSessionId("");
    setInviteLink("");
    setCandidates([]);
    setMatchResult(null);
    setMessage("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {screen === "home" && (
        <HomeScreen
          joinSessionId={joinSessionId}
          setJoinSessionId={setJoinSessionId}
          onCreatePress={() => setScreen("create")}
          onJoinPress={handleJoinSession}
          joining={loadingJoin}
        />
      )}

      {screen === "create" && (
        <CreateSessionScreen
          latitude={latitude}
          longitude={longitude}
          radiusKm={radiusKm}
          budgetLevel={budgetLevel}
          selectedCuisines={selectedCuisines}
          loading={loadingCreate}
          setLatitude={setLatitude}
          setLongitude={setLongitude}
          setRadiusKm={setRadiusKm}
          setBudgetLevel={setBudgetLevel}
          toggleCuisine={toggleCuisine}
          onCreate={handleCreateSession}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "swipe" && (
        <SwipeScreen
          candidate={currentCandidate}
          secondsLeft={secondsLeft}
          totalSeconds={timerTotal}
          inviteCode={sessionId.slice(0, 8)}
          pickyCount={pickyCount}
          onVote={handleVote}
          onAutoPick={handleAutoPick}
          onShareInvite={shareInvite}
          loadingVote={loadingVote}
        />
      )}

      {screen === "match" && matchResult && (
        <MatchScreen
          result={matchResult}
          onRestart={() => {
            restartToHome();
          }}
        />
      )}

      {screen !== "home" && (
        <View style={styles.footerActions}>
          <AppButton title="Home" onPress={restartToHome} variant="ghost" />
        </View>
      )}
    </SafeAreaView>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  messageBox: {
    backgroundColor: "#3A1D1D",
    borderColor: colors.danger,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 12,
  },
  messageText: {
    color: "#FFD6D6",
    fontWeight: "600",
  },
  footerActions: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
  },
});
