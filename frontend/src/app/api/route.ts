// app/api/flappy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

let gameProcess: any = null;

interface APIResponse {
  success: boolean;
  message: string;
  pid?: number;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<APIResponse>> {
  try {
    const data = await request.json();
    const action = data.action;

    console.log("Received action:", action);

    if (action === "start") {
      // Kill existing process if it exists
      if (gameProcess) {
        try {
          gameProcess.kill();
          gameProcess = null;
        } catch (error) {
          console.error("Error killing existing process:", error);
        }
      }

      const scriptPath = path.join(process.cwd(), "src", "flappy.py");
      console.log("Starting Python script at:", scriptPath);

      return new Promise((resolve) => {
        try {
          gameProcess = spawn("python3", [scriptPath], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, PYTHONUNBUFFERED: "1" },
          });

          gameProcess.stdout.on("data", (data: Buffer) => {
            console.log("Python output:", data.toString());
          });

          gameProcess.stderr.on("data", (data: Buffer) => {
            console.error("Python error:", data.toString());
          });

          gameProcess.on("error", (error: Error) => {
            console.error("Process error:", error);
            resolve(
              NextResponse.json(
                {
                  success: false,
                  message: "Failed to start game process",
                  error: error.message,
                },
                { status: 500 },
              ),
            );
          });

          // Give the process a moment to start
          setTimeout(() => {
            if (gameProcess && gameProcess.pid) {
              resolve(
                NextResponse.json({
                  success: true,
                  message: "Game started successfully",
                  pid: gameProcess.pid,
                }),
              );
            } else {
              resolve(
                NextResponse.json(
                  {
                    success: false,
                    message: "Failed to start game process",
                    error: "Process failed to start",
                  },
                  { status: 500 },
                ),
              );
            }
          }, 1000);
        } catch (error) {
          resolve(
            NextResponse.json(
              {
                success: false,
                message: "Failed to start game process",
                error: error instanceof Error ? error.message : "Unknown error",
              },
              { status: 500 },
            ),
          );
        }
      });
    }

    if (action === "stop") {
      if (gameProcess) {
        try {
          gameProcess.kill();
          gameProcess = null;
          return NextResponse.json({
            success: true,
            message: "Game stopped successfully",
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              message: "Failed to stop game process",
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          );
        }
      }
      return NextResponse.json({
        success: true,
        message: "Game was not running",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid action",
        error: "Action must be either start or stop",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: "Flappy Bird API is running",
  });
}
