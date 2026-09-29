import './style.css'
import { startPhaserGame } from './phaser/bootstrap'
import { assetUrl } from './assets/base-url'

const root = document.getElementById('queen-victoria-rts')

if (!root) {
  throw new Error('Missing Queen Victoria RTS root')
}

root.innerHTML = `
  <div id="title-screen">
    <img
      id="title-background"
      src="${assetUrl('assets/title/title-screen.png')}"
      alt="Queen Victoria RTS"
    />

    <button
      id="start-skirmish"
      type="button"
      aria-label="Start Skirmish"
    ></button>

    <button
      id="music-toggle"
      type="button"
      aria-label="Toggle music"
    >
      ♫
    </button>
  </div>
`

const title = document.getElementById('title-screen')
const start = document.getElementById('start-skirmish')
const musicToggle = document.getElementById('music-toggle')

const titleMusic = new Audio(
  assetUrl('assets/audio/title-theme.mp3'),
)

const battleMusic = new Audio(
  assetUrl('assets/audio/battle-loop.mp3'),
)

titleMusic.loop = true
titleMusic.volume = 0.5

battleMusic.loop = true
battleMusic.volume = 0.42

let musicEnabled = true

async function startTitleMusic(): Promise<void> {
  if (!musicEnabled) return

  try {
    await titleMusic.play()
  } catch {
    // Mobile browsers require an interaction first.
  }
}

async function startBattleMusic(): Promise<void> {
  titleMusic.pause()
  titleMusic.currentTime = 0

  if (!musicEnabled) return

  try {
    battleMusic.currentTime = 0
    await battleMusic.play()
  } catch {
    // Playback can be retried after another user gesture.
  }
}

musicToggle?.addEventListener('click', async () => {
  musicEnabled = !musicEnabled

  if (!musicEnabled) {
    titleMusic.pause()
    battleMusic.pause()
    musicToggle.textContent = '🔇'
    return
  }

  musicToggle.textContent = '♫'

  if (title) {
    await startTitleMusic()
  } else {
    await battleMusic.play()
  }
})

start?.addEventListener('click', async () => {
  await startBattleMusic()

  title?.remove()

  await startPhaserGame()
})

document.addEventListener(
  'pointerdown',
  () => {
    void startTitleMusic()
  },
  { once: true },
)
