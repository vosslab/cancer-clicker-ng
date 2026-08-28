import assert from "node:assert/strict";
import test from "node:test";

import { createGameUiState } from "../src/render/game_ui_state.ts";
import { scheduleTransientFeedbackExpiry } from "../src/render/game_reward_dock.tsx";

function manualClock(start = 1_000) {
  let now = start;
  return {
    clock: { now: () => now },
    advance(milliseconds) {
      now += milliseconds;
    },
  };
}

function inspectedEntity() {
  return {
    id: "hallmark:angiogenesis",
    kind: "Hallmark",
    title: "Inducing angiogenesis",
    summary: "Recruit nearby vessels into the colony's supply network.",
    details: [{ label: "Tradeoff", value: "ATP maintenance" }],
  };
}

test("UI state keeps evolution navigation and inspection outside durable game state", () => {
  const time = manualClock();
  const ui = createGameUiState({ clock: time.clock });
  const invoker = {
    isConnected: true,
    focus() {},
  };

  assert.equal(ui.activeEvolutionTab(), "stage");
  ui.setActiveEvolutionTab("prestige");
  assert.equal(ui.activeEvolutionTab(), "prestige");
  ui.openInspector(inspectedEntity(), invoker);
  assert.deepEqual(ui.inspector(), {
    isOpen: true,
    selectedEntity: inspectedEntity(),
    invoker,
  });
  assert.equal(ui.closeInspector(), invoker);
  assert.deepEqual(ui.inspector(), {
    isOpen: false,
    selectedEntity: undefined,
    invoker: undefined,
  });
});

test("transient feedback is concise, expires deterministically, and remains bounded", () => {
  const time = manualClock();
  const ui = createGameUiState({
    clock: time.clock,
    maxTransientFeedback: 2,
    defaultFeedbackDurationMs: 100,
  });

  ui.pushTransientFeedback({ message: "First", tone: "neutral" });
  ui.pushTransientFeedback({ message: "Second", tone: "success" });
  const newest = ui.pushTransientFeedback({ message: "Third", tone: "warning", durationMs: 50 });
  assert.deepEqual(
    ui.transientFeedback().map((item) => [item.id, item.message, item.tone]),
    [
      [2, "Second", "success"],
      [3, "Third", "warning"],
    ],
  );
  assert.equal(newest.expiresAtMs, 1_050);
  time.advance(50);
  ui.expireTransientFeedback();
  assert.deepEqual(
    ui.transientFeedback().map((item) => item.message),
    ["Second"],
  );
  assert.throws(() => ui.pushTransientFeedback({ message: "   " }), /requires a message/);
});

function fakeTimer(time) {
  let nextHandle = 1;
  const scheduled = new Map();
  const cancelled = [];
  return {
    timer: {
      now: time.clock.now,
      schedule(callback, delayMs) {
        const handle = nextHandle;
        nextHandle += 1;
        scheduled.set(handle, { callback, delayMs });
        return handle;
      },
      cancel(handle) {
        cancelled.push(handle);
        scheduled.delete(handle);
      },
    },
    cancelled,
    scheduled,
  };
}

test("feedback expiry schedules the earliest deadline and its callback removes only due feedback", () => {
  const time = manualClock();
  const ui = createGameUiState({ clock: time.clock, defaultFeedbackDurationMs: 100 });
  const fake = fakeTimer(time);
  ui.pushTransientFeedback({ message: "Later", durationMs: 90 });
  ui.pushTransientFeedback({ message: "Sooner", durationMs: 40 });

  const cancel = scheduleTransientFeedbackExpiry(ui, fake.timer);
  assert.equal(fake.scheduled.size, 1);
  assert.equal([...fake.scheduled.values()][0].delayMs, 40);
  const scheduled = [...fake.scheduled.values()][0];
  time.advance(scheduled.delayMs);
  scheduled.callback();
  assert.deepEqual(
    ui.transientFeedback().map((feedback) => feedback.message),
    ["Later"],
  );
  cancel?.();
  assert.deepEqual(fake.cancelled, [1]);
});
