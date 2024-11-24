// app/hooks/useFlappyGame.ts
import { useState, useEffect, useCallback } from "react";

interface APIResponse {
  success: boolean;
  message: string;
  pid?: number;
  error?: string;
}

enum GameStatus {
  STOPPED = "stopped",
  LOADING = "loading",
  RUNNING = "running",
}

export const useFlappyGame = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.STOPPED);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    try {
      console.log("Connecting to WebSocket...");
      const ws = new WebSocket("ws://localhost:8765");

      ws.onopen = () => {
        console.log("WebSocket connected");
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received:", data);
          if (data.type === "score") {
            setScore(data.value);
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error");
        setGameStatus(GameStatus.STOPPED);
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setSocket(null);
        if (gameStatus === GameStatus.RUNNING) {
          setGameStatus(GameStatus.STOPPED);
        }
      };

      setSocket(ws);
    } catch (err) {
      console.error("WebSocket connection error:", err);
      setError("Failed to connect to game server");
      setGameStatus(GameStatus.STOPPED);
    }
  }, [gameStatus]);

  const startGame = async () => {
    try {
      setGameStatus(GameStatus.LOADING);
      setError(null);

      const response = await fetch("/api/flappy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "start" }),
      });

      const data: APIResponse = await response.json();
      console.log("Start response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to start game");
      }

      // Give Python server time to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      connectWebSocket();
      setGameStatus(GameStatus.RUNNING);
    } catch (err) {
      console.error("Start game error:", err);
      setError(err instanceof Error ? err.message : "Failed to start game");
      setGameStatus(GameStatus.STOPPED);
    }
  };

  const stopGame = async () => {
    try {
      const response = await fetch("/api/flappy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "stop" }),
      });

      const data: APIResponse = await response.json();
      console.log("Stop response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to stop game");
      }

      if (socket) {
        socket.close();
      }

      setGameStatus(GameStatus.STOPPED);
    } catch (err) {
      console.error("Stop game error:", err);
      setError("Failed to stop game");
      setGameStatus(GameStatus.STOPPED);
    }
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
      if (gameStatus === GameStatus.RUNNING) {
        stopGame();
      }
    };
  }, [gameStatus]);

  return {
    gameStatus,
    error,
    score,
    startGame,
    stopGame,
    socket,
  };
};

export { GameStatus };
