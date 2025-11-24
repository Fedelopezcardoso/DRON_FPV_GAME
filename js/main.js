import * as THREE from 'three';
import { Drone } from './physics.js';
import { InputHandler } from './input.js';
import { EnvironmentManager } from './environment.js';
import { AudioManager } from './audio.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.input = new InputHandler();
        this.drone = new Drone(this.scene);
        this.envManager = new EnvironmentManager(this.scene);
        this.audio = new AudioManager();

        this.isPlaying = false;
        this.isPaused = false;

        this.setupLights();
        this.setupUI();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.isPlaying) {
                this.togglePause();
            }
        });

        this.animate();
    }

    setupUI() {
        document.getElementById('btn-city').addEventListener('click', () => this.startGame('CITY'));
        document.getElementById('btn-jungle').addEventListener('click', () => this.startGame('JUNGLE'));

        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());

        document.getElementById('btn-toggle-mode').addEventListener('click', () => this.toggleMode());
        document.getElementById('btn-toggle-sound').addEventListener('click', () => this.toggleSound());
    }

    toggleMode() {
        const newMode = this.drone.mode === 'ACRO' ? 'LEVEL' : 'ACRO';
        this.drone.setMode(newMode);

        // Update UI
        const btnText = "MODE: " + newMode;
        document.getElementById('btn-toggle-mode').innerText = btnText;

        const hudEl = document.querySelector('#top-bar .hud-text:first-child');
        if (hudEl) hudEl.innerText = btnText;
    }

    toggleSound() {
        this.audio.toggleMute();
        const btn = document.getElementById('btn-toggle-sound');
        btn.innerText = "SOUND: " + (this.audio.isMuted ? "OFF" : "ON");
    }

    startGame(mapType) {
        // Init audio on first user interaction
        this.audio.init();

        if (mapType === 'CITY') {
            this.envManager.loadCity();
            this.scene.background = new THREE.Color(0x87CEEB);
            this.scene.fog = new THREE.Fog(0x87CEEB, 20, 500);
        } else {
            this.envManager.loadJungle();
            this.scene.background = new THREE.Color(0x87CEEB);
            this.scene.fog = new THREE.Fog(0x87CEEB, 20, 400);
        }

        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'flex';
        this.isPlaying = true;
        this.isPaused = false;

        this.resetDrone();
    }

    resetDrone() {
        this.drone.mesh.position.set(0, 2, 0);
        this.drone.velocity.set(0, 0, 0);
        this.drone.rotation.set(0, 0, 0);
        this.drone.mesh.rotation.set(0, 0, 0);
        this.drone.angularVelocity.set(0, 0, 0);
    }

    restartGame() {
        this.resetDrone();
        this.togglePause(); // Unpause
    }

    quitToMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
        this.audio.stop();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pause-menu');

        if (this.isPaused) {
            pauseMenu.style.display = 'flex';
            this.audio.stop();
        } else {
            pauseMenu.style.display = 'none';
        }
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;

        // Improve shadow quality
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;

        this.scene.add(dirLight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isPlaying) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.isPaused) {
            return;
        }

        const dt = this.clock.getDelta();
        const inputState = this.input.getState();

        // Handle Mode Toggle (Keyboard Shortcut)
        if (inputState.toggleMode) {
            this.toggleMode();
        }

        this.drone.update(dt, inputState, this.envManager.objects);
        this.audio.update(inputState.thrust);

        // Update camera to follow drone (FPV)
        this.drone.updateCamera(this.camera);

        // Update UI
        document.getElementById('thrust-val').innerText = Math.round(inputState.thrust * 100);
        document.getElementById('alt-val').innerText = Math.round(this.drone.mesh.position.y);

        this.renderer.render(this.scene, this.camera);
    }
}

// Start game
new Game();
