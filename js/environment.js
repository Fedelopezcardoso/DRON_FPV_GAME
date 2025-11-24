import * as THREE from 'three';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.currentMap = null;
        this.objects = [];

        // Load textures
        const loader = new THREE.TextureLoader();
        this.textures = {
            building: loader.load('assets/textures/building.png'),
            asphalt: loader.load('assets/textures/asphalt.png'),
            grass: loader.load('assets/textures/grass.png')
        };

        // Configure textures
        for (let key in this.textures) {
            this.textures[key].wrapS = THREE.RepeatWrapping;
            this.textures[key].wrapT = THREE.RepeatWrapping;
        }
    }

    clear() {
        // Remove old objects
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
        this.objects = [];
    }

    loadCity() {
        this.clear();
        this.currentMap = 'CITY';
        console.log("Loading City Map...");

        // 1. Ground (Asphalt)
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        this.textures.asphalt.repeat.set(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({
            map: this.textures.asphalt,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.objects.push(ground);

        // 2. Buildings
        const boxGeo = new THREE.BoxGeometry(1, 1, 1); // Base geometry, scaled later

        // Material for buildings (Texture on sides, simple color on top)
        // We can use an array of materials for the cube
        const buildingMatSide = new THREE.MeshStandardMaterial({
            map: this.textures.building,
            roughness: 0.2,
            metalness: 0.5
        });
        const buildingMatTop = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const materials = [
            buildingMatSide, // px
            buildingMatSide, // nx
            buildingMatTop,  // py
            buildingMatTop,  // ny
            buildingMatSide, // pz
            buildingMatSide  // nz
        ];

        for (let i = 0; i < 50; i++) {
            const width = 10 + Math.random() * 20;
            const depth = 10 + Math.random() * 20;
            const height = 20 + Math.random() * 80; // Tall skyscrapers

            const building = new THREE.Mesh(boxGeo, materials);
            building.position.set(
                (Math.random() - 0.5) * 400,
                height / 2,
                (Math.random() - 0.5) * 400
            );
            building.scale.set(width, height, depth);
            building.castShadow = true;
            building.receiveShadow = true;

            this.scene.add(building);
            this.objects.push(building);
        }

        // Add some gates for the city
        this.addGates(5, 50);
    }

    loadJungle() {
        this.clear();
        this.currentMap = 'JUNGLE';
        console.log("Loading Jungle Map...");

        // 1. Ground (Grass)
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        this.textures.grass.repeat.set(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({
            map: this.textures.grass,
            roughness: 1.0
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.objects.push(ground);

        // 2. Trees
        // Simple low-poly trees: Cylinder trunk, Cone leaves
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        const leavesGeo = new THREE.ConeGeometry(4, 10);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });

        for (let i = 0; i < 100; i++) {
            const group = new THREE.Group();

            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 2;
            trunk.castShadow = true;
            group.add(trunk);

            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = 7; // 2 + 5
            leaves.castShadow = true;
            group.add(leaves);

            // Random scale
            const s = 1 + Math.random();
            group.scale.set(s, s, s);

            group.position.set(
                (Math.random() - 0.5) * 400,
                0,
                (Math.random() - 0.5) * 400
            );

            this.scene.add(group);
            this.objects.push(group);
        }

        // Add some gates for the jungle
        this.addGates(5, 30);
    }

    addGates(count, spacing) {
        for (let i = 0; i < count; i++) {
            this.createGate(new THREE.Vector3(0, 10, -20 - (i * spacing)), i % 2 === 0 ? 0 : Math.PI / 4);
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
        this.objects.push(group);
    }
}
