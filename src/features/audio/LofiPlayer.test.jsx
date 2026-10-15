// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LofiPlayer from "./LofiPlayer";
const rain = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(),
  stop: vi.fn(),
}));
vi.mock("./useRainAudio", () => ({ useRainAudio: () => rain }));
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ videoId: "rFZHOHl-L8A", title: "Study radio" }),
      }),
  ),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("uses the official visible YouTube player and pauses it for alarms", async () => {
  let options;
  const player = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    setVolume: vi.fn(),
    destroy: vi.fn(),
    getPlayerState: () => 1,
  };
  vi.stubGlobal("YT", {
    Player: class {
      constructor(_host, config) {
        options = config;
        return player;
      }
    },
  });
  render(<LofiPlayer />);
  fireEvent.click(screen.getByRole("button", { name: "Play radio" }));
  await waitFor(() => expect(options?.videoId).toBe("rFZHOHl-L8A"));
  act(() => options.events.onReady({ target: player }));
  expect(player.playVideo).toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event("timer-alarm-start")));
  expect(player.pauseVideo).toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event("timer-alarm-end")));
  expect(player.playVideo).toHaveBeenCalledTimes(2);
  expect(
    screen.getByRole("link", { name: "Open official stream" }).href,
  ).toContain("rFZHOHl-L8A");
});
it("offers rain without a network and lets the user pause it", async () => {
  render(<LofiPlayer />);
  fireEvent.click(screen.getByRole("button", { name: "Rain ambience" }));
  expect(
    await screen.findByRole("button", { name: "Pause rain" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Pause rain" }));
  expect(screen.getByRole("button", { name: "Play rain" })).toBeTruthy();
  expect(rain.stop).toHaveBeenCalled();
});
