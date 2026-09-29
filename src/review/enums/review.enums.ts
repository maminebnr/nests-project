export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
}

export enum ReadingFormat {
  PAPER = 'paper',
  EBOOK = 'ebook',
  AUDIO = 'audio',
}

export enum VoteValue {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
}

export enum ReportReason {
  SPAM = 'spam',
  OFFENSIVE = 'offensive',
  SPOILER = 'spoiler',
  OFF_TOPIC = 'off_topic',
  FAKE = 'fake',
  OTHER = 'other',
}

export enum ModerationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  HIDE = 'hide',
}

export enum ReviewSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  HELPFUL = 'helpful',
  HIGHEST = 'highest',
  LOWEST = 'lowest',
  CONTROVERSIAL = 'controversial',
}
