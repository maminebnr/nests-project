import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
  } from '@nestjs/common';
  
  import { PaymentService } from './payment.service';
  import { CreatePaymentDto } from './dto/create-payment.dto';
  import { UpdatePaymentDto } from './dto/update-payment.dto';
  
  @Controller('payments')
  export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}
  
    @Post()
    create(@Body() createPaymentDto: CreatePaymentDto) {
      return this.paymentService.create(createPaymentDto);
    }
  
    @Get()
    findAll() {
      return this.paymentService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.paymentService.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updatePaymentDto: UpdatePaymentDto,
    ) {
      return this.paymentService.update(id, updatePaymentDto);
    }
  
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      this.paymentService.remove(id);
    }
  }
  