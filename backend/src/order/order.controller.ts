import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async getOrders() {
    const orders = await this.orderService.getAllOrders();
    return { success: true, data: orders };
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    const order = await this.orderService.getOrderById(id);
    return { success: true, data: order };
  }

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.orderService.createOrder(createOrderDto);
    return { success: true, data: order };
  }

  @Put(':id')
  async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    const order = await this.orderService.updateOrder(id, updateOrderDto);
    return { success: true, data: order };
  }

  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    await this.orderService.deleteOrder(id);
    return { success: true, message: 'Order deleted' };
  }
}
