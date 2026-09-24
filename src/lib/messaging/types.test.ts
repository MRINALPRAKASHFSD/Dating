import { describe, expect, it } from "vitest";

import { toChatMessage, toConversationPhase, toMessageType } from "./types";
import type { MessageRow } from "./types";

describe("toMessageType", () => {
  it("preserves valid message types", () => {
    expect(toMessageType("text")).toBe("text");
    expect(toMessageType("deep_talk_prompt")).toBe("deep_talk_prompt");
    expect(toMessageType("deep_talk_response")).toBe("deep_talk_response");
    expect(toMessageType("system")).toBe("system");
  });

  it("falls back to text for unknown types", () => {
    expect(toMessageType("audio")).toBe("text");
    expect(toMessageType("unknown_variant")).toBe("text");
    expect(toMessageType("")).toBe("text");
  });
});

describe("toConversationPhase", () => {
  it("preserves valid phases", () => {
    expect(toConversationPhase("ice_breaker")).toBe("ice_breaker");
    expect(toConversationPhase("getting_to_know")).toBe("getting_to_know");
    expect(toConversationPhase("deep_talk")).toBe("deep_talk");
    expect(toConversationPhase("open")).toBe("open");
  });

  it("defaults to ice_breaker for invalid phase", () => {
    expect(toConversationPhase("invalid_phase")).toBe("ice_breaker");
    expect(toConversationPhase("")).toBe("ice_breaker");
  });
});

describe("toChatMessage", () => {
  it("converts database MessageRow to domain ChatMessage with default sent state", () => {
    const row: MessageRow = {
      id: "msg-123",
      conversation_id: "conv-456",
      sender_id: "usr-789",
      content: "Hello there",
      message_type: "text",
      deep_talk_prompt_id: null,
      read_at: null,
      created_at: "2026-09-24T12:00:00Z",
    };

    const chatMessage = toChatMessage(row);

    expect(chatMessage.id).toBe("msg-123");
    expect(chatMessage.conversationId).toBe("conv-456");
    expect(chatMessage.senderId).toBe("usr-789");
    expect(chatMessage.content).toBe("Hello there");
    expect(chatMessage.messageType).toBe("text");
    expect(chatMessage.state).toBe("sent");
  });

  it("allows setting custom optimistic state", () => {
    const row: MessageRow = {
      id: "msg-123",
      conversation_id: "conv-456",
      sender_id: "usr-789",
      content: "Sending...",
      message_type: "text",
      deep_talk_prompt_id: null,
      read_at: null,
      created_at: "2026-09-24T12:00:00Z",
    };

    const chatMessage = toChatMessage(row, "sending");
    expect(chatMessage.state).toBe("sending");
  });
});
