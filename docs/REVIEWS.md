# Review module

A full-featured, moderated review system for books. Lives in `src/review/`, depends only on `BookModule`.

## Feature overview

| Area | What you get |
|---|---|
| **Writing** | 1-5 star rating, title, long-form content, pros / cons lists, tags, spoiler flag, "would recommend", reading format (paper/ebook/audio), language. One active review per user per book. |
| **Quality & safety** | Automatic screening: profanity (incl. leetspeak), links, emails / phone numbers, shouting, repeated characters, low-diversity spam. Suspicious reviews go to a **pending** queue; exact copy-paste duplicates are refused. |
| **Editing** | Authors can edit; each edit is snapshotted (last 10), moderation re-runs, blocked reviews return to pending. Soft delete with admin restore. |
| **Community** | Helpful / not-helpful votes (changeable, no self-votes) ranked with the **Wilson score**. Report a review (6 reasons); auto-hidden after 3 distinct reports. |
| **Staff tools** | Moderation queue (most reported first), approve / reject / hide with notes, dismiss reports, official **librarian reply**, pin up to 3 **featured** reviews per book. |
| **Discovery** | Filter by rating / range, verified borrower, recommended, spoilers, format, language, tag, reply; keyword search; sort by helpful, newest, oldest, highest, lowest, controversial. Featured always on top. |
| **Analytics** | Per-book stats: average, **Bayesian weighted rating**, star distribution, recommend %, verified count, top tags / pros / cons, 30-day trend, most-helpful / favourable / critical highlight reviews. Global **leaderboard**. |
| **Book sync** | `Book.ratingAverage`, `ratingCount`, `weightedRating` are kept up to date automatically. |
| **Verified borrower** | Pluggable `BORROW_VERIFIER` provider - wire it to your future loans module. |
| **Abuse control** | Write throttle: 10 create/edit actions per user per 10 minutes (HTTP 429). |

## Endpoints

Identity is sent with headers `x-user-id`, `x-user-name`, `x-user-role` (`member` \| `librarian` \| `admin`). See **Auth** below.

| Method & path | Who | Purpose |
|---|---|---|
| `POST /book/:bookId/reviews` | member | Create a review |
| `GET /book/:bookId/reviews` | public | List (filters, search, sort, pagination) |
| `GET /book/:bookId/reviews/stats` | public | Rating summary + highlights |
| `GET /reviews/leaderboard` | public | Top-rated books (`limit`, `minReviews`) |
| `GET /reviews/me` | member | My reviews, any status |
| `GET /reviews/:id` | public* | One review (*non-approved: author/staff only) |
| `PATCH /reviews/:id` | author | Edit |
| `DELETE /reviews/:id` | author / staff | Soft delete |
| `PUT /reviews/:id/vote` | member | `{ "value": "helpful" \| "not_helpful" }` |
| `DELETE /reviews/:id/vote` | member | Retract vote |
| `POST /reviews/:id/report` | member | `{ "reason": "spam", "details": "..." }` |
| `PUT` / `DELETE /reviews/:id/reply` | staff | Official reply |
| `PUT` / `DELETE /reviews/:id/feature` | staff | Pin / unpin |
| `GET /admin/reviews/queue` | staff | Moderation queue (`status`, pagination) |
| `POST /admin/reviews/:id/moderate` | staff | `{ "action": "approve" \| "reject" \| "hide", "note": "..." }` |
| `POST /admin/reviews/:id/dismiss-reports` | staff | Clear reports, un-hide auto-hidden |
| `POST /admin/reviews/:id/restore` | admin | Restore soft-deleted review |

Interactive docs: `http://localhost:3000/api` (Swagger).

### Example

```bash
curl -X POST localhost:3000/book/1/reviews \
  -H 'content-type: application/json' -H 'x-user-id: alice' -H 'x-user-name: Alice' \
  -d '{"rating":5,"title":"Brilliant read","content":"Could not put it down, the ending lands perfectly.","pros":["pacing"],"tags":["sci-fi"]}'

curl 'localhost:3000/book/1/reviews?sort=helpful&minRating=4&excludeSpoilers=true&q=pacing'
curl localhost:3000/book/1/reviews/stats
```

## Review lifecycle

```
create -> [screening] -> approved (public)  -> reports >= 3 -> hidden -> staff: dismiss (approved) / reject
                      -> pending (staff queue) -> approve / reject
edit   -> screening again; rejected/hidden reviews go back to pending
delete -> soft delete (admin can restore)
```

## Scoring formulas

- **Weighted rating** (Bayesian): `(C * m + sum) / (C + n)` with `C = 5`, `m` = global mean of all approved reviews (3.5 when none). Prevents one 5-star review from topping the chart.
- **Helpful score**: lower bound of the 95% Wilson interval of helpful vs not-helpful votes.

All tunables (thresholds, limits, `C`) are in `src/review/review.constants.ts`.

## Auth (important)

The project had no authentication, so `src/common/auth/identity.guard.ts` reads identity from headers. It is a global guard with `@Public()` and `@Roles()` decorators. **Before production, replace `IdentityGuard.resolveUser` with real JWT/session validation** - nothing else changes.

## Plugging in a real database

All data access is in `ReviewRepository` (same in-memory style as `BookService`). Re-implement its methods with TypeORM / Prisma / Mongoose; services and controllers stay untouched.

## Plugging in loans (verified borrowers)

```ts
@Injectable()
class LoanBorrowVerifier implements BorrowVerifier {
  constructor(private loans: LoanService) {}
  hasBorrowed(userId: string, bookId: number) { return this.loans.hasReturned(userId, bookId); }
}
// review.module.ts -> { provide: BORROW_VERIFIER, useClass: LoanBorrowVerifier }
```

## Changes made to existing code

- `Book` entity: + `ratingAverage`, `ratingCount`, `weightedRating`.
- `BookService`: real `create/findOne/update/remove` (were placeholder strings), soft delete, `setRatingSummary`; `BookModule` now **exports** `BookService`.
- `BookController`: `ParseIntPipe`, roles (create/update: staff, delete: admin), reads are `@Public()`.
- `CreateBookDto` / `UpdateBookDto`: validated fields (were empty).
- Global `ValidationPipe` (`src/app.setup.ts`) and global `IdentityGuard` in `AppModule`.
- New deps: `class-validator`, `class-transformer`.
- `@nestjs/mapped-types`' `PartialType` swapped for `@nestjs/swagger`'s so Swagger sees DTO fields.

## Tests

`npm test` (unit) and `npm run test:e2e`. Note: Nest 12 is ESM-only; Jest needs **Node >= 24.9** (this was already true for the original project's tests).
