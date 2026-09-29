import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { REVIEW_CONFIG } from './review.constants';

export interface ModerationResult {
  flags: string[];
  score: number;
  needsReview: boolean;
}

/** Extend freely - matching is done on normalised (de-leeted) whole words. */
const PROFANITY = new Set([
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'slut', 'whore', 'nigger', 'faggot',
]);

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|ly|xyz|ru|cn|info|biz)\b/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
// Phone-like groups separated by spaces/dashes (not decimals such as 4.75 or ISBN-13 starting 978/979).
const PHONE_RE = /(?<![\d.])(?!97[89][\s-])(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{2,4}[\s-]\d{2,4}(?:[\s-]\d{2,4})?(?![\d.])/;

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

@Injectable()
export class ReviewModerationService {
  /** Heuristic, dependency-free content screening. */
  analyse(...texts: Array<string | undefined>): ModerationResult {
    const text = texts.filter(Boolean).join(' \n ');
    const flags: string[] = [];
    let score = 0;
    const add = (flag: string, weight: number) => {
      flags.push(flag);
      score += weight;
    };

    const normalised = text
      .toLowerCase()
      .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
      .replace(/[^a-z\s]/g, ' ');
    if (normalised.split(/\s+/).some((w) => PROFANITY.has(w))) add('profanity', 2);

    if (URL_RE.test(text)) add('contains_link', 2);
    if (EMAIL_RE.test(text) || PHONE_RE.test(text)) add('contains_contact_info', 2);

    const letters = text.replace(/[^\p{L}]/gu, '');
    const upper = text.replace(/[^\p{Lu}]/gu, '');
    if (letters.length > 25 && upper.length / letters.length > 0.7) add('excessive_caps', 1);

    if (/(.)\1{6,}/u.test(text)) add('repeated_characters', 1);

    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length >= 12 && new Set(words).size / words.length < 0.35) add('low_quality', 1);

    return { flags, score, needsReview: score >= REVIEW_CONFIG.pendingScoreThreshold };
  }

  /** Stable fingerprint used to reject copy-pasted duplicate reviews. */
  fingerprint(content: string): string {
    const normalised = content.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return createHash('sha1').update(normalised).digest('hex');
  }
}
