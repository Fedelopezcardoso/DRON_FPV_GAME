import * as THREE from 'three';
import { Drone } from './physics.js';
import { InputHandler } from './input.js';

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

        this.initEnvironment();
        this.setupLights();

        window.addEventListener('resize', () => this.onWindowResize(), false);

        this.animate();
    }

    initEnvironment() {
        // Basic ground
        const geometry = new THREE.PlaneGeometry(1000, 1000);
        const material = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(1000, 100);
        this.scene.add(gridHelper);

        // Some obstacles
        for (let i = 0; i < 20; i++) {
            const boxGeo = new THREE.BoxGeometry(5, 10, 5);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(
                (Math.random() - 0.5) * 200,
                5,
                (Math.random() - 0.5) * 200
            );
            this.scene.add(box);
        }

        // Race Gates
        for (let i = 0; i < 5; i++) {
            this.createGate(new THREE.Vector3(0, 5, -20 - (i * 30)), i % 2 === 0 ? 0 : Math.PI / 4);
        }
    }

    createGate(position, rotationY = 0) {
        const group = new THREE.Group();

        const material = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.5 });

        // Top bar
        const top = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.5), material);
        top.position.y = 4;
        group.add(top);

        // Bottom bar
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.5), material);
        bottom.position.y = -4;
        group.add(bottom);

        // Left post
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), material);
        left.position.x = -4;
        group.add(left);

        // Right post
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), material);
        right.position.x = 4;
        group.add(right);

        group.position.copy(position);
        group.rotation.y = rotationY;

        this.scene.add(group);
        return group;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 500);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = this.clock.getDelta();
        const inputState = this.input.getState();

        // Handle Mode Toggle
        if (inputState.toggleMode) {
            const newMode = this.drone.mode === 'ACRO' ? 'LEVEL' : 'ACRO';
            this.drone.setMode(newMode);

            // Visual feedback
            const modeEl = document.querySelector('#top-bar .hud-text:first-child');
            if (modeEl) modeEl.innerText = "MODE: " + newMode;
        }

        this.drone.update(dt, inputState);

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
