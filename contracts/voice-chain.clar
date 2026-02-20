;; VoiceChain Protocol
;;
;; Title: VoiceChain - The Future of Decentralized Social Discourse
;;
;; Summary: A next-generation social protocol that transforms how communities 
;; engage, create, and monetize content through blockchain-native incentive 
;; structures and democratic governance mechanisms.
;;
;; Description: VoiceChain reimagines social interaction by leveraging Bitcoin's 
;; security foundation to create an economic layer for authentic discourse. 
;; The protocol introduces novel mechanisms including reputation-weighted voting, 
;; creator monetization through premium content gates, peer-to-peer value 
;; streaming via tips, and community-driven content curation. By requiring 
;; economic stake for participation, VoiceChain eliminates spam while ensuring 
;; quality discussions flourish through aligned incentives between creators, 
;; curators, and consumers of content.
;;
;; Innovation Highlights:
;; - Economic Participation Model: Stake-based entry barriers ensure serious engagement
;; - Creator Economy Engine: Direct monetization paths for premium discussions
;; - Reputation-Driven Governance: Community standing influences content visibility  
;; - Hierarchical Discussion Trees: Structured conversations with nested replies
;; - Value Distribution Layer: Transparent tip economy for quality content rewards

;; ERROR CONSTANTS

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_OWNER_ONLY (err u100))
(define-constant ERR_NOT_FOUND (err u101))
(define-constant ERR_UNAUTHORIZED (err u102))
(define-constant ERR_INSUFFICIENT_BALANCE (err u103))
(define-constant ERR_INVALID_AMOUNT (err u104))
(define-constant ERR_THREAD_LOCKED (err u105))
(define-constant ERR_ALREADY_VOTED (err u106))
(define-constant ERR_INVALID_TIP (err u107))
(define-constant ERR_SELF_TIP (err u108))
(define-constant ERR_THREAD_NOT_PREMIUM (err u109))
(define-constant ERR_INSUFFICIENT_STAKE (err u110))
(define-constant ERR_INVALID_PARENT_REPLY (err u111))
(define-constant ERR_ALREADY_FLAGGED (err u112))
(define-constant ERR_FLAG_THRESHOLD_REACHED (err u113))

;; PROTOCOL CONFIGURATION

(define-data-var thread-counter uint u0)
(define-data-var reply-counter uint u0)
(define-data-var min-stake-amount uint u1000000) ;; 1 STX minimum stake
(define-data-var platform-fee-rate uint u250) ;; 2.5% platform fee
(define-data-var platform-treasury principal CONTRACT_OWNER)
(define-data-var flag-threshold uint u5) ;; Number of flags before auto-hide
(define-data-var moderation-committee (list 5 principal) (list))

;; CORE DATA STRUCTURES

;; Thread Registry - Premium Content Management System
(define-map threads
  { thread-id: uint }
  {
    author: principal,
    title: (string-utf8 256),
    content: (string-utf8 2048),
    is-premium: bool,
    premium-price: uint,
    created-at: uint,
    upvotes: uint,
    downvotes: uint,
    tips-received: uint,
    is-locked: bool,
    reply-count: uint,
    hidden: bool, ;; Added for moderation
  }
)

;; Reply System - Hierarchical Discussion Architecture
(define-map replies
  { reply-id: uint }
  {
    thread-id: uint,
    author: principal,
    content: (string-utf8 1024),
    created-at: uint,
    upvotes: uint,
    downvotes: uint,
    tips-received: uint,
    parent-reply-id: (optional uint),
    hidden: bool, ;; Added for moderation
  }
)

;; Reputation Engine - Community Standing Metrics
(define-map user-reputation
  { user: principal }
  {
    total-upvotes: uint,
    total-downvotes: uint,
    threads-created: uint,
    replies-created: uint,
    tips-sent: uint,
    tips-received: uint,
    staked-amount: uint,
    reputation-score: uint,
  }
)

;; Voting System - Democratic Content Curation Engine
(define-map thread-votes
  {
    thread-id: uint,
    voter: principal,
  }
  { vote-type: bool }
)

(define-map reply-votes
  {
    reply-id: uint,
    voter: principal,
  }
  { vote-type: bool }
)

;; Premium Access Control - Monetization Gateway
(define-map premium-access
  {
    thread-id: uint,
    user: principal,
  }
  { purchased-at: uint }
)

;; Staking Mechanism - Economic Participation Requirement
(define-map user-stakes
  { user: principal }
  {
    amount: uint,
    locked-until: uint,
  }
)

;; Content Amplification - Community-Driven Promotion System
(define-map thread-boosts
  { thread-id: uint }
  {
    boost-amount: uint,
    boosted-by: (list 20 principal),
  }
)

;; Content Flagging System - Community Moderation
(define-map thread-flags
  {
    thread-id: uint,
    flagger: principal,
  }
  {
    reason: (string-utf8 256),
    flagged-at: uint,
  }
)

(define-map reply-flags
  {
    reply-id: uint,
    flagger: principal,
  }
  {
    reason: (string-utf8 256),
    flagged-at: uint,
  }
)

(define-map hidden-content
  { content-id: uint, content-type: (string-ascii 10) } ;; "thread" or "reply"
  {
    hidden-at: uint,
    hidden-by: principal,
    flag-count: uint,
  }
)

;; NFT MILESTONE SYSTEM

(define-non-fungible-token thread-milestone uint)

;; UTILITY FUNCTIONS

(define-private (get-current-time)
  stacks-block-height
)

(define-private (calculate-reputation-score
    (upvotes uint)
    (downvotes uint)
    (thread-count uint)
    (reply-count uint)
  )
  (let ((base-score (+ (* upvotes u10) (* thread-count u5) (* reply-count u2))))
    (if (> downvotes u0)
      (/ (* base-score u100) (+ u100 (* downvotes u5)))
      base-score
    )
  )
)

(define-private (calculate-platform-fee (amount uint))
  (/ (* amount (var-get platform-fee-rate)) u10000)
)

(define-private (is-user-staked (user principal))
  (let ((stake-info (map-get? user-stakes { user: user })))
    (match stake-info
      stake (and
        (>= (get amount stake) (var-get min-stake-amount))
        (>= (get-current-time) (get locked-until stake))
      )
      false
    )
  )
)

(define-private (is-valid-parent-reply
    (parent-reply-id uint)
    (thread-id uint)
  )
  (match (map-get? replies { reply-id: parent-reply-id })
    reply-info (is-eq (get thread-id reply-info) thread-id)
    false
  )
)

(define-private (is-valid-reply-id (reply-id uint))
  (is-some (map-get? replies { reply-id: reply-id }))
)

(define-private (is-in-moderation-committee (user principal))
  (let ((committee (var-get moderation-committee)))
    (fold check-committee-member committee false)
  )
)

(define-private (check-committee-member (member principal) (found bool))
  (or found (is-eq member tx-sender))
)

(define-private (count-thread-flags (thread-id uint) (count uint))
  ;; This would need to iterate through all flags
  ;; Simplified version - in practice would need a counter
  u0
)

;; READ-ONLY INTERFACE

(define-read-only (get-thread (thread-id uint))
  (map-get? threads { thread-id: thread-id })
)

(define-read-only (get-reply (reply-id uint))
  (map-get? replies { reply-id: reply-id })
)

(define-read-only (get-user-reputation (user principal))
  (default-to {
    total-upvotes: u0,
    total-downvotes: u0,
    threads-created: u0,
    replies-created: u0,
    tips-sent: u0,
    tips-received: u0,
    staked-amount: u0,
    reputation-score: u0,
  }
    (map-get? user-reputation { user: user })
  )
)

(define-read-only (get-thread-count)
  (var-get thread-counter)
)

(define-read-only (get-reply-count)
  (var-get reply-counter)
)

(define-read-only (has-premium-access
    (thread-id uint)
    (user principal)
  )
  (let ((thread-info (get-thread thread-id)))
    (match thread-info
      thread (if (get is-premium thread)
        (is-some (map-get? premium-access {
          thread-id: thread-id,
          user: user,
        }))
        true
      )
      false
    )
  )
)

(define-read-only (get-user-vote-on-thread
    (thread-id uint)
    (user principal)
  )
  (map-get? thread-votes {
    thread-id: thread-id,
    voter: user,
  })
)

(define-read-only (get-user-vote-on-reply
    (reply-id uint)
    (user principal)
  )
  (map-get? reply-votes {
    reply-id: reply-id,
    voter: user,
  })
)

(define-read-only (get-thread-boost (thread-id uint))
  (default-to {
    boost-amount: u0,
    boosted-by: (list),
  }
    (map-get? thread-boosts { thread-id: thread-id })
  )
)

(define-read-only (get-thread-flag-count (thread-id uint))
  (let ((flags (filter has-thread-flag? (list thread-id))))
    (len flags)
  )
)

(define-read-only (is-thread-hidden (thread-id uint))
  (is-some (map-get? hidden-content {
    content-id: thread-id,
    content-type: "thread"
  }))
)

(define-read-only (is-reply-hidden (reply-id uint))
  (is-some (map-get? hidden-content {
    content-id: reply-id,
    content-type: "reply"
  }))
)

;; CORE PROTOCOL FUNCTIONS

;; Thread Creation - Initialize New Discussion Topic
(define-public (create-thread
    (title (string-utf8 256))
    (content (string-utf8 2048))
    (is-premium bool)
    (premium-price uint)
  )
  (let (
      (thread-id (+ (var-get thread-counter) u1))
      (current-time (get-current-time))
    )
    ;; Validation checks
    (asserts! (is-user-staked tx-sender) ERR_INSUFFICIENT_STAKE)
    (asserts! (> (len title) u0) ERR_INVALID_AMOUNT)
    (asserts! (> (len content) u0) ERR_INVALID_AMOUNT)
    (asserts! (or (not is-premium) (> premium-price u0)) ERR_INVALID_AMOUNT)
    
    ;; Create thread entry
    (map-set threads { thread-id: thread-id } {
      author: tx-sender,
      title: title,
      content: content,
      is-premium: is-premium,
      premium-price: premium-price,
      created-at: current-time,
      upvotes: u0,
      downvotes: u0,
      tips-received: u0,
      is-locked: false,
      reply-count: u0,
      hidden: false,
    })
    
    ;; Update creator reputation metrics
    (let ((current-rep (get-user-reputation tx-sender)))
      (map-set user-reputation { user: tx-sender }
        (merge current-rep {
          threads-created: (+ (get threads-created current-rep) u1),
          reputation-score: (calculate-reputation-score 
            (get total-upvotes current-rep)
            (get total-downvotes current-rep)
            (+ (get threads-created current-rep) u1)
            (get replies-created current-rep)
          ),
        })
      )
    )
    
    (var-set thread-counter thread-id)
    (ok thread-id)
  )
)

;; Reply Creation - Contribute to Discussion Thread
(define-public (create-reply
    (thread-id uint)
    (content (string-utf8 1024))
    (parent-reply-id (optional uint))
  )
  (let (
      (reply-id (+ (var-get reply-counter) u1))
      (current-time (get-current-time))
      (thread-info (unwrap! (get-thread thread-id) ERR_NOT_FOUND))
    )
    ;; Core validation
    (asserts! (is-user-staked tx-sender) ERR_INSUFFICIENT_STAKE)
    (asserts! (not (get is-locked thread-info)) ERR_THREAD_LOCKED)
    (asserts! (not (get hidden thread-info)) ERR_UNAUTHORIZED) ;; Can't reply to hidden thread
    (asserts! (> (len content) u0) ERR_INVALID_AMOUNT)
    
    ;; Validate parent reply relationship
    (let ((validated-parent-reply-id (match parent-reply-id
        parent-id (begin
          (asserts! (is-valid-parent-reply parent-id thread-id)
            ERR_INVALID_PARENT_REPLY
          )
          ;; Check if parent reply is hidden
          (match (map-get? replies { reply-id: parent-id })
            parent-reply (asserts! (not (get hidden parent-reply)) ERR_UNAUTHORIZED)
            true
          )
          (some parent-id)
        )
        none
      )))
      
      ;; Premium access gate
      (if (get is-premium thread-info)
        (asserts! (has-premium-access thread-id tx-sender) ERR_THREAD_NOT_PREMIUM)
        true
      )
      
      ;; Create reply entry
      (map-set replies { reply-id: reply-id } {
        thread-id: thread-id,
        author: tx-sender,
        content: content,
        created-at: current-time,
        upvotes: u0,
        downvotes: u0,
        tips-received: u0,
        parent-reply-id: validated-parent-reply-id,
        hidden: false,
      })
      
      ;; Update thread reply counter
      (map-set threads { thread-id: thread-id }
        (merge thread-info { reply-count: (+ (get reply-count thread-info) u1) })
      )
      
      ;; Update user reputation
      (let ((current-rep (get-user-reputation tx-sender)))
        (map-set user-reputation { user: tx-sender }
          (merge current-rep {
            replies-created: (+ (get replies-created current-rep) u1),
            reputation-score: (calculate-reputation-score 
              (get total-upvotes current-rep)
              (get total-downvotes current-rep)
              (get threads-created current-rep)
              (+ (get replies-created current-rep) u1)
            ),
          })
        )
      )
      
      (var-set reply-counter reply-id)
      (ok reply-id)
    )
  )
)

;; Premium Access Purchase - Unlock Exclusive Content
(define-public (purchase-premium-access (thread-id uint))
  (let (
      (thread-info (unwrap! (get-thread thread-id) ERR_NOT_FOUND))
      (current-time (get-current-time))
    )
    ;; Validation checks
    (asserts! (get is-premium thread-info) ERR_THREAD_NOT_PREMIUM)
    (asserts!
      (is-none (map-get? premium-access {
        thread-id: thread-id,
        user: tx-sender,
      }))
      ERR_UNAUTHORIZED
    )
    
    (let (
        (price (get premium-price thread-info))
        (author (get author thread-info))
        (platform-fee (calculate-platform-fee price))
        (author-payment (- price platform-fee))
      )
      ;; Execute STX transfers
      (try! (stx-transfer? author-payment tx-sender author))
      (try! (stx-transfer? platform-fee tx-sender (var-get platform-treasury)))
      
      ;; Grant premium access
      (map-set premium-access {
        thread-id: thread-id,
        user: tx-sender,
      } { purchased-at: current-time }
      )
      
      (ok true)
    )
  )
)

;; Flag Content - Community Moderation
(define-public (flag-thread
    (thread-id uint)
    (reason (string-utf8 256))
  )
  (let (
      (thread-info (unwrap! (get-thread thread-id) ERR_NOT_FOUND))
      (flagger-rep (get-user-reputation tx-sender))
      (flag-key { thread-id: thread-id, flagger: tx-sender })
    )
    ;; Validation
    (asserts! (not (is-eq tx-sender (get author thread-info))) ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? thread-flags flag-key)) ERR_ALREADY_FLAGGED)
    (asserts! (> (len reason) u0) ERR_INVALID_AMOUNT)
    
    ;; Record the flag
    (map-set thread-flags flag-key {
      reason: reason,
      flagged-at: (get-current-time),
    })
    
    ;; Count total flags for this thread (simplified - in production would need counter)
    (let (
        (total-flags (len (filter has-thread-flag? (list thread-id))))
      )
      ;; Auto-hide if threshold reached
      (if (>= total-flags (var-get flag-threshold))
        (begin
          (map-set hidden-content {
            content-id: thread-id,
            content-type: "thread"
          } {
            hidden-at: (get-current-time),
            hidden-by: tx-sender,
            flag-count: total-flags,
          })
          ;; Update thread hidden status
          (map-set threads { thread-id: thread-id }
            (merge thread-info { hidden: true })
          )
          (ok true)
        )
        (ok true)
      )
    )
  )
)

(define-public (flag-reply
    (reply-id uint)
    (reason (string-utf8 256))
  )
  (let (
      (reply-info (unwrap! (get-reply reply-id) ERR_NOT_FOUND))
      (thread-info (unwrap! (get-thread (get thread-id reply-info)) ERR_NOT_FOUND))
      (flag-key { reply-id: reply-id, flagger: tx-sender })
    )
    ;; Validation
    (asserts! (not (is-eq tx-sender (get author reply-info))) ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? reply-flags flag-key)) ERR_ALREADY_FLAGGED)
    (asserts! (> (len reason) u0) ERR_INVALID_AMOUNT)
    
    ;; Record the flag
    (map-set reply-flags flag-key {
      reason: reason,
      flagged-at: (get-current-time),
    })
    
    ;; Count total flags for this reply (simplified)
    (let (
        (total-flags (len (filter has-reply-flag? (list reply-id))))
      )
      ;; Auto-hide if threshold reached
      (if (>= total-flags (var-get flag-threshold))
        (begin
          (map-set hidden-content {
            content-id: reply-id,
            content-type: "reply"
          } {
            hidden-at: (get-current-time),
            hidden-by: tx-sender,
            flag-count: total-flags,
          })
          ;; Update reply hidden status
          (map-set replies { reply-id: reply-id }
            (merge reply-info { hidden: true })
          )
          (ok true)
        )
        (ok true)
      )
    )
  )
)

;; Admin Moderation Actions
(define-public (hide-thread (thread-id uint))
  (let (
      (thread-info (unwrap! (get-thread thread-id) ERR_NOT_FOUND))
    )
    (asserts! (is-in-moderation-committee tx-sender) ERR_UNAUTHORIZED)
    (map-set hidden-content {
      content-id: thread-id,
      content-type: "thread"
    } {
      hidden-at: (get-current-time),
      hidden-by: tx-sender,
      flag-count: u0,
    })
    ;; Update thread hidden status
    (map-set threads { thread-id: thread-id }
      (merge thread-info { hidden: true })
    )
    (ok true)
  )
)

(define-public (unhide-thread (thread-id uint))
  (let (
      (thread-info (unwrap! (get-thread thread-id) ERR_NOT_FOUND))
    )
    (asserts! (is-in-moderation-committee tx-sender) ERR_UNAUTHORIZED)
    (map-delete hidden-content {
      content-id: thread-id,
      content-type: "thread"
    })
    ;; Update thread hidden status
    (map-set threads { thread-id: thread-id }
      (merge thread-info { hidden: false })
    )
    (ok true)
  )
)

(define-public (hide-reply (reply-id uint))
  (let (
      (reply-info (unwrap! (get-reply reply-id) ERR_NOT_FOUND))
    )
    (asserts! (is-in-moderation-committee tx-sender) ERR_UNAUTHORIZED)
    (map-set hidden-content {
      content-id: reply-id,
      content-type: "reply"
    } {
      hidden-at: (get-current-time),
      hidden-by: tx-sender,
      flag-count: u0,
    })
    ;; Update reply hidden status
    (map-set replies { reply-id: reply-id }
      (merge reply-info { hidden: true })
    )
    (ok true)
  )
)

(define-public (unhide-reply (reply-id uint))
  (let (
      (reply-info (unwrap! (get-reply reply-id) ERR_NOT_FOUND))
    )
    (asserts! (is-in-moderation-committee tx-sender) ERR_UNAUTHORIZED)
    (map-delete hidden-content {
      content-id: reply-id,
      content-type: "reply"
    })
    ;; Update reply hidden status
    (map-set replies { reply-id: reply-id }
      (merge reply-info { hidden: false })
    )
    (ok true)
  )
)

;; Moderation Committee Management
(define-public (set-moderation-committee (members (list 5 principal)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set moderation-committee members)
    (ok true)
  )
)

(define-public (set-flag-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (asserts! (> new-threshold u0) ERR_INVALID_AMOUNT)
    (var-set flag-threshold new-threshold)
    (ok true)
  )
)
