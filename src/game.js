export const GAME_DURATION_MS = 60_000;
export const AVATAR_TARGET = [2, 1, 3];
export const FRIDGE_CODE = "243";
export const PORTAL_START = [1, 1, 1, 1, 1, 1, 1, 1, 1];

export class GameModel {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.reset();
  }

  reset() {
    this.status = "idle";
    this.level = 0;
    this.remainingMs = GAME_DURATION_MS;
    this.endAt = null;
    this.avatars = [0, 0, 0];
    this.code = "";
    this.portal = [...PORTAL_START];
    this.selectedCell = 0;
    this.message = "";
  }

  start() {
    if (this.status !== "idle") return false;
    this.status = "running";
    this.level = 1;
    this.remainingMs = GAME_DURATION_MS;
    this.endAt = this.now() + this.remainingMs;
    return true;
  }

  tick() {
    if (this.status !== "running") return this.remainingMs;
    this.remainingMs = Math.max(0, this.endAt - this.now());
    if (this.remainingMs === 0) {
      this.status = "lost";
      this.message = "Время съел виртуальный хомяк.";
    }
    return this.remainingMs;
  }

  pause() {
    if (this.status !== "running") return false;
    this.tick();
    if (this.status !== "running") return false;
    this.status = "paused";
    this.endAt = null;
    return true;
  }

  resume() {
    if (this.status !== "paused") return false;
    this.status = "running";
    this.endAt = this.now() + this.remainingMs;
    return true;
  }

  cycleAvatar(index) {
    if (this.status !== "running" || this.level !== 1 || index < 0 || index > 2) return false;
    this.avatars[index] = (this.avatars[index] + 1) % 4;
    return true;
  }

  checkAvatars() {
    if (this.status !== "running" || this.level !== 1) return false;
    const correct = this.avatars.every((value, index) => value === AVATAR_TARGET[index]);
    this.message = correct ? "Аватары синхронизированы!" : "Эмоции не совпали. Крутим дальше!";
    if (correct) this.level = 2;
    return correct;
  }

  addDigit(digit) {
    if (this.status !== "running" || this.level !== 2 || !/^\d$/.test(digit) || this.code.length >= 3) return false;
    this.code += digit;
    return true;
  }

  eraseDigit() {
    if (this.status !== "running" || this.level !== 2 || !this.code) return false;
    this.code = this.code.slice(0, -1);
    return true;
  }

  checkCode() {
    if (this.status !== "running" || this.level !== 2 || this.code.length !== 3) return false;
    if (this.code === FRIDGE_CODE) {
      this.level = 3;
      this.message = "Холодильник отпустил банан. Логично.";
      return true;
    }
    this.code = "";
    this.message = "Холодильник неодобрительно булькнул.";
    return false;
  }

  moveSelection(dx, dy) {
    if (this.status !== "running" || this.level !== 3) return false;
    const row = Math.floor(this.selectedCell / 3);
    const col = this.selectedCell % 3;
    const nextRow = Math.max(0, Math.min(2, row + dy));
    const nextCol = Math.max(0, Math.min(2, col + dx));
    this.selectedCell = nextRow * 3 + nextCol;
    return true;
  }

  togglePortal(index = this.selectedCell) {
    if (this.status !== "running" || this.level !== 3 || index < 0 || index > 8) return false;
    const row = Math.floor(index / 3);
    const col = index % 3;
    [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 3 && c >= 0 && c < 3) {
        const cell = r * 3 + c;
        this.portal[cell] = this.portal[cell] ? 0 : 1;
      }
    });
    if (this.portal.every((cell) => cell === 0)) {
      this.tick();
      this.status = "won";
      this.message = "Котопортал стабилен. Кот доволен.";
    }
    return true;
  }

  snapshot() {
    this.tick();
    return {
      status: this.status,
      level: this.level,
      remainingMs: this.remainingMs,
      avatars: [...this.avatars],
      code: this.code,
      portal: [...this.portal],
      selectedCell: this.selectedCell,
      message: this.message
    };
  }
}
