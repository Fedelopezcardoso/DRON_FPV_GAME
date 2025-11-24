export class InputHandler {
    constructor() {
        this.keys = {};
        this.gamepadIndex = null;

        // State: -1 to 1 for axes, 0 to 1 for thrust
        this.state = {
            thrust: 0,
            yaw: 0,
            pitch: 0,
            roll: 0,
            toggleMode: false
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
        if (e.code === 'KeyM') {
            this.state.toggleMode = true;
        }
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
        if (e.code === 'KeyM') {
            this.state.toggleMode = false;
        }
    }

    onGamepadConnected(e) {
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
            e.gamepad.index, e.gamepad.id,
            e.gamepad.buttons.length, e.gamepad.axes.length);
        this.gamepadIndex = e.gamepad.index;
    }

    onGamepadDisconnected(e) {
        console.log("Gamepad disconnected from index %d: %s",
            e.gamepad.index, e.gamepad.id);
        if (this.gamepadIndex === e.gamepad.index) {
            this.gamepadIndex = null;
        }
    }

    getState() {
        // Reset state
        let thrust = 0;
        let yaw = 0;
        let pitch = 0;
        let roll = 0;
        let toggleMode = this.state.toggleMode;

        // Reset toggle so it triggers only once per frame if we wanted, 
        // but here we just pass the state. The game loop should handle the toggle logic (debounce).
        // Actually, let's make it so we consume the toggle here? 
        // Better: just pass the boolean. Main loop handles "was pressed" logic.
        this.state.toggleMode = false; // Consume the key press

        // 1. Gamepad Input (Priority)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Standard mapping (Mode 2 usually):
                // Left Stick Y: Throttle (often -1 to 1, need to map to 0-1)
                // Left Stick X: Yaw
                // Right Stick Y: Pitch
                // Right Stick X: Roll

                // Note: Gamepad axes are usually -1 (up/left) to 1 (down/right)
                // But it varies. Let's assume standard Xbox/PS controller layout.

                // Axis 1 (Left Stick Y) - Throttle
                // Map -1 (up) to 1 (full throttle), 1 (down) to 0 (no throttle)
                // Actually usually down is 1, up is -1.
                // We want Up (-1) -> 1.0, Down (1) -> 0.0
                thrust = (-gp.axes[1] + 1) / 2;

                // Axis 0 (Left Stick X) - Yaw
                yaw = -gp.axes[0]; // Left is -1, Right is 1. We want Left to be positive rotation (CCW) usually? 
                // Actually standard: Left (-1) -> Yaw Left. Right (1) -> Yaw Right.
                // In 3D, positive Y rotation is CCW. So Left (-1) should be +1.

                // Axis 3 (Right Stick Y) - Pitch
                // Up (-1) -> Pitch Down (negative rotation X). Down (1) -> Pitch Up (positive rotation X)
                pitch = gp.axes[3];

                // Axis 2 (Right Stick X) - Roll
                // Left (-1) -> Roll Left. Right (1) -> Roll Right.
                roll = gp.axes[2];

                // Apply deadzone
                if (Math.abs(yaw) < 0.1) yaw = 0;
                if (Math.abs(pitch) < 0.1) pitch = 0;
                if (Math.abs(roll) < 0.1) roll = 0;

                // Gamepad Button for Mode Toggle (e.g. Button 0 - A/Cross)
                if (gp.buttons[0].pressed) {
                    // We need a debounce for gamepad too, but for now let's just rely on keyboard 'M' 
                    // or implement a simple debounce in main loop.
                    toggleMode = true;
                }
            }
        }

        // 2. Keyboard Input (Fallback/Override)
        // W/S: Throttle
        // A/D: Yaw
        // Arrows: Pitch/Roll

        if (this.gamepadIndex === null) {
            thrust = 0;
            if (this.keys['Space']) thrust = 1.0;
            if (this.keys['ShiftLeft']) thrust = 0.0; // Default 0

            // If we want granular keyboard control we need to accumulate values, but for now direct mapping
            if (this.keys['KeyW']) pitch = -1;
            if (this.keys['KeyS']) pitch = 1;

            if (this.keys['KeyA']) roll = -1;
            if (this.keys['KeyD']) roll = 1;

            if (this.keys['KeyQ']) yaw = 1;
            if (this.keys['KeyE']) yaw = -1;
        }

        return { thrust, yaw, pitch, roll, toggleMode };
    }
}
