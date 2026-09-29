import { Controller, Post, Body } from '@nestjs/common';
import { LoanService } from './loan.service';

@Controller('loans')
export class LoanController {

  constructor(private loanService: LoanService) {}

  @Post()
  createLoan(
    @Body('userid') userid: number,
    @Body('bookid') bookid: number,
  ) {
    return this.loanService.createLoan(userid, bookid);
  }
}