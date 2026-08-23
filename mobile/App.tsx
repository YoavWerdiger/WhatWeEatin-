import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
  const [backendReady, setBackendReady] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState("");

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
  const autoPickLock = useRef(false);

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
      setBackendReady(true);
      setMessage("");
    } catch {
      setBackendReady(false);
      setMessage("Backend offline. Run `npm run dev` in the project root.");
    }
  };

  const fetchAndStartSwipe = async (nextSessionId: string, timerSeconds?: number) => {
    const sessionCandidates = await api.getCandidates(nextSessionId);
    setCandidates(sessionCandidates);
    const total = timerSeconds ?? 120;
    setTimerTotal(total);
    setSecondsLeft(total);
    setPickyCount(0);
    autoPickLock.current = false;
    setScreen("swipe");
  };

  const handleCreateSession = async () => {
    if (!userId) {
      setMessage("Connecting… try again in a second.");
      void loginOnce();
      return;
    }
    setLoadingCreate(true);
    setMessage("");
    try {
      const result = await api.createSession({
        hostUserId: userId,
        locationLat: 32.0853,
        locationLng: 34.7818,
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
      await api.joinSession(joinSessionId.trim(), userId);
      const state = await api.getSessionState(joinSessionId.trim());
      setSessionId(joinSessionId.trim());
      setInviteLink(`whatweeatin://join/${joinSessionId.trim()}`);
      await fetchAndStartSwipe(joinSessionId.trim(), state.session.timerSeconds);
    } catch (error) {
      setMessage(toErrorMessage(error));
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleVote = async (vote: SwipeVote) => {
    if (!sessionId || !currentCandidate || !userId || loadingVote) {
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
    if (!sessionId || autoPickLock.current) {
      return;
    }
    autoPickLock.current = true;
    try {
      await api.autoPick(sessionId);
      await loadMatch(sessionId);
    } catch (error) {
      autoPickLock.current = false;
      setMessage(toErrorMessage(error));
    }
  };

  const shareInvite = async () => {
    if (!sessionId) {
      Alert.alert("No active session", "Start a session first.");
      return;
    }
    try {
      await Share.share({
        message: `Join my What We Eatin’ session: ${sessionId}`,
      });
    } catch {
      // ignore
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
    autoPickLock.current = false;
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
              backendReady={backendReady}
            />
          )}

          {screen === "create" && (
            <CreateSessionScreen
              radiusKm={radiusKm}
              budgetLevel={budgetLevel}
              selectedCuisines={selectedCuisines}
              loading={loadingCreate}
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
              remainingCount={candidates.length}
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
            <MatchScreen result={matchResult} onRestart={restartToHome} />
          )}

          {screen === "swipe" || screen === "create" ? (
            <View style={styles.footerActions}>
              <AppButton title="Home" onPress={restartToHome} variant="ghost" />
            </View>
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
    bottom: spacing.sm,
    alignSelf: "center",
  },
});
