// app/components/Game.jsx
"use client";

import React from "react";
import { useFlappyGame } from "@/app/hooks/useFlappy";

const FlappyBird = () => {
  const { gameStatus, error, score, startGame, stopGame } = useFlappyGame();

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold mb-4">Flappy Bird</h2>

          {error && (
            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <svg
                className="h-5 w-5 text-red-600 mt-0.5"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12" y2="16" />
              </svg>
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-gray-200">
            {gameStatus === "loading" && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></span>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={startGame}
              disabled={gameStatus === "running" || gameStatus === "loading"}
              className={`w-24 px-4 py-2 rounded-md font-medium transition-colors
                ${
                  gameStatus === "running" || gameStatus === "loading"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                }`}
            >
              Start
            </button>

            <button
              onClick={stopGame}
              disabled={gameStatus !== "running"}
              className={`w-24 px-4 py-2 rounded-md font-medium transition-colors
                ${
                  gameStatus !== "running"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-red-500 text-white hover:bg-red-600 active:bg-red-700"
                }`}
            >
              Stop
            </button>
          </div>

          {gameStatus === "running" && (
            <div className="text-lg font-semibold">Score: {score}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlappyBird;
