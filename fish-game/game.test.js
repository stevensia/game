"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { FishGame } = require("./game.js");

function emptyGame() {
  const game = new FishGame(() => 0.5);
  game.start();
  game.fish = [];
  return game;
}

function offerFish(game, radius = 15) {
  game.fish = [{
    kind: "small", radius, x: game.player.x, y: game.player.y,
    baseY: game.player.y, vx: 0, phase: -game.elapsed * 1.25, color: 0
  }];
  return game.update(0.016);
}

function offerSchool(game) {
  game.fish = [{
    kind: "school", radius: 22, x: game.player.x, y: game.player.y,
    baseY: game.player.y, vx: 0, phase: -game.elapsed * 1.25, color: 0
  }];
  return game.update(0.016);
}

function offerCrab(game) {
  game.fish = [{
    kind: "crab", radius: 18, x: game.player.x, y: game.player.y,
    baseY: game.player.y, vx: 0, phase: -game.elapsed * 2.2, color: 0
  }];
  return game.update(0.016);
}

function offerBream(game) {
  game.fish = [{
    kind: "bream", radius: 21, x: game.player.x, y: game.player.y,
    baseY: game.player.y, vx: 0, phase: -game.elapsed * 1.25, color: 0
  }];
  return game.update(0.016);
}

test("ready screen is safe and start creates an attainable first fish", () => {
  const game = new FishGame(() => 0.5);
  const x = game.player.x;
  game.update(0.05, new Set(["ArrowRight"]));
  assert.equal(game.state, "ready");
  assert.equal(game.player.x, x);
  game.start();
  assert.equal(game.state, "playing");
  assert.equal(game.goal, 110);
  assert.equal(game.fish.length, 32);
  assert.ok(game.fish.filter(fish => fish.kind === "small").length >= 19);
  assert.equal(game.fish.filter(fish => fish.kind === "school").length, 2);
  assert.equal(game.fish.filter(fish => fish.kind === "crab").length, 3);
  assert.equal(game.fish.filter(fish => fish.kind === "bream").length, 3);
  assert.ok(game.fish.filter(fish => fish.kind === "crab").every(fish => fish.baseY >= 475));
  assert.ok(game.canEat(game.fish[0]));
  assert.equal(game.fish[0].baseY, game.player.y);
  for (const fish of game.fish.filter(fish => fish.kind === "big")) {
    assert.ok(Math.hypot(fish.x - game.player.x, fish.y - game.player.y) > 250);
  }
});

test("all arrow and WASD directions work and left changes facing", () => {
  for (const [key, axis, sign] of [
    ["ArrowRight", "x", 1], ["KeyD", "x", 1], ["ArrowLeft", "x", -1], ["KeyA", "x", -1],
    ["ArrowUp", "y", -1], ["KeyW", "y", -1], ["ArrowDown", "y", 1], ["KeyS", "y", 1]
  ]) {
    const game = emptyGame();
    const before = game.player[axis];
    game.update(0.05, new Set([key]));
    assert.ok((game.player[axis] - before) * sign > 0, key);
    if (axis === "x") assert.equal(game.player.facing, sign);
  }
});

test("the remora companion follows the player without affecting score or fish", () => {
  const game = emptyGame();
  const startX = game.companion.x;
  assert.equal(game.companion.kind, "remora");
  assert.ok(game.companion.x < game.player.x);
  for (let frame = 0; frame < 12; frame++) game.update(0.05, new Set(["ArrowRight"]));
  assert.ok(game.companion.x > startX);
  assert.ok(game.companion.x < game.player.x);
  assert.equal(game.companion.facing, 1);
  assert.equal(game.eaten, 0);
  assert.equal(game.fish.length, 0);

  game.player.x = game.width / 2;
  game.companion.x = game.player.x - 80;
  for (let frame = 0; frame < 30; frame++) game.update(0.05, new Set(["ArrowLeft"]));
  assert.equal(game.companion.facing, -1);
  assert.ok(game.companion.x > game.player.x);
});

test("diagonal swimming is no faster and opposite directions cancel", () => {
  const straight = emptyGame();
  const diagonal = emptyGame();
  straight.update(0.05, new Set(["ArrowRight"]));
  diagonal.update(0.05, new Set(["ArrowRight", "ArrowDown"]));
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - 245, diagonal.player.y - 280) - (straight.player.x - 245)) < 1e-8);
  const opposite = emptyGame();
  opposite.update(0.05, new Set(["ArrowLeft", "ArrowRight", "KeyW", "KeyS"]));
  assert.equal(opposite.player.x, 245);
  assert.equal(opposite.player.y, 280);
});

test("player stays inside all ocean edges, including after growth", () => {
  const game = emptyGame();
  for (const key of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) {
    for (let frame = 0; frame < 200; frame++) game.update(0.05, new Set([key]));
    assert.ok(game.player.x >= game.player.radius * 1.3 + 5);
    assert.ok(game.player.x <= game.width - game.player.radius * 1.3 - 5);
    assert.ok(game.player.y >= 65);
    assert.ok(game.player.y <= game.height - game.player.radius - 38);
  }
  for (let index = 0; index < 60; index++) offerFish(game);
  assert.equal(game.player.radius, 56);
  assert.ok(game.player.y <= game.height - game.player.radius - 38);
});

test("eating scores exactly once and respawns fish away from player", () => {
  const game = emptyGame();
  const events = offerFish(game);
  assert.equal(game.eaten, 1);
  assert.equal(events.filter(event => event.type === "eat").length, 1);
  assert.ok(game.fish[0].x < 0 || game.fish[0].x > game.width);
  game.update(0.016);
  assert.equal(game.eaten, 1);
});

test("a sardine school adds ten fish, respawns as a school and caps at the 110 goal", () => {
  const game = emptyGame();
  const firstEvents = offerSchool(game);
  const firstEat = firstEvents.find(event => event.type === "eat");
  assert.equal(game.eaten, 10);
  assert.equal(firstEat.amount, 10);
  assert.equal(firstEat.kind, "school");
  assert.equal(game.fish[0].kind, "school");
  assert.ok(firstEvents.some(event => event.type === "grow" && event.level === 2));

  game.eaten = 105;
  game.level = 4;
  game.player.radius = 56;
  const finalEvents = offerSchool(game);
  assert.equal(game.eaten, 110);
  assert.equal(finalEvents.find(event => event.type === "eat").amount, 5);
  assert.ok(finalEvents.some(event => event.type === "win"));
  assert.equal(game.state, "won");
});

test("a crab adds two fish, respawns as a crab and caps at the 110 goal", () => {
  const game = emptyGame();
  const firstEvents = offerCrab(game);
  const firstEat = firstEvents.find(event => event.type === "eat");
  assert.equal(game.eaten, 2);
  assert.equal(firstEat.amount, 2);
  assert.equal(firstEat.kind, "crab");
  assert.equal(game.fish[0].kind, "crab");
  assert.ok(game.fish[0].baseY >= 475);

  game.eaten = 109;
  game.level = 4;
  game.player.radius = 56;
  const finalEvents = offerCrab(game);
  assert.equal(game.eaten, 110);
  assert.equal(finalEvents.find(event => event.type === "eat").amount, 1);
  assert.ok(finalEvents.some(event => event.type === "win"));
  assert.equal(game.state, "won");
});

test("a sea bream adds one fish and respawns as a sea bream", () => {
  const game = emptyGame();
  const events = offerBream(game);
  const eat = events.find(event => event.type === "eat");
  assert.equal(game.eaten, 1);
  assert.equal(eat.amount, 1);
  assert.equal(eat.kind, "bream");
  assert.equal(game.fish[0].kind, "bream");
  assert.ok(game.fish[0].radius < game.player.radius);
});

test("growth at ten, thirty and sixty changes which fish can be eaten", () => {
  const game = emptyGame();
  assert.equal(game.canEat({ radius: 34 }), false);
  for (let index = 0; index < 9; index++) offerFish(game);
  assert.equal(game.level, 1);
  assert.ok(offerFish(game).some(event => event.type === "grow" && event.level === 2));
  assert.equal(game.player.radius, 38);
  assert.equal(game.canEat({ radius: 34 }), true);
  assert.equal(game.canEat({ radius: 44 }), false);
  for (let index = 0; index < 20; index++) offerFish(game);
  assert.equal(game.level, 3);
  assert.equal(game.player.radius, 48);
  assert.equal(game.canEat({ radius: 44 }), true);
  for (let index = 0; index < 30; index++) offerFish(game);
  assert.equal(game.level, 4);
  assert.equal(game.player.radius, 56);
  assert.equal(game.canEat({ radius: 59 }), false);
});

test("touching a bigger fish ends the round without changing the score", () => {
  const game = emptyGame();
  game.eaten = 3;
  assert.ok(offerFish(game, 65).some(event => event.type === "eaten"));
  assert.equal(game.eaten, 3);
  assert.equal(game.state, "lost");
  assert.equal(offerFish(game, 65).length, 0);
  assert.equal(game.eaten, 3);
});

test("pause freezes movement, fish and clock; resume preserves progress", () => {
  const game = new FishGame(() => 0.5);
  game.start();
  offerFish(game);
  game.pause();
  const before = JSON.stringify(game);
  assert.deepEqual(game.update(0.05, new Set(["ArrowRight"])), []);
  assert.equal(JSON.stringify(game), before);
  game.resume();
  game.update(0.05, new Set(["ArrowRight"]));
  assert.equal(game.eaten, 1);
  assert.equal(game.state, "playing");
});

test("one hundred and ten fish win once; a new round resets all gameplay state", () => {
  const game = emptyGame();
  for (let index = 0; index < 109; index++) {
    assert.ok(!offerFish(game).some(event => event.type === "win"));
  }
  assert.ok(offerFish(game).some(event => event.type === "win"));
  assert.equal(game.state, "won");
  assert.equal(game.eaten, 110);
  assert.equal(offerFish(game).length, 0);
  assert.equal(game.eaten, 110);
  game.start();
  assert.equal(game.state, "playing");
  assert.equal(game.level, 1);
  assert.equal(game.eaten, 0);
  assert.equal(game.player.radius, 28);
  assert.equal(game.fish.length, 32);
});

test("long or invalid frame intervals cannot teleport the player", () => {
  for (const dt of [100, Infinity, NaN, -1]) {
    const game = emptyGame();
    game.update(dt, new Set(["ArrowRight"]));
    assert.ok(game.player.x >= 245 && game.player.x <= 245 + 235 * 0.05);
  }
});

test("fish recycle at both boundaries instead of disappearing", () => {
  const game = emptyGame();
  const fish = { kind: "small", radius: 15, x: -100, baseY: 100, y: 100, vx: -30, phase: 0, color: 0 };
  game.fish = [fish];
  game.update(0.016);
  assert.ok(fish.x > game.width);
  fish.x = game.width + 100;
  fish.vx = 30;
  game.update(0.016);
  assert.ok(fish.x < 0);
});

test("compact ocean keeps fish readable and resizing preserves ongoing progress", () => {
  const game = new FishGame(() => 0.5);
  game.resize(480);
  assert.equal(game.fish.length, 19);
  assert.equal(game.fish.filter(fish => fish.kind === "school").length, 1);
  assert.equal(game.fish.filter(fish => fish.kind === "crab").length, 2);
  assert.equal(game.fish.filter(fish => fish.kind === "bream").length, 2);
  assert.equal(game.fish[0].baseY, game.player.y);
  assert.ok(game.fish.every(fish => fish.x > 0 && fish.x < game.width));
  game.start();
  offerFish(game);
  const x = game.player.x;
  const companionX = game.companion.x;
  game.resize(960);
  assert.equal(game.eaten, 1);
  assert.equal(game.state, "playing");
  assert.equal(game.player.x, x * 2);
  assert.equal(game.companion.x, companionX * 2);
  assert.equal(game.fish.length, 1);
  assert.ok(game.player.x < game.width);
});
