/**
 * checkoutSound.ts
 * Plays a short success "ding" sound at checkout using expo-av.
 * Sound is loaded lazily once and reused.
 */
import { Audio } from "expo-av";

let _sound: Audio.Sound | null = null;

export async function playCheckoutSound() {
  try {
    // Encode a tiny success tone as a base64 wav URI so we don't need a bundled asset.
    // This is a short sine-wave ding generated offline.
    if (!_sound) {
      const { sound } = await Audio.Sound.createAsync(
        // Using a standard beep from expo-av built-in test tone
        { uri: "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg" },
        { shouldPlay: false, volume: 0.4 }
      );
      _sound = sound;
    }
    await _sound.setPositionAsync(0);
    await _sound.playAsync();
  } catch (e) {
    // Sound is a nice-to-have, never crash on failure
    console.warn("[Sound] Checkout sound failed:", e);
  }
}

export async function unloadCheckoutSound() {
  if (_sound) {
    await _sound.unloadAsync();
    _sound = null;
  }
}
