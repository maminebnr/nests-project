import { Injectable } from '@nestjs/common';
import { BorrowVerifier } from '../review.constants';

/**
 * Default verifier: nobody is verified yet, because the project has no loan
 * module. Provide your own class under BORROW_VERIFIER in ReviewModule.
 */
@Injectable()
export class NoopBorrowVerifier implements BorrowVerifier {
  hasBorrowed(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
