import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GAME_DURATION_MS, AVATAR_TARGET, FRIDGE_CODE } from "../src/game.js";

function setup() { let time = 1000; const game = new GameModel(() => time); return { game, advance: (ms) => { time += ms; } }; }

test("начальное состояние и чистый старт", () => {
  const { game } = setup();
  assert.equal(game.status, "idle"); assert.equal(game.level, 0); assert.equal(game.remainingMs, GAME_DURATION_MS);
  assert.equal(game.start(), true); assert.equal(game.status, "running"); assert.equal(game.level, 1);
});

test("пауза полностью замораживает таймер", () => {
  const { game, advance } = setup(); game.start(); advance(10_000); game.pause();
  assert.equal(game.remainingMs, 50_000); advance(25_000); game.tick(); assert.equal(game.remainingMs, 50_000);
  game.resume(); advance(5_000); game.tick(); assert.equal(game.remainingMs, 45_000);
});

test("таймер проигрывает ровно по истечении минуты", () => {
  const { game, advance } = setup(); game.start(); advance(59_999); game.tick(); assert.equal(game.status, "running");
  advance(1); game.tick(); assert.equal(game.status, "lost"); assert.equal(game.remainingMs, 0);
});

test("три головоломки ведут к победе", () => {
  const { game } = setup(); game.start(); AVATAR_TARGET.forEach((target, i) => { for (let n=0;n<target;n++) game.cycleAvatar(i); });
  assert.equal(game.checkAvatars(), true); assert.equal(game.level, 2);
  [...FRIDGE_CODE].forEach((digit) => game.addDigit(digit)); assert.equal(game.checkCode(), true); assert.equal(game.level, 3);
  // Решение стартовой позиции, найденное для правила «крест».
  [0,2,4,6,8].forEach((cell) => game.togglePortal(cell));
  assert.equal(game.status, "won"); assert.ok(game.portal.every((cell) => cell === 0));
});

test("неверный код очищается, а ввод на паузе игнорируется", () => {
  const { game } = setup(); game.start(); game.avatars = [...AVATAR_TARGET]; game.checkAvatars();
  ["1","1","1"].forEach((digit) => game.addDigit(digit)); assert.equal(game.checkCode(), false); assert.equal(game.code, "");
  game.pause(); assert.equal(game.addDigit("2"), false); assert.equal(game.code, "");
});

test("перезапуск не переносит прогресс", () => {
  const { game } = setup(); game.start(); game.cycleAvatar(0); game.code = "99"; game.reset();
  assert.deepEqual(game.avatars, [0,0,0]); assert.equal(game.code, ""); assert.equal(game.level, 0); assert.equal(game.status, "idle");
});
