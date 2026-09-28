import './style.css';
import { startPhaserGame } from './phaser/bootstrap';

void startPhaserGame().catch((error: unknown) => {
  console.error(
    'Queen Victoria RTS failed to start',
    error,
  );
});
