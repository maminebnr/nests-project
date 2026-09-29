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
    @Get('all')
  findAll() {
    return this.loanService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string): Loan {
    return this.loanService.findOne(+id);
  }

}