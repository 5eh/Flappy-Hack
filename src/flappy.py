# src/flappy.py
import os
import sys
import asyncio
import pygame
import json
import websockets
import logging
from pygame.locals import K_ESCAPE, K_SPACE, K_UP, KEYDOWN, QUIT

# Add the parent directory to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.entities.background import Background
from src.entities.floor import Floor
from src.entities.game_over import GameOver
from src.entities.pipes import Pipes
from src.entities.player import Player, PlayerMode
from src.entities.score import Score
from src.entities.welcome_message import WelcomeMessage
from src.utils.game_config import GameConfig
from src.utils.images import Images
from src.utils.sounds import Sounds
from src.utils.window import Window

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('FlappyBird')

class Flappy:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Flappy Bird")
        window = Window(288, 512)
        screen = pygame.display.set_mode((window.width, window.height))
        images = Images()
        self.config = GameConfig(
            screen=screen,
            clock=pygame.time.Clock(),
            fps=30,
            window=window,
            images=images,
            sounds=Sounds(),
        )
        self.websocket_server = None
        self.connections = set()
        self.running = True

    async def handle_websocket(self, websocket):
        """Handle WebSocket connections and messages"""
        logger.info("New client connected")
        self.connections.add(websocket)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data.get('type') == 'jump':
                        # Simulate a space key press
                        event = pygame.event.Event(KEYDOWN, {'key': K_SPACE})
                        pygame.event.post(event)
                except json.JSONDecodeError:
                    pass
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.connections.remove(websocket)
            logger.info("Client disconnected")

    async def broadcast_score(self, score):
        """Send score updates to all connected clients"""
        if self.connections:
            message = json.dumps({"type": "score", "value": score})
            websockets_tasks = [connection.send(message) for connection in self.connections]
            await asyncio.gather(*websockets_tasks, return_exceptions=True)

    async def broadcast_game_over(self):
        """Send game over message to all connected clients"""
        if self.connections:
            message = json.dumps({"type": "gameOver", "score": self.score.score})
            websockets_tasks = [connection.send(message) for connection in self.connections]
            await asyncio.gather(*websockets_tasks, return_exceptions=True)

    async def start_websocket_server(self):
        """Start the WebSocket server"""
        self.websocket_server = await websockets.serve(
            self.handle_websocket,
            "localhost",
            8765
        )
        logger.info("WebSocket server started on ws://localhost:8765")

    async def start(self):
        """Start both the game and WebSocket server"""
        # Start WebSocket server
        await self.start_websocket_server()

        # Main game loop
        while True:
            self.background = Background(self.config)
            self.floor = Floor(self.config)
            self.player = Player(self.config)
            self.welcome_message = WelcomeMessage(self.config)
            self.game_over_message = GameOver(self.config)
            self.pipes = Pipes(self.config)
            self.score = Score(self.config)

            await self.splash()
            await self.play()
            await self.game_over()

            # Broadcast final score
            await self.broadcast_game_over()

    async def play(self):
        """Main game loop with WebSocket score updates"""
        self.score.reset()
        self.player.set_mode(PlayerMode.NORMAL)
        last_score = 0

        while True:
            if self.player.collided(self.pipes, self.floor):
                return

            for i, pipe in enumerate(self.pipes.upper):
                if self.player.crossed(pipe):
                    self.score.add()
                    # Broadcast score when it changes
                    if self.score.score != last_score:
                        await self.broadcast_score(self.score.score)
                        last_score = self.score.score

            for event in pygame.event.get():
                self.check_quit_event(event)
                if self.is_tap_event(event):
                    self.player.flap()

            self.background.tick()
            self.floor.tick()
            self.pipes.tick()
            self.score.tick()
            self.player.tick()
            pygame.display.update()
            await asyncio.sleep(0)
            self.config.tick()

    # Rest of your original methods remain the same
    def check_quit_event(self, event):
        if event.type == QUIT or (event.type == KEYDOWN and event.key == K_ESCAPE):
            pygame.quit()
            sys.exit()

    def is_tap_event(self, event):
        m_left, *_ = pygame.mouse.get_pressed()
        space_or_up = event.type == KEYDOWN and (
            event.key == K_SPACE or event.key == K_UP
        )
        screen_tap = event.type == pygame.FINGERDOWN
        return m_left or space_or_up or screen_tap

    async def game_over(self):
        self.player.set_mode(PlayerMode.CRASH)
        self.pipes.stop()
        self.floor.stop()

        while True:
            for event in pygame.event.get():
                self.check_quit_event(event)
                if self.is_tap_event(event):
                    if self.player.y + self.player.h >= self.floor.y - 1:
                        return

            self.background.tick()
            self.floor.tick()
            self.pipes.tick()
            self.score.tick()
            self.player.tick()
            self.game_over_message.tick()
            self.config.tick()
            pygame.display.update()
            await asyncio.sleep(0)

async def main():
    try:
        game = Flappy()
        await game.start()
    except Exception as e:
        logger.error(f"Game error: {e}")
    finally:
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    asyncio.run(main())
