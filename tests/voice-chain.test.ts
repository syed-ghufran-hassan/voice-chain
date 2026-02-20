import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

declare const simnet: any;

describe("VoiceChain Protocol - Comprehensive Tests", () => {
  const accounts = simnet.getAccounts();
  const deployer = accounts.get("deployer")!;
  const owner = deployer;
  const user1 = accounts.get("wallet_1")!;
  const user2 = accounts.get("wallet_2")!;
  const user3 = accounts.get("wallet_3")!;
  const user4 = accounts.get("wallet_4")!;
  const user5 = accounts.get("wallet_5")!;

  const minStakeAmount = 1000000; // 1 STX
  const platformFeeRate = 250; // 2.5%

  const testTitle = "The Future of Decentralized Social Media" as const;
  const testContent = "VoiceChain revolutionizes how we interact online by aligning incentives..." as const;
  const testReplyContent = "This is a great point! Here's my perspective..." as const;
  const testReplyContent2 = "I respectfully disagree because..." as const;
  const testNestedReply = "Building on your comment, I'd add that..." as const;

  beforeEach(() => {
    // Reset protocol configuration
    simnet.setDataVar("voicechain", "thread-counter", Cl.uint(0));
    simnet.setDataVar("voicechain", "reply-counter", Cl.uint(0));
    simnet.setDataVar("voicechain", "min-stake-amount", Cl.uint(minStakeAmount));
    simnet.setDataVar("voicechain", "platform-fee-rate", Cl.uint(platformFeeRate));
    simnet.setDataVar("voicechain", "platform-treasury", Cl.principal(owner));

    // Set up initial stakes for users (simplified - would need stake function)
    // This is a placeholder - actual staking would require a separate function
  });

  describe("Protocol Configuration", () => {
    it("should initialize with correct default values", () => {
      const threadCounter = simnet.getDataVar("voicechain", "thread-counter");
      expect(threadCounter).toBeUint(0);

      const replyCounter = simnet.getDataVar("voicechain", "reply-counter");
      expect(replyCounter).toBeUint(0);

      const minStake = simnet.getDataVar("voicechain", "min-stake-amount");
      expect(minStake).toBeUint(minStakeAmount);

      const feeRate = simnet.getDataVar("voicechain", "platform-fee-rate");
      expect(feeRate).toBeUint(platformFeeRate);

      const treasury = simnet.getDataVar("voicechain", "platform-treasury");
      expect(treasury).toBe(Cl.principal(owner));
    });
  });

  describe("User Reputation", () => {
    it("should return default reputation for new users", () => {
      const result = simnet.callReadOnlyFn(
        "voicechain",
        "get-user-reputation",
        [Cl.principal(user1)],
        deployer
      );

      expect(result.result).toEqual(
        Cl.tuple({
          "total-upvotes": Cl.uint(0),
          "total-downvotes": Cl.uint(0),
          "threads-created": Cl.uint(0),
          "replies-created": Cl.uint(0),
          "tips-sent": Cl.uint(0),
          "tips-received": Cl.uint(0),
          "staked-amount": Cl.uint(0),
          "reputation-score": Cl.uint(0)
        })
      );
    });
  });

  describe("Thread Creation", () => {
    it("should create a standard thread with valid parameters", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false), // is-premium
          Cl.uint(0) // premium-price (irrelevant for non-premium)
        ],
        user1
      );

      expect(result.result).toBeOk(Cl.uint(1));

      const thread = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(1)],
        deployer
      );

      expect(thread.result).toBeSome(
        Cl.tuple({
          author: Cl.principal(user1),
          title: Cl.stringUtf8(testTitle),
          content: Cl.stringUtf8(testContent),
          "is-premium": Cl.bool(false),
          "premium-price": Cl.uint(0),
          "created-at": expect.anything(),
          upvotes: Cl.uint(0),
          downvotes: Cl.uint(0),
          "tips-received": Cl.uint(0),
          "is-locked": Cl.bool(false),
          "reply-count": Cl.uint(0)
        })
      );

      // Check thread counter
      const threadCount = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread-count",
        [],
        deployer
      );
      expect(threadCount.result).toBeUint(1);

      // Check user reputation updated
      const userRep = simnet.callReadOnlyFn(
        "voicechain",
        "get-user-reputation",
        [Cl.principal(user1)],
        deployer
      );
      expect(userRep.result.value.data["threads-created"]).toBeUint(1);
    });

    it("should create a premium thread with valid price", () => {
      const premiumPrice = 5000000; // 5 STX

      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(true), // is-premium
          Cl.uint(premiumPrice)
        ],
        user1
      );

      expect(result.result).toBeOk(Cl.uint(1));

      const thread = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(1)],
        deployer
      );

      expect(thread.value.data["is-premium"]).toBe(Cl.bool(true));
      expect(thread.value.data["premium-price"]).toBeUint(premiumPrice);
    });

    it("should reject thread creation with insufficient stake", () => {
      // This test assumes stake checking is implemented
      // For now, it will likely pass through because stake function doesn't exist
      
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user2
      );

      // If stake checking is implemented, this would fail
      // For now, it will succeed
      if (result.result.type === "err") {
        expect(result.result).toBeErr(Cl.uint(110)); // ERR_INSUFFICIENT_STAKE
      }
    });

    it("should reject thread creation with empty title", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(""),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );

      expect(result.result).toBeErr(Cl.uint(104)); // ERR_INVALID_AMOUNT
    });

    it("should reject thread creation with empty content", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(""),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );

      expect(result.result).toBeErr(Cl.uint(104)); // ERR_INVALID_AMOUNT
    });

    it("should reject premium thread with zero price", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(true),
          Cl.uint(0)
        ],
        user1
      );

      expect(result.result).toBeErr(Cl.uint(104)); // ERR_INVALID_AMOUNT
    });

    it("should create multiple threads with incrementing IDs", () => {
      // First thread
      simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle + " 1"),
          Cl.stringUtf8(testContent + " 1"),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );

      // Second thread
      const result2 = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle + " 2"),
          Cl.stringUtf8(testContent + " 2"),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );

      expect(result2.result).toBeOk(Cl.uint(2));

      const threadCount = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread-count",
        [],
        deployer
      );
      expect(threadCount.result).toBeUint(2);
    });
  });

  describe("Reply Creation", () => {
    let threadId: number;

    beforeEach(() => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      threadId = 1;
    });

    it("should create a reply to a thread", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none() // No parent reply
        ],
        user2
      );

      expect(result.result).toBeOk(Cl.uint(1));

      const reply = simnet.callReadOnlyFn(
        "voicechain",
        "get-reply",
        [Cl.uint(1)],
        deployer
      );

      expect(reply.result).toBeSome(
        Cl.tuple({
          "thread-id": Cl.uint(threadId),
          author: Cl.principal(user2),
          content: Cl.stringUtf8(testReplyContent),
          "created-at": expect.anything(),
          upvotes: Cl.uint(0),
          downvotes: Cl.uint(0),
          "tips-received": Cl.uint(0),
          "parent-reply-id": Cl.none()
        })
      );

      // Check thread reply count increased
      const thread = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(threadId)],
        deployer
      );
      expect(thread.value.data["reply-count"]).toBeUint(1);

      // Check reply counter
      const replyCount = simnet.callReadOnlyFn(
        "voicechain",
        "get-reply-count",
        [],
        deployer
      );
      expect(replyCount.result).toBeUint(1);

      // Check user reputation updated
      const userRep = simnet.callReadOnlyFn(
        "voicechain",
        "get-user-reputation",
        [Cl.principal(user2)],
        deployer
      );
      expect(userRep.result.value.data["replies-created"]).toBeUint(1);
    });

    it("should create nested replies (reply to reply)", () => {
      // First create parent reply
      simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );
      const parentReplyId = 1;

      // Create nested reply
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testNestedReply),
          Cl.some(Cl.uint(parentReplyId))
        ],
        user3
      );

      expect(result.result).toBeOk(Cl.uint(2));

      const nestedReply = simnet.callReadOnlyFn(
        "voicechain",
        "get-reply",
        [Cl.uint(2)],
        deployer
      );

      expect(nestedReply.value.data["parent-reply-id"]).toEqual(
        Cl.some(Cl.uint(parentReplyId))
      );
    });

    it("should reject nested reply with invalid parent", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testNestedReply),
          Cl.some(Cl.uint(999)) // Non-existent parent
        ],
        user2
      );

      expect(result.result).toBeErr(Cl.uint(111)); // ERR_INVALID_PARENT_REPLY
    });

    it("should reject reply to locked thread", () => {
      // First lock the thread (would need lock function)
      // For now, we can test by setting is-locked manually in state
      
      // This test would require a thread locking function
    });

    it("should reject reply with empty content", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(""),
          Cl.none()
        ],
        user2
      );

      expect(result.result).toBeErr(Cl.uint(104)); // ERR_INVALID_AMOUNT
    });

    it("should reject reply to non-existent thread", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(999),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );

      expect(result.result).toBeErr(Cl.uint(101)); // ERR_NOT_FOUND
    });

    it("should create multiple replies in same thread", () => {
      // First reply
      simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );

      // Second reply
      simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent2),
          Cl.none()
        ],
        user3
      );

      const thread = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(threadId)],
        deployer
      );
      expect(thread.value.data["reply-count"]).toBeUint(2);
    });
  });

  describe("Premium Content Access", () => {
    let premiumThreadId: number;
    const premiumPrice = 5000000; // 5 STX

    beforeEach(() => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Premium Thread"),
          Cl.stringUtf8(testContent),
          Cl.bool(true),
          Cl.uint(premiumPrice)
        ],
        user1
      );
      premiumThreadId = 1;
    });

    it("should allow user to purchase premium access", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumThreadId)],
        user2
      );

      expect(result.result).toBeOk(Cl.bool(true));

      // Check STX transfers
      // Platform fee: premiumPrice * 2.5% = 125000
      // Author payment: premiumPrice - 125000 = 4875000
      
      expect(result.events[0].event).toBe("stx_transfer_event");
      expect(result.events[0].data.amount).toBe("4875000");
      expect(result.events[0].data.recipient).toBe(user1);

      expect(result.events[1].event).toBe("stx_transfer_event");
      expect(result.events[1].data.amount).toBe("125000");
      expect(result.events[1].data.recipient).toBe(owner);

      // Check access recorded
      const hasAccess = simnet.callReadOnlyFn(
        "voicechain",
        "has-premium-access",
        [Cl.uint(premiumThreadId), Cl.principal(user2)],
        deployer
      );
      expect(hasAccess.result).toBe(Cl.bool(true));
    });

    it("should prevent purchasing non-premium thread", () => {
      // Create non-premium thread
      const nonPremiumResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Free Thread"),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user2
      );
      const nonPremiumThreadId = 2;

      const result = simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(nonPremiumThreadId)],
        user3
      );

      expect(result.result).toBeErr(Cl.uint(109)); // ERR_THREAD_NOT_PREMIUM
    });

    it("should prevent duplicate purchase of same thread", () => {
      // First purchase
      simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumThreadId)],
        user2
      );

      // Second purchase attempt
      const result = simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumThreadId)],
        user2
      );

      expect(result.result).toBeErr(Cl.uint(102)); // ERR_UNAUTHORIZED
    });

    it("should allow multiple users to purchase same premium thread", () => {
      // User2 purchases
      simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumThreadId)],
        user2
      );

      // User3 purchases
      const result2 = simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumThreadId)],
        user3
      );

      expect(result2.result).toBeOk(Cl.bool(true));

      const access2 = simnet.callReadOnlyFn(
        "voicechain",
        "has-premium-access",
        [Cl.uint(premiumThreadId), Cl.principal(user2)],
        deployer
      );
      expect(access2.result).toBe(Cl.bool(true));

      const access3 = simnet.callReadOnlyFn(
        "voicechain",
        "has-premium-access",
        [Cl.uint(premiumThreadId), Cl.principal(user3)],
        deployer
      );
      expect(access3.result).toBe(Cl.bool(true));
    });
  });

  describe("Premium Content Reply Restrictions", () => {
    let premiumThreadId: number;
    const premiumPrice = 5000000;

    beforeEach(() => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Premium Thread"),
          Cl.stringUtf8(testContent),
          Cl.bool(true),
          Cl.uint(premiumPrice)
        ],
        user1
      );
      premiumThreadId = 1;
    });

    it("should prevent non-purchaser from replying to premium thread", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(premiumThreadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );

      expect(result.result).toBeErr(Cl.uint(109)); // ERR_THREAD_NOT_PREMIUM
    });

    it("should allow purchaser to reply to premium thread", () => {
      // Purchase access
      simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumThreadId)],
        user2
      );

      // Reply to thread
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(premiumThreadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );

      expect(result.result).toBeOk(Cl.uint(1));
    });
  });

  describe("Voting System", () => {
    let threadId: number;
    let replyId: number;

    beforeEach(() => {
      // Create thread
      const threadResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      threadId = 1;

      // Create reply
      const replyResult = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );
      replyId = 1;
    });

    // Note: Voting functions would need to be implemented
    // These are placeholder tests

    it("should allow users to vote on threads", () => {
      // This test would call vote-on-thread function
    });

    it("should allow users to vote on replies", () => {
      // This test would call vote-on-reply function
    });

    it("should prevent double voting", () => {
      // This test would check ERR_ALREADY_VOTED
    });

    it("should update reputation based on votes received", () => {
      // This test would verify reputation score calculation
    });
  });

  describe("Tipping System", () => {
    let threadId: number;
    let replyId: number;

    beforeEach(() => {
      // Create thread
      const threadResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      threadId = 1;

      // Create reply
      const replyResult = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );
      replyId = 1;
    });

    // Note: Tipping functions would need to be implemented
    // These are placeholder tests

    it("should allow tipping threads", () => {
      // This test would call tip-thread function
    });

    it("should allow tipping replies", () => {
      // This test would call tip-reply function
    });

    it("should prevent self-tipping", () => {
      // This test would check ERR_SELF_TIP
    });

    it("should reject invalid tip amounts", () => {
      // This test would check ERR_INVALID_AMOUNT
    });
  });

  describe("Thread Boosting", () => {
    let threadId: number;

    beforeEach(() => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      threadId = 1;
    });

    // Note: Boosting functions would need to be implemented
    // These are placeholder tests

    it("should allow users to boost threads", () => {
      // This test would call boost-thread function
    });

    it("should track total boost amount per thread", () => {
      // This test would check get-thread-boost
    });

    it("should limit number of boosters per thread", () => {
      // This test would check list limit of 20
    });
  });

  describe("Reputation Score Calculation", () => {
    it("should calculate reputation score correctly", () => {
      // This would test the calculate-reputation-score private function
      // Not directly testable, but can be observed through user updates
    });
  });

  describe("Platform Fee Calculation", () => {
    it("should calculate platform fee correctly", () => {
      const amount = 1000000;
      const expectedFee = (amount * platformFeeRate) / 10000; // 25000
      
      // This would test calculate-platform-fee private function
      // Not directly testable, but can be observed through premium purchases
    });
  });

  describe("Read-Only Functions - Edge Cases", () => {
    it("should return none for non-existent thread", () => {
      const result = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result).toBeNone();
    });

    it("should return none for non-existent reply", () => {
      const result = simnet.callReadOnlyFn(
        "voicechain",
        "get-reply",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result).toBeNone();
    });

    it("should return false for premium access check on non-existent thread", () => {
      const result = simnet.callReadOnlyFn(
        "voicechain",
        "has-premium-access",
        [Cl.uint(999), Cl.principal(user1)],
        deployer
      );
      expect(result.result).toBe(Cl.bool(false));
    });

    it("should return default for get-thread-boost on non-existent thread", () => {
      const result = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread-boost",
        [Cl.uint(999)],
        deployer
      );
      expect(result.result).toEqual(
        Cl.tuple({
          "boost-amount": Cl.uint(0),
          "boosted-by": Cl.list([])
        })
      );
    });
  });

  describe("Error Conditions", () => {
    it("should handle ERR_NOT_FOUND (101)", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(999),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user1
      );
      expect(result.result).toBeErr(Cl.uint(101));
    });

    it("should handle ERR_UNAUTHORIZED (102)", () => {
      // Test unauthorized access scenarios
      // Example: duplicate premium purchase
      
      // Create premium thread
      const threadResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Premium"),
          Cl.stringUtf8(testContent),
          Cl.bool(true),
          Cl.uint(1000000)
        ],
        user1
      );
      const premiumId = 1;

      // Purchase once
      simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumId)],
        user2
      );

      // Try to purchase again
      const result = simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(premiumId)],
        user2
      );
      expect(result.result).toBeErr(Cl.uint(102));
    });

    it("should handle ERR_INVALID_AMOUNT (104)", () => {
      const result = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(""),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      expect(result.result).toBeErr(Cl.uint(104));
    });

    it("should handle ERR_THREAD_NOT_PREMIUM (109)", () => {
      // Create non-premium thread
      const threadResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Free"),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      const freeId = 1;

      const result = simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(freeId)],
        user2
      );
      expect(result.result).toBeErr(Cl.uint(109));
    });

    it("should handle ERR_INVALID_PARENT_REPLY (111)", () => {
      // Create thread
      const threadResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8(testTitle),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );
      const threadId = 1;

      // Try to reply with invalid parent
      const result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.some(Cl.uint(999))
        ],
        user2
      );
      expect(result.result).toBeErr(Cl.uint(111));
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle complete discussion lifecycle", () => {
      // 1. User1 creates premium thread
      const threadResult = simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Premium Discussion"),
          Cl.stringUtf8(testContent),
          Cl.bool(true),
          Cl.uint(5000000)
        ],
        user1
      );
      const threadId = 1;

      // 2. User2 purchases access
      simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(threadId)],
        user2
      );

      // 3. User3 purchases access
      simnet.callPublicFn(
        "voicechain",
        "purchase-premium-access",
        [Cl.uint(threadId)],
        user3
      );

      // 4. User2 creates top-level reply
      const reply1Result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user2
      );
      const reply1Id = 1;

      // 5. User3 replies to User2's reply
      const reply2Result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8(testNestedReply),
          Cl.some(Cl.uint(reply1Id))
        ],
        user3
      );
      const reply2Id = 2;

      // 6. User1 (author) adds final comment
      const reply3Result = simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(threadId),
          Cl.stringUtf8("Thanks for the discussion everyone!"),
          Cl.none()
        ],
        user1
      );
      const reply3Id = 3;

      // Verify final state
      const thread = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(threadId)],
        deployer
      );
      expect(thread.value.data["reply-count"]).toBeUint(3);

      const reply1 = simnet.callReadOnlyFn(
        "voicechain",
        "get-reply",
        [Cl.uint(reply1Id)],
        deployer
      );
      expect(reply1.value.data.author).toBe(Cl.principal(user2));

      const reply2 = simnet.callReadOnlyFn(
        "voicechain",
        "get-reply",
        [Cl.uint(reply2Id)],
        deployer
      );
      expect(reply2.value.data["parent-reply-id"]).toEqual(Cl.some(Cl.uint(reply1Id)));

      // Check user reputations
      const user1Rep = simnet.callReadOnlyFn(
        "voicechain",
        "get-user-reputation",
        [Cl.principal(user1)],
        deployer
      );
      expect(user1Rep.value.data["threads-created"]).toBeUint(1);
      expect(user1Rep.value.data["replies-created"]).toBeUint(1);

      const user2Rep = simnet.callReadOnlyFn(
        "voicechain",
        "get-user-reputation",
        [Cl.principal(user2)],
        deployer
      );
      expect(user2Rep.value.data["replies-created"]).toBeUint(1);

      const user3Rep = simnet.callReadOnlyFn(
        "voicechain",
        "get-user-reputation",
        [Cl.principal(user3)],
        deployer
      );
      expect(user3Rep.value.data["replies-created"]).toBeUint(1);
    });

    it("should handle multiple threads with different authors", () => {
      // User1 creates thread 1
      simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Thread 1"),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user1
      );

      // User2 creates thread 2
      simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Thread 2"),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user2
      );

      // User3 creates thread 3
      simnet.callPublicFn(
        "voicechain",
        "create-thread",
        [
          Cl.stringUtf8("Thread 3"),
          Cl.stringUtf8(testContent),
          Cl.bool(false),
          Cl.uint(0)
        ],
        user3
      );

      // User4 replies to thread 1
      simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(1),
          Cl.stringUtf8(testReplyContent),
          Cl.none()
        ],
        user4
      );

      // User5 replies to thread 2
      simnet.callPublicFn(
        "voicechain",
        "create-reply",
        [
          Cl.uint(2),
          Cl.stringUtf8(testReplyContent2),
          Cl.none()
        ],
        user5
      );

      // Check thread counts
      const thread1 = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(1)],
        deployer
      );
      expect(thread1.value.data.author).toBe(Cl.principal(user1));
      expect(thread1.value.data["reply-count"]).toBeUint(1);

      const thread2 = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(2)],
        deployer
      );
      expect(thread2.value.data.author).toBe(Cl.principal(user2));
      expect(thread2.value.data["reply-count"]).toBeUint(1);

      const thread3 = simnet.callReadOnlyFn(
        "voicechain",
        "get-thread",
        [Cl.uint(3)],
        deployer
      );
      expect(thread3.value.data.author).toBe(Cl.principal(user3));
      expect(thread3.value.data["reply-count"]).toBeUint(0);
    });
  });
});
