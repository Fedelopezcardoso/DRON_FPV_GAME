export class AudioManager {
    constructor() {
        this.context = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isInitialized = false;
        this.isMuted = false;
    }

    init() {
        if (this.isInitialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();

        // Create oscillator for motor sound
        this.oscillator = this.context.createOscillator();
        this.oscillator.type = 'sawtooth'; // Sawtooth sounds buzzy like a motor

        // Gain node for volume
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = 0;

        // Filter to soften the sound
        this.filter = this.context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1000;

        // Connect graph
        this.oscillator.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);

        this.oscillator.start();
        this.isInitialized = true;
    }

    update(thrust) {
        if (!this.isInitialized || this.isMuted) return;

        // Resume context if suspended (browser policy)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        // Modulate pitch and volume based on thrust
        // Base frequency ~100Hz, max ~800Hz
        const targetFreq = 100 + (thrust * 700);
        this.oscillator.frequency.setTargetAtTime(targetFreq, this.context.currentTime, 0.1);

        // Volume
        const targetGain = 0.1 + (thrust * 0.2);
        this.gainNode.gain.setTargetAtTime(targetGain, this.context.currentTime, 0.1);

        // Filter opens up with thrust
        const targetFilter = 1000 + (thrust * 4000);
        this.filter.frequency.setTargetAtTime(targetFilter, this.context.currentTime, 0.1);
    }

    stop() {
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) this.stop();
    }
}
