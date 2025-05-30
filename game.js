class FlyingShip {
    constructor(sourcePlanet, targetPlanet, count) {
        this.sourceX = sourcePlanet.x;
        this.sourceY = sourcePlanet.y;
        this.targetX = targetPlanet.x;
        this.targetY = targetPlanet.y;
        this.x = sourcePlanet.x;
        this.y = sourcePlanet.y;
        this.count = count;
        this.owner = sourcePlanet.owner;
        this.progress = 0;
        this.isDestroyed = false;
        
        // Calculate total distance
        const dx = this.targetX - this.sourceX;
        const dy = this.targetY - this.sourceY;
        this.totalDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Set constant speed in pixels per second (reduced from 50 to 25)
        this.pixelsPerSecond = 25;
        
        // Calculate speed based on distance to maintain constant velocity
        this.speed = this.pixelsPerSecond / (this.totalDistance * 60);
        this.size = 10;

        // Store the connection for collision detection
        this.connection = {
            planet1: sourcePlanet,
            planet2: targetPlanet
        };
    }

    update() {
        if (this.isDestroyed) return true;

        this.progress += this.speed;
        if (this.progress >= 1) {
            return true; // Animation complete
        }

        // Calculate current position using linear interpolation
        this.x = this.sourceX + (this.targetX - this.sourceX) * this.progress;
        this.y = this.sourceY + (this.targetY - this.sourceY) * this.progress;
        return false;
    }

    // Check if this ship is on the same connection as another ship
    isOnSameConnection(otherShip) {
        return (this.connection.planet1 === otherShip.connection.planet1 && 
                this.connection.planet2 === otherShip.connection.planet2) ||
               (this.connection.planet1 === otherShip.connection.planet2 && 
                this.connection.planet2 === otherShip.connection.planet1);
    }

    // Check if this ship is close enough to another ship to battle
    isNearShip(otherShip, threshold = 20) {
        if (!this.isOnSameConnection(otherShip)) return false;
        
        // Calculate distance between ships
        const dx = this.x - otherShip.x;
        const dy = this.y - otherShip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < threshold;
    }

    // Handle battle with another ship
    battle(otherShip) {
        if (this.owner === otherShip.owner) return; // No battle between same owner
        
        // Both ships are destroyed, but the stronger one might leave some ships
        const totalShips = this.count + otherShip.count;
        const strongerShip = this.count > otherShip.count ? this : otherShip;
        const weakerShip = this.count > otherShip.count ? otherShip : this;
        
        // Calculate remaining ships for the stronger ship
        const remainingShips = Math.max(0, strongerShip.count - weakerShip.count);
        
        // Update the stronger ship's count and destroy the weaker one
        strongerShip.count = remainingShips;
        weakerShip.isDestroyed = true;
        
        // If no ships remain, destroy the stronger ship too
        if (remainingShips === 0) {
            strongerShip.isDestroyed = true;
        }
    }

    draw(ctx) {
        if (this.isDestroyed) return;

        // Calculate angle for the ship to point in the direction of movement
        const angle = Math.atan2(this.targetY - this.sourceY, this.targetX - this.sourceX);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Draw ship as a triangle
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size/2, -this.size/2);
        ctx.lineTo(-this.size/2, this.size/2);
        ctx.closePath();

        // Set color based on owner
        ctx.fillStyle = this.owner === 'player' ? '#4CAF50' : '#f44336';
        ctx.fill();

        // Draw ship count
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(-angle);
        ctx.fillText(this.count.toString(), 0, 0);

        ctx.restore();
    }
}

class PlanetConnection {
    constructor(planet1, planet2) {
        this.planet1 = planet1;
        this.planet2 = planet2;
    }

    draw(ctx) {
        // Draw only the dashed line, no background
        ctx.beginPath();
        ctx.setLineDash([10, 10]); // Longer dashes
        ctx.moveTo(this.planet1.x, this.planet1.y);
        ctx.lineTo(this.planet2.x, this.planet2.y);
        ctx.strokeStyle = '#FFFFFF'; // Solid white
        ctx.lineWidth = 1; // Thinner line (was 2)
        ctx.stroke();
        ctx.setLineDash([]); // Reset line style
    }

    // Check if a point is near the connection line
    isNearConnection(x, y, threshold = 10) {
        const x1 = this.planet1.x;
        const y1 = this.planet1.y;
        const x2 = this.planet2.x;
        const y2 = this.planet2.y;

        // Calculate distance from point to line segment
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq !== 0) {
            param = dot / len_sq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;

        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }

    // Check if this connection intersects with another connection
    intersects(otherConnection) {
        const x1 = this.planet1.x;
        const y1 = this.planet1.y;
        const x2 = this.planet2.x;
        const y2 = this.planet2.y;
        const x3 = otherConnection.planet1.x;
        const y3 = otherConnection.planet1.y;
        const x4 = otherConnection.planet2.x;
        const y4 = otherConnection.planet2.y;

        // Check if any of the planets are shared (connections to same planet)
        if (this.planet1 === otherConnection.planet1 || 
            this.planet1 === otherConnection.planet2 ||
            this.planet2 === otherConnection.planet1 || 
            this.planet2 === otherConnection.planet2) {
            return false;
        }

        // Calculate denominator
        const denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));

        // Lines are parallel if denominator is 0
        if (denominator === 0) {
            return false;
        }

        // Calculate intersection point
        const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
        const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;

        // Check if intersection point is within both line segments
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }
}

class Planet {
    constructor(x, y, radius, owner = null) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.owner = owner;
        this.spaceships = 0;
        this.selected = false;
        this.autoTransferTarget = null; // Planet to automatically send ships to
        this.autoTransferSource = null; // Planet that automatically sends ships to this one
    }

    draw(ctx) {
        // Draw planet
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Set planet color based on owner
        if (this.owner === 'player') {
            ctx.fillStyle = '#4CAF50';
        } else if (this.owner === 'ai') {
            ctx.fillStyle = '#f44336';
        } else {
            ctx.fillStyle = '#666';
        }
        
        ctx.fill();
        
        // Draw selection ring if selected
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw auto-transfer indicators
        if (this.owner) {
            if (this.autoTransferTarget) {
                // Draw arrow indicating outgoing transfer
                this.drawTransferArrow(ctx, this.autoTransferTarget, this.owner === 'player' ? '#4CAF50' : '#f44336');
            }
            if (this.autoTransferSource) {
                // Draw arrow indicating incoming transfer
                this.drawTransferArrow(ctx, this.autoTransferSource, this.owner === 'player' ? '#4CAF50' : '#f44336', true);
            }
        }

        // Draw spaceship count
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.spaceships.toString(), this.x, this.y);
    }

    drawTransferArrow(ctx, targetPlanet, color, isIncoming = false) {
        const arrowSize = 15;
        const dx = targetPlanet.x - this.x;
        const dy = targetPlanet.y - this.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate arrow position
        const arrowDistance = this.radius + 10;
        const arrowX = this.x + Math.cos(angle) * arrowDistance;
        const arrowY = this.y + Math.sin(angle) * arrowDistance;
        
        // Draw arrow
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle + (isIncoming ? Math.PI : 0));
        
        ctx.beginPath();
        ctx.moveTo(arrowSize, 0);
        ctx.lineTo(-arrowSize/2, -arrowSize/2);
        ctx.lineTo(-arrowSize/2, arrowSize/2);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.restore();
    }

    containsPoint(x, y) {
        const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return distance <= this.radius;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.planets = [];
        this.selectedPlanet = null;
        this.lastUpdate = Date.now();
        this.spaceshipGenerationInterval = 1000; // 1 second
        this.flyingShips = [];
        this.connections = [];
        this.lastAiAction = Date.now();
        this.aiActionCooldown = 2000; // 2 seconds cooldown for AI actions
        this.isDragging = false;
        this.dragStartPlanet = null;
        this.lastAutoTransfer = Date.now();
        this.autoTransferInterval = 5000; // 5 seconds between auto transfers

        // Set up canvas resize handling
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        this.handleResize(); // Initial size setup

        // Initialize game
        this.initializeGame();
        
        // Set up event listeners
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Start game loop
        this.gameLoop();
    }

    handleResize() {
        // Set canvas size to match container size
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // If game is already running, redraw everything
        if (this.planets.length > 0) {
            this.drawGameState();
        }
    }

    initializeGame() {
        // Create random number of planets between 40 and 50
        const planetCount = Math.floor(Math.random() * 11) + 40;
        const minDistance = Math.min(this.canvas.width, this.canvas.height) * 0.08; // Increased from 0.06 to 0.08 since we have fewer planets

        console.log('Creating game with', planetCount, 'planets');

        // Create player's first planet
        this.planets.push(new Planet(
            this.canvas.width * 0.25,  // 25% from left
            this.canvas.height * 0.5,  // Center vertically
            20,  // Slightly larger radius since we have fewer planets
            'player'
        ));
        this.planets[0].spaceships = 5;

        // Create AI's first planet
        this.planets.push(new Planet(
            this.canvas.width * 0.75,  // 75% from left
            this.canvas.height * 0.5,  // Center vertically
            20,  // Slightly larger radius since we have fewer planets
            'ai'
        ));
        this.planets[1].spaceships = 5;

        // Create neutral planets
        for (let i = 2; i < planetCount; i++) {
            let x, y;
            let validPosition = false;
            let attempts = 0;
            const maxAttempts = 300; // Reduced from 400 since we have fewer planets
            const margin = minDistance; // Use same margin as minDistance

            while (!validPosition && attempts < maxAttempts) {
                x = Math.random() * (this.canvas.width - 2 * margin) + margin;
                y = Math.random() * (this.canvas.height - 2 * margin) + margin;
                validPosition = true;

                for (const planet of this.planets) {
                    const distance = Math.sqrt((x - planet.x) ** 2 + (y - planet.y) ** 2);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                this.planets.push(new Planet(x, y, 20)); // Slightly larger radius for neutral planets
                console.log('Created neutral planet:', {
                    index: i,
                    x: x,
                    y: y
                });
            } else {
                console.warn('Could not find valid position for planet', i);
            }
        }

        // Create connections
        this.createPlanetConnections();
        
        // Verify initial state
        console.log('Initial game state:');
        for (const planet of this.planets) {
            const connectionCount = this.connections.filter(conn => 
                conn.planet1 === planet || conn.planet2 === planet
            ).length;

            console.log(`Planet at (${planet.x}, ${planet.y}):`, {
                owner: planet.owner,
                ships: planet.spaceships,
                connections: connectionCount
            });
        }

        this.updatePlanetCounts();
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const clickedPlanet = this.planets.find(planet => planet.containsPoint(x, y));
        
        // Count connections for logging
        const getConnectionCount = (planet) => {
            if (!planet) return 0;
            return this.connections.filter(conn => 
                conn.planet1 === planet || conn.planet2 === planet
            ).length;
        };

        console.log('Click event:', {
            x, y,
            clickedPlanet: clickedPlanet ? {
                x: clickedPlanet.x,
                y: clickedPlanet.y,
                owner: clickedPlanet.owner,
                ships: clickedPlanet.spaceships,
                connections: getConnectionCount(clickedPlanet)
            } : 'none',
            selectedPlanet: this.selectedPlanet ? {
                x: this.selectedPlanet.x,
                y: this.selectedPlanet.y,
                owner: this.selectedPlanet.owner,
                ships: this.selectedPlanet.spaceships,
                connections: getConnectionCount(this.selectedPlanet)
            } : 'none'
        });

        if (clickedPlanet) {
            if (this.selectedPlanet) {
                // If a planet is already selected
                if (this.selectedPlanet !== clickedPlanet) {
                    // Check if planets are connected
                    const areConnected = this.arePlanetsConnected(this.selectedPlanet, clickedPlanet);
                    console.log('Checking connection:', {
                        from: { x: this.selectedPlanet.x, y: this.selectedPlanet.y },
                        to: { x: clickedPlanet.x, y: clickedPlanet.y },
                        areConnected: areConnected
                    });

                    if (areConnected && this.selectedPlanet.spaceships > 0) {
                        console.log('Sending ships:', {
                            from: { x: this.selectedPlanet.x, y: this.selectedPlanet.y, ships: this.selectedPlanet.spaceships },
                            to: { x: clickedPlanet.x, y: clickedPlanet.y, ships: clickedPlanet.spaceships }
                        });
                        this.attackPlanet(this.selectedPlanet, clickedPlanet);
                    }
                }
                // Deselect the previous planet
                this.selectedPlanet.selected = false;
                this.selectedPlanet = null;
            }
            
            // Select the clicked planet if it's owned by the player
            if (clickedPlanet.owner === 'player') {
                console.log('Selecting player planet');
                clickedPlanet.selected = true;
                this.selectedPlanet = clickedPlanet;
            }
        } else {
            // Clicked empty space, deselect if something was selected
            if (this.selectedPlanet) {
                console.log('Deselecting planet');
                this.selectedPlanet.selected = false;
                this.selectedPlanet = null;
            }
        }
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const clickedPlanet = this.planets.find(planet => planet.containsPoint(x, y));
        if (clickedPlanet && clickedPlanet.owner === 'player') {
            this.isDragging = true;
            this.dragStartPlanet = clickedPlanet;
            clickedPlanet.selected = true;
        }
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Draw drag line
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGameState();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.dragStartPlanet.x, this.dragStartPlanet.y);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    handleMouseUp(event) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const targetPlanet = this.planets.find(planet => planet.containsPoint(x, y));
        
        if (targetPlanet && targetPlanet !== this.dragStartPlanet && 
            this.arePlanetsConnected(this.dragStartPlanet, targetPlanet)) {
            
            // Toggle auto-transfer mode
            if (this.dragStartPlanet.autoTransferTarget === targetPlanet) {
                // Disable auto-transfer
                this.dragStartPlanet.autoTransferTarget = null;
                targetPlanet.autoTransferSource = null;
            } else {
                // Enable auto-transfer
                this.dragStartPlanet.autoTransferTarget = targetPlanet;
                targetPlanet.autoTransferSource = this.dragStartPlanet;
            }
        }

        this.isDragging = false;
        this.dragStartPlanet.selected = false;
        this.dragStartPlanet = null;
    }

    arePlanetsConnected(planet1, planet2) {
        // Check if there's a connection in the game's connections array
        return this.connections.some(conn => 
            (conn.planet1 === planet1 && conn.planet2 === planet2) ||
            (conn.planet1 === planet2 && conn.planet2 === planet1)
        );
    }

    attackPlanet(sourcePlanet, targetPlanet) {
        console.log('Attack/Transfer attempt:', {
            source: { x: sourcePlanet.x, y: sourcePlanet.y, ships: sourcePlanet.spaceships },
            target: { x: targetPlanet.x, y: targetPlanet.y, ships: targetPlanet.spaceships }
        });

        if (sourcePlanet.spaceships > 0) {
            const attackingShips = sourcePlanet.spaceships;
            sourcePlanet.spaceships = 0;

            // Create flying ship animation
            const flyingShip = new FlyingShip(sourcePlanet, targetPlanet, attackingShips);
            this.flyingShips.push(flyingShip);
            console.log('Created flying ship with', attackingShips, 'ships');
        }
    }

    updatePlanetCounts() {
        const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
        const aiPlanets = this.planets.filter(p => p.owner === 'ai').length;
        
        document.getElementById('playerPlanetCount').textContent = playerPlanets;
        document.getElementById('aiPlanetCount').textContent = aiPlanets;
    }

    updateSpaceships() {
        const now = Date.now();
        if (now - this.lastUpdate >= this.spaceshipGenerationInterval) {
            // Generate spaceships for all owned planets
            for (const planet of this.planets) {
                if (planet.owner) {
                    planet.spaceships++;
                }
            }
            this.lastUpdate = now;
        }
    }

    aiTurn() {
        const now = Date.now();
        let actionsPerformed = 0;
        const MAX_ACTIONS = 3;
        
        // Check for immediate attack opportunities (bypassing cooldown)
        const aiPlanetsWithShips = this.planets.filter(p => p.owner === 'ai' && p.spaceships > 0);
        const enemyPlanets = this.planets.filter(p => p.owner === 'player');
        
        // Look for AI planets connected to enemy planets
        for (const aiPlanet of aiPlanetsWithShips) {
            if (actionsPerformed >= MAX_ACTIONS) break;
            
            for (const enemyPlanet of enemyPlanets) {
                if (actionsPerformed >= MAX_ACTIONS) break;
                
                if (this.arePlanetsConnected(aiPlanet, enemyPlanet)) {
                    // If AI planet has enough ships to win, attack immediately
                    if (aiPlanet.spaceships > enemyPlanet.spaceships) {
                        console.log('Immediate attack opportunity:', {
                            from: { x: aiPlanet.x, y: aiPlanet.y, ships: aiPlanet.spaceships },
                            to: { x: enemyPlanet.x, y: enemyPlanet.y, ships: enemyPlanet.spaceships }
                        });
                        this.attackPlanet(aiPlanet, enemyPlanet);
                        actionsPerformed++;
                        break; // Move to next AI planet after successful attack
                    }
                }
            }
        }

        // Regular AI turn logic (with cooldown)
        if (now - this.lastAiAction < this.aiActionCooldown) return;

        // Get all AI planets that have ships
        const aiPlanets = this.planets.filter(p => p.owner === 'ai' && p.spaceships > 0);
        if (aiPlanets.length === 0) {
            this.lastAiAction = now;
            return;
        }

        // Count planets
        const totalPlanets = this.planets.length;
        const aiPlanetCount = this.planets.filter(p => p.owner === 'ai').length;
        const playerPlanetCount = this.planets.filter(p => p.owner === 'player').length;
        const neutralPlanetCount = this.planets.filter(p => p.owner === null).length;

        // Calculate AI's planet ownership percentage
        const aiOwnershipPercentage = (aiPlanetCount / totalPlanets) * 100;
        console.log('AI Status:', {
            ownership: aiOwnershipPercentage.toFixed(1) + '%',
            aiPlanets: aiPlanetCount,
            playerPlanets: playerPlanetCount,
            neutralPlanets: neutralPlanetCount,
            totalPlanets: totalPlanets,
            aiPlanetsWithShips: aiPlanets.length,
            actionsPerformed: actionsPerformed
        });

        // Get all player planets
        const playerPlanets = this.planets.filter(p => p.owner === 'player');
        if (playerPlanets.length === 0) {
            console.log('No player planets to attack');
            this.lastAiAction = now;
            return;
        }

        // Find the most strategic player planet to attack (one with most connections)
        const playerPlanetValues = playerPlanets.map(planet => ({
            planet,
            value: this.connections.filter(conn => 
                conn.planet1 === planet || conn.planet2 === planet
            ).length
        }));
        playerPlanetValues.sort((a, b) => b.value - a.value);
        const targetPlayerPlanet = playerPlanetValues[0].planet;

        // Find AI planets that can reach the target
        const attackingPlanets = aiPlanets.filter(p => 
            this.arePlanetsConnected(p, targetPlayerPlanet)
        );

        // First, try to expand to neutral planets if available
        const neutralPlanets = this.planets.filter(p => p.owner === null);
        if (neutralPlanets.length > 0 && actionsPerformed < MAX_ACTIONS) {
            // Find AI planets that can reach neutral planets
            const expansionOptions = [];
            for (const aiPlanet of aiPlanets) {
                for (const neutralPlanet of neutralPlanets) {
                    if (this.arePlanetsConnected(aiPlanet, neutralPlanet)) {
                        const connectionCount = this.connections.filter(conn => 
                            conn.planet1 === neutralPlanet || conn.planet2 === neutralPlanet
                        ).length;
                        // Prioritize planets that are closer to player planets
                        const distanceToPlayer = Math.sqrt(
                            Math.pow(neutralPlanet.x - targetPlayerPlanet.x, 2) + 
                            Math.pow(neutralPlanet.y - targetPlayerPlanet.y, 2)
                        );
                        const value = connectionCount * 2 + aiPlanet.spaceships - distanceToPlayer;
                        expansionOptions.push({
                            source: aiPlanet,
                            target: neutralPlanet,
                            value: value
                        });
                    }
                }
            }

            if (expansionOptions.length > 0) {
                expansionOptions.sort((a, b) => b.value - a.value);
                const bestOption = expansionOptions[0];
                
                if (bestOption.source.spaceships > bestOption.target.spaceships) {
                    console.log('AI expanding to neutral planet:', {
                        from: { x: bestOption.source.x, y: bestOption.source.y, ships: bestOption.source.spaceships },
                        to: { x: bestOption.target.x, y: bestOption.target.y, ships: bestOption.target.spaceships },
                        value: bestOption.value
                    });
                    this.attackPlanet(bestOption.source, bestOption.target);
                    actionsPerformed++;
                }
            }
        }

        // Set up automatic transfers for all AI planets
        // First, find the best accumulation point (AI planet closest to target player planet)
        const bestAccumulationPlanet = attackingPlanets.length > 0 ? 
            attackingPlanets.reduce((best, current) => {
                const bestDist = Math.sqrt(
                    Math.pow(best.x - targetPlayerPlanet.x, 2) + 
                    Math.pow(best.y - targetPlayerPlanet.y, 2)
                );
                const currentDist = Math.sqrt(
                    Math.pow(current.x - targetPlayerPlanet.x, 2) + 
                    Math.pow(current.y - targetPlayerPlanet.y, 2)
                );
                return currentDist < bestDist ? current : best;
            }) : null;

        if (bestAccumulationPlanet && actionsPerformed < MAX_ACTIONS) {
            console.log('Setting up aggressive auto-transfers toward player planet:', {
                targetPlayerPlanet: {
                    x: targetPlayerPlanet.x,
                    y: targetPlayerPlanet.y,
                    ships: targetPlayerPlanet.spaceships
                },
                accumulationPlanet: {
                    x: bestAccumulationPlanet.x,
                    y: bestAccumulationPlanet.y,
                    ships: bestAccumulationPlanet.spaceships
                }
            });

            // Clear any existing auto-transfers
            for (const planet of this.planets) {
                if (planet.owner === 'ai') {
                    planet.autoTransferTarget = null;
                    planet.autoTransferSource = null;
                }
            }

            // Set up new auto-transfers from all AI planets to the accumulation point
            let transferSetups = 0;
            for (const sourcePlanet of aiPlanets) {
                if (sourcePlanet !== bestAccumulationPlanet && 
                    this.arePlanetsConnected(sourcePlanet, bestAccumulationPlanet)) {
                    console.log('Setting up transfer from planet:', {
                        x: sourcePlanet.x,
                        y: sourcePlanet.y,
                        ships: sourcePlanet.spaceships
                    });
                    sourcePlanet.autoTransferTarget = bestAccumulationPlanet;
                    bestAccumulationPlanet.autoTransferSource = sourcePlanet;
                    transferSetups++;
                }
            }

            // If we have enough ships at the accumulation point, attack the player planet
            if (bestAccumulationPlanet.spaceships >= targetPlayerPlanet.spaceships * 1.5) {
                console.log('Launching attack from accumulation point:', {
                    from: {
                        x: bestAccumulationPlanet.x,
                        y: bestAccumulationPlanet.y,
                        ships: bestAccumulationPlanet.spaceships
                    },
                    to: {
                        x: targetPlayerPlanet.x,
                        y: targetPlayerPlanet.y,
                        ships: targetPlayerPlanet.spaceships
                    }
                });
                this.attackPlanet(bestAccumulationPlanet, targetPlayerPlanet);
                actionsPerformed++;
            }

            console.log('Set up', transferSetups, 'auto-transfers for aggressive attack');
        }

        this.lastAiAction = now;
    }

    updateFlyingShips() {
        // Check for battles between ships
        for (let i = 0; i < this.flyingShips.length; i++) {
            for (let j = i + 1; j < this.flyingShips.length; j++) {
                const ship1 = this.flyingShips[i];
                const ship2 = this.flyingShips[j];
                
                if (!ship1.isDestroyed && !ship2.isDestroyed && ship1.isNearShip(ship2)) {
                    ship1.battle(ship2);
                }
            }
        }

        // Update all flying ships and handle arrivals
        for (let i = this.flyingShips.length - 1; i >= 0; i--) {
            const ship = this.flyingShips[i];
            
            // Remove destroyed ships
            if (ship.isDestroyed) {
                this.flyingShips.splice(i, 1);
                continue;
            }

            const isComplete = ship.update();

            if (isComplete) {
                // Only process arrival if the ship wasn't destroyed
                if (!ship.isDestroyed) {
                    // Find the target planet
                    const targetPlanet = this.planets.find(p => 
                        Math.abs(p.x - ship.targetX) < 1 && Math.abs(p.y - ship.targetY) < 1
                    );

                    if (targetPlanet) {
                        if (targetPlanet.owner === ship.owner) {
                            // If same owner, just add ships
                            targetPlanet.spaceships += ship.count;
                        } else {
                            // If different owner, battle occurs
                            if (ship.count > targetPlanet.spaceships) {
                                // Attacker wins
                                targetPlanet.owner = ship.owner;
                                targetPlanet.spaceships = ship.count - targetPlanet.spaceships;
                            } else if (ship.count < targetPlanet.spaceships) {
                                // Defender wins
                                targetPlanet.spaceships -= ship.count;
                            } else {
                                // Tie - both lose all ships
                                targetPlanet.spaceships = 0;
                            }
                        }
                        this.updatePlanetCounts();
                    }
                }

                // Remove the completed flying ship
                this.flyingShips.splice(i, 1);
            }
        }
    }

    drawGameState() {
        // Clear the entire canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        for (const connection of this.connections) {
            connection.draw(this.ctx);
        }

        // Draw planets
        for (const planet of this.planets) {
            planet.draw(this.ctx);
        }

        // Draw flying ships
        for (const ship of this.flyingShips) {
            ship.draw(this.ctx);
        }
    }

    gameLoop() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update game state
        this.updateSpaceships();
        this.updateFlyingShips();
        
        // Handle automatic transfers
        this.processAutoTransfers();

        // AI turn
        this.aiTurn();

        // Draw game state
        this.drawGameState();

        // Check for game over
        const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
        const aiPlanets = this.planets.filter(p => p.owner === 'ai').length;
        
        if (playerPlanets === 0 || aiPlanets === 0) {
            const winner = playerPlanets === 0 ? 'AI' : 'Player';
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${winner} Wins!`, this.canvas.width / 2, this.canvas.height / 2);
            return;
        }

        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    processAutoTransfers() {
        const now = Date.now();
        if (now - this.lastAutoTransfer >= this.autoTransferInterval) {
            for (const planet of this.planets) {
                if (planet.owner && planet.autoTransferTarget && planet.spaceships > 0) {
                    this.attackPlanet(planet, planet.autoTransferTarget);
                }
            }
            this.lastAutoTransfer = now;
        }
    }

    createPlanetConnections() {
        // Clear existing connections
        this.connections = [];

        // Create a list of all possible connections with their distances
        const possibleConnections = [];
        for (let i = 0; i < this.planets.length; i++) {
            for (let j = i + 1; j < this.planets.length; j++) {
                const planet1 = this.planets[i];
                const planet2 = this.planets[j];
                const distance = Math.sqrt(
                    Math.pow(planet2.x - planet1.x, 2) + 
                    Math.pow(planet2.y - planet1.y, 2)
                );
                possibleConnections.push({
                    planet1,
                    planet2,
                    distance
                });
            }
        }

        // Sort connections by distance (shortest first)
        possibleConnections.sort((a, b) => a.distance - b.distance);

        // Create a minimum spanning tree first to ensure all planets are connected
        const connectedPlanets = new Set([this.planets[0]]);
        const unconnectedPlanets = new Set(this.planets.slice(1));

        while (unconnectedPlanets.size > 0) {
            let bestConnection = null;
            let minDistance = Infinity;

            // Find the shortest connection between connected and unconnected planets
            for (const conn of possibleConnections) {
                const isConnected1 = connectedPlanets.has(conn.planet1);
                const isConnected2 = connectedPlanets.has(conn.planet2);
                
                if ((isConnected1 && !isConnected2) || (!isConnected1 && isConnected2)) {
                    if (conn.distance < minDistance) {
                        bestConnection = conn;
                        minDistance = conn.distance;
                    }
                }
            }

            if (bestConnection) {
                this.addConnection(bestConnection.planet1, bestConnection.planet2);
                connectedPlanets.add(bestConnection.planet1);
                connectedPlanets.add(bestConnection.planet2);
                unconnectedPlanets.delete(bestConnection.planet1);
                unconnectedPlanets.delete(bestConnection.planet2);
            }
        }

        // Add additional connections that don't create intersections
        const maxAdditionalConnections = Math.floor(this.planets.length * 0.3); // Reduced from 0.5 to 0.3 to prevent too many connections
        let additionalConnections = 0;

        for (const conn of possibleConnections) {
            // Skip if planets are already connected
            if (this.arePlanetsConnected(conn.planet1, conn.planet2)) {
                continue;
            }

            // Check if this connection would intersect with any existing connection
            const wouldIntersect = this.connections.some(existingConn => {
                const newConn = new PlanetConnection(conn.planet1, conn.planet2);
                return newConn.intersects(existingConn);
            });

            if (!wouldIntersect) {
                this.addConnection(conn.planet1, conn.planet2);
                additionalConnections++;
                
                if (additionalConnections >= maxAdditionalConnections) {
                    break;
                }
            }
        }

        // Verify all connections
        console.log('Final connection state:');
        for (const connection of this.connections) {
            console.log('Connection:', {
                from: { x: connection.planet1.x, y: connection.planet1.y },
                to: { x: connection.planet2.x, y: connection.planet2.y }
            });
        }
    }

    addConnection(planet1, planet2) {
        // Only add the connection to the game's connections array
        const connection = new PlanetConnection(planet1, planet2);
        this.connections.push(connection);
        console.log('Added connection between planets:', {
            planet1: { x: planet1.x, y: planet1.y },
            planet2: { x: planet2.x, y: planet2.y }
        });
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 