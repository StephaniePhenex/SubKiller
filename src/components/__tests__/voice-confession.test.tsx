import { Activity } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { ConfessView } from "@/components/receipt/ConfessView";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

const RECORDING_MS = 2000;
const PROCESSING_MS = 2000;

type MicMode = "grant" | "deny" | "pending";

function installMicrophone(mode: MicMode) {
  const stop = jest.fn();
  const stream = { getTracks: () => [{ stop, kind: "audio" as const }] };
  let release: (value: typeof stream) => void = () => {};
  const getUserMedia = jest.fn(
    () =>
      new Promise<typeof stream>((resolve, reject) => {
        if (mode === "deny") {
          reject(new DOMException("Permission denied", "NotAllowedError"));
          return;
        }
        if (mode === "pending") {
          release = resolve;
          return;
        }
        resolve(stream);
      }),
  );

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  return {
    getUserMedia,
    stop,
    grant() {
      release(stream);
    },
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function status() {
  return screen.getByRole("status");
}

function micButton(name: string) {
  return screen.getByRole("button", { name });
}

describe("voice confession state machine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockReset();
    jest.mocked(createClient).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("announces Ready, then Recording, then Processing, then opens Review", async () => {
    const mic = installMicrophone("grant");
    render(<ConfessView />);

    expect(status()).toHaveTextContent("Ready");
    expect(status()).toHaveAttribute("aria-live", "polite");

    fireEvent.click(micButton("Start voice input"));
    await flush();

    expect(mic.getUserMedia).toHaveBeenCalledTimes(1);
    expect(mic.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(status()).toHaveTextContent("Recording…");
    expect(micButton("Recording")).toBeDisabled();
    expect(micButton("Skip option to text")).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(RECORDING_MS);
    });

    expect(status()).toHaveTextContent("Processing…");
    expect(micButton("Processing")).toBeDisabled();
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(PROCESSING_MS);
    });

    expect(mic.stop).toHaveBeenCalledTimes(1);
    expect(mic.stop.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/review");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not start a second pass while recording or processing", async () => {
    const mic = installMicrophone("grant");
    render(<ConfessView />);

    fireEvent.click(micButton("Start voice input"));
    await flush();
    fireEvent.click(micButton("Recording"));

    await act(async () => {
      jest.advanceTimersByTime(RECORDING_MS);
    });
    fireEvent.click(micButton("Processing"));

    await act(async () => {
      jest.advanceTimersByTime(PROCESSING_MS);
    });

    expect(mic.getUserMedia).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("keeps the controls locked while microphone permission is in flight", async () => {
    const mic = installMicrophone("pending");
    render(<ConfessView />);

    fireEvent.click(micButton("Start voice input"));
    await flush();

    expect(status()).toHaveTextContent("Ready");
    expect(micButton("Start voice input")).toBeDisabled();
    expect(micButton("Skip option to text")).toBeDisabled();
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => {
      mic.grant();
      await Promise.resolve();
    });

    expect(status()).toHaveTextContent("Recording…");
  });

  it("stays on Ready when microphone permission is denied", async () => {
    installMicrophone("deny");
    render(<ConfessView />);

    fireEvent.click(micButton("Start voice input"));
    await flush();

    expect(status()).toHaveTextContent("Microphone blocked");
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(micButton("Start voice input")).toBeEnabled();
    expect(micButton("Skip option to text")).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("stays on Ready when the browser has no microphone API", async () => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    render(<ConfessView />);

    fireEvent.click(micButton("Start voice input"));
    await flush();

    expect(status()).toHaveTextContent("Microphone blocked");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("clears the pending pass and discards the open microphone on unmount", async () => {
    const mic = installMicrophone("grant");
    const { unmount } = render(<ConfessView />);

    fireEvent.click(micButton("Start voice input"));
    await flush();
    unmount();

    await act(async () => {
      jest.advanceTimersByTime(RECORDING_MS + PROCESSING_MS);
    });

    expect(mic.stop).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("returns to Ready when the page is shown again after the pass was cleared", async () => {
    const mic = installMicrophone("grant");
    const { rerender } = render(
      <Activity mode="visible">
        <ConfessView />
      </Activity>,
    );

    fireEvent.click(micButton("Start voice input"));
    await flush();
    expect(status()).toHaveTextContent("Recording…");

    rerender(
      <Activity mode="hidden">
        <ConfessView />
      </Activity>,
    );

    await act(async () => {
      jest.advanceTimersByTime(RECORDING_MS + PROCESSING_MS);
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mic.stop).toHaveBeenCalled();

    rerender(
      <Activity mode="visible">
        <ConfessView />
      </Activity>,
    );

    expect(status()).toHaveTextContent("Ready");
    expect(micButton("Start voice input")).toBeEnabled();
  });

  it("opens Review from the skip link without requesting the microphone", () => {
    const mic = installMicrophone("grant");
    render(<ConfessView />);

    fireEvent.click(micButton("Skip option to text"));

    expect(mic.getUserMedia).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/review");
  });
});
