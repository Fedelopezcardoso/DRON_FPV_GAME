import * as THREE from 'three';

export class Drone {
    constructor(scene) {
        this.mesh = this.createDroneMesh();
        scene.add(this.mesh);

        // Physics state
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Configuration
        this.maxThrust = 30.0; // m/s^2
        this.mass = 0.5; // kg
        this.drag = 0.5; // Air resistance
        this.angularDrag = 6.0; // Higher drag for snappier feel (was 4.0)
        this.acroRate = 8.0; // Rad/s for full stick in Acro (was 5.0) - Faster flips
        this.angleRate = 0.78; // Max angle in radians for Level mode (~45 degrees)
        this.levelStrength = 15.0; // How fast it self-levels (was 10.0) - Snappier level
        this.gravity = -9.81;

        this.mode = 'ACRO'; // ACRO or LEVEL

        // Collision
        this.raycaster = new THREE.Raycaster();
        this.collisionRadius = 0.5;
    }

    setMode(mode) {
        this.mode = mode;
        console.log("Flight Mode: " + mode);
    }

    createDroneMesh() {
        const group = new THREE.Group();

        // Body
        const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const body = new THREE.Mesh(geometry, material);
        group.add(body);

        // Arms (visual only)
        const armGeo = new THREE.BoxGeometry(0.6, 0.05, 0.05);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const arm1 = new THREE.Mesh(armGeo, armMat);
        arm1.rotation.y = Math.PI / 4;
        group.add(arm1);

        const arm2 = new THREE.Mesh(armGeo, armMat);
        arm2.rotation.y = -Math.PI / 4;
        group.add(arm2);

        // Initial position
        group.position.set(0, 2, 0);

        return group;
    }

    update(dt, input, collidables = []) {
        // 1. Rotation Logic

        if (this.mode === 'ACRO') {
            // Rate mode: Stick = Angular Velocity
            const targetAngularVel = new THREE.Vector3(
                input.pitch * this.acroRate,
                input.yaw * this.acroRate,
                input.roll * this.acroRate
            );
            this.angularVelocity.lerp(targetAngularVel, dt * 10);
        } else {
            // Level mode: Stick = Target Angle
            // We calculate the error between current angle and target angle
            // and apply angular velocity proportional to that error (P controller)

            // Current Euler angles
            const currentEuler = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, 'YXZ');

            // Target angles (Yaw is still rate-based usually, but let's keep it simple)
            // Actually in Level mode, Yaw is usually rate, Pitch/Roll are angle.

            const targetPitch = input.pitch * this.angleRate;
            const targetRoll = input.roll * this.angleRate;

            // Calculate error
            // Note: This is a simplification. For full 3D rotation we should use Quaternions,
            // but for small angles this works okay.
            const pitchError = targetPitch - currentEuler.x;
            const rollError = targetRoll - currentEuler.z;

            // Apply correction to angular velocity
            this.angularVelocity.x = pitchError * this.levelStrength;
            this.angularVelocity.z = rollError * this.levelStrength;

            // Yaw is still rate based
            this.angularVelocity.y = input.yaw * this.acroRate;
        }

        // Apply rotation
        this.mesh.rotateX(this.angularVelocity.x * dt);
        this.mesh.rotateY(this.angularVelocity.y * dt);
        this.mesh.rotateZ(this.angularVelocity.z * dt);

        // Damping (Angular Drag) - mainly for Acro to stop spinning when stick released
        if (this.mode === 'ACRO') {
            // Already handled by lerp to target (which is 0 if stick is 0)
        }

        // 2. Thrust
        // Thrust vector is always local UP relative to the drone
        const thrustForce = new THREE.Vector3(0, 1, 0);
        thrustForce.applyQuaternion(this.mesh.quaternion);
        thrustForce.multiplyScalar(input.thrust * this.maxThrust);

        // 3. Linear Physics (Euler integration)
        const acceleration = new THREE.Vector3(0, this.gravity, 0); // Gravity
        acceleration.add(thrustForce); // Thrust

        // Drag (air resistance)
        const dragForce = this.velocity.clone().multiplyScalar(-this.drag);
        acceleration.add(dragForce);

        // Update velocity
        this.velocity.add(acceleration.clone().multiplyScalar(dt));

        // Check for collisions BEFORE moving
        if (collidables.length > 0 && this.velocity.length() > 0.1) {
            const direction = this.velocity.clone().normalize();
            this.raycaster.set(this.mesh.position, direction);

            // Look ahead based on speed (at least collisionRadius)
            const lookAhead = Math.max(this.collisionRadius, this.velocity.length() * dt * 2);

            const intersects = this.raycaster.intersectObjects(collidables, true);

            if (intersects.length > 0 && intersects[0].distance < lookAhead) {
                // CRASH!
                console.log("CRASH!");

                // Simple crash response: Stop and bounce back slightly
                this.velocity.multiplyScalar(-0.5);

                // Add some random spin for effect
                this.angularVelocity.set(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                );
            }
        }

        // Update position
        this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

        // Ground collision (simple floor at y=0)
        if (this.mesh.position.y < 0.2) {
            this.mesh.position.y = 0.2;
            this.velocity.y = Math.max(0, this.velocity.y * -0.5); // Bounce
            this.velocity.x *= 0.8; // Friction
            this.velocity.z *= 0.8;
        }
    }

    updateCamera(camera) {
        // FPV Camera position: slightly in front/above center
        const offset = new THREE.Vector3(0, 0.1, -0.2);
        offset.applyQuaternion(this.mesh.quaternion);

        camera.position.copy(this.mesh.position).add(offset);
        camera.quaternion.copy(this.mesh.quaternion);

        // Optional: Add camera tilt based on speed or pitch for more "feel"
    }
}
