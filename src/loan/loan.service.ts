import { Injectable } from '@nestjs/common';
import { Loan } from './loan';

@Injectable()
export class LoanService {

  createLoan(userid: number, bookid: number) {

    const loan = new Loan();

    loan.userid = userid;
    loan.bookid = bookid;
    loan.loandate = new Date();
    loan.returndate = null;
    loan.returned = false;

    return loan;
  }
  findAll(){
        return this.loans;
    }
    findOne(id: number): Loan {
       return this.loans.find(loan => loan.id === id);
    }

}